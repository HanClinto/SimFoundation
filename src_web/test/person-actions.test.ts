import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  automaticAction,
  cancelAutomaticAction,
} from "../src/simulation/person-actions";
import { submitAction } from "../src/simulation/action-queue";
import { advanceSimulation } from "../src/simulation/tick";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { editActionQueue } from "../src/simulation/action-queue";
import { createTestJobs } from "./fixtures/work-state";
import {
  advanceRoutines,
  setPersonnelSchedule,
} from "../src/simulation/routines";
import { orderSurfaceWork } from "../src/simulation/environment";
import { requestAssessment } from "../src/simulation/clinical";

const loaded = (state: ReturnType<typeof createInitialState>) =>
  loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} });

function eating(): ReturnType<typeof createInitialState> {
  const state = createInitialState();
  const actorId = state.personnel[0]!.id;
  const station = state.routines.stations.find(
    (entry) => entry.kind === "meal",
  )!;
  return {
    ...state,
    world: {
      ...state.world,
      positions: { ...state.world.positions, [actorId]: station.position },
    },
    personnel: state.personnel.map((person) =>
      person.id === actorId
        ? {
            ...person,
            activity: "Eating a meal",
            needs: { ...person.needs, satiety: 20 },
          }
        : person,
    ),
    routines: {
      ...state.routines,
      activities: {
        [actorId]: {
          kind: "meal" as const,
          source: "need" as const,
          stationId: station.id,
          progress: 10,
          startedTick: 0,
          mealConsumed: true,
        },
      },
    },
  };
}

it("waits behind an existing meal, then hands control to the manual queue without restarting autonomy", () => {
  let state = eating();
  const actorId = state.personnel[0]!.id;
  const automatic = automaticAction(state, actorId)!;
  expect(automatic).toMatchObject({ label: "Eat", source: "need" });
  state = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "move",
    destination: { x: 60, y: 59 },
  }).state;
  expect(state.actionQueues[actorId]!.current).toMatchObject({
    started: false,
    waitingFor: automatic.key,
  });
  expect(state.combat.responders[actorId]).toBeUndefined();
  state = advanceSimulation(state);
  expect(state.routines.activities[actorId]!.progress).toBe(11);
  expect(state.actionQueues[actorId]!.current.started).toBe(false);
  state = advanceSimulation(state);
  expect(state.routines.activities[actorId]).toBeUndefined();
  expect(state.actionQueues[actorId]!.current.started).toBe(true);
  expect(state.combat.responders[actorId]!.order).toBe("move");
});

it("Do Now and automatic cancellation use the existing safe interruption owner", () => {
  const state = eating();
  const actorId = state.personnel[0]!.id;
  const issued = submitAction(
    state,
    {
      mapId: state.world.map.id,
      actorId,
      action: "move",
      destination: { x: 60, y: 59 },
    },
    "now",
  );
  expect(issued.state.routines.activities[actorId]).toBeUndefined();
  expect(issued.state.objects).toEqual(state.objects);
  expect(issued.state.actionQueues[actorId]!.current.started).toBe(true);
  const cancelled = cancelAutomaticAction(
    state,
    state.world.map.id,
    actorId,
    automaticAction(state, actorId)!.key,
  );
  expect(cancelled.reason).toBeNull();
  expect(cancelled.state.routines.activities[actorId]).toBeUndefined();
  expect(cancelled.state.combat.responders[actorId]!.returnToAutonomy).toBe(
    true,
  );
  expect(
    cancelAutomaticAction(state, state.world.map.id, actorId, "stale").state,
  ).toBe(state);
});

it("finishes a real carried meal before handoff, with no refund, duplication or protected cancellation", () => {
  let state = createInitialState();
  const actorId = "person-lena-ortiz";
  state = {
    ...state,
    personnel: state.personnel.map((person) => ({
      ...person,
      stress: 0,
      needs: { rest: 100, satiety: person.id === actorId ? 20 : 100 },
    })),
  };
  for (
    let step = 0;
    step < 100 &&
    !state.objects.items.some(
      (item) =>
        item.location.kind === "carried" && item.location.personId === actorId,
    );
    step += 1
  )
    state = advanceSimulation(state);
  const automatic = automaticAction(state, actorId)!;
  expect(automatic).toMatchObject({ label: "Eat", source: "need" });
  expect(
    cancelAutomaticAction(state, state.world.map.id, actorId, automatic.key),
  ).toEqual({
    state,
    reason: "Finish the protected delivery or clinical appointment first.",
  });
  const consumed = state.routines.mealsConsumed;
  const stock = state.objects.items
    .filter((item) => item.kind === "meals")
    .reduce(
      (sum, item) =>
        sum + (item.location.kind === "consumed" ? 0 : item.quantity),
      0,
    );
  state = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "move",
    destination: { x: 60, y: 59 },
  }).state;
  const saved = loaded(state);
  expect(saved.status).toBe("loaded");
  if (saved.status !== "loaded") throw new Error("waiting meal save rejected");
  expect(advanceSimulation(saved.state)).toEqual(advanceSimulation(state));
  for (
    let step = 0;
    step < 100 && !state.actionQueues[actorId]!.current.started;
    step += 1
  )
    state = advanceSimulation(state);
  expect(state.actionQueues[actorId]!.current.started).toBe(true);
  expect(state.routines.activities[actorId]).toBeUndefined();
  expect(state.routines.mealsConsumed).toBe(consumed);
  expect(
    state.objects.items
      .filter((item) => item.kind === "meals")
      .reduce(
        (sum, item) =>
          sum + (item.location.kind === "consumed" ? 0 : item.quantity),
        0,
      ),
  ).toBe(stock - 1);
  expect(loaded(state).status).toBe("loaded");
});

it("lets scheduled job work finish before manual movement and releases interrupted work without discarding progress", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const job = {
    ...createTestJobs()[0]!,
    status: "in-progress" as const,
    progress: 62,
    assignedPersonId: actorId,
    authorizedTick: 0,
  };
  const state = {
    ...initial,
    jobs: [job],
    world: {
      ...initial.world,
      positions: { ...initial.world.positions, [actorId]: job.workSite },
    },
    personnel: initial.personnel.map((person) =>
      person.id === actorId
        ? { ...person, currentJobId: job.id, activity: job.title }
        : person,
    ),
  };
  expect(automaticAction(state, actorId)).toMatchObject({
    source: "job",
    label: "Work",
    detail: `${job.title} / ${job.title}`,
  });
  const intent = {
    mapId: state.world.map.id,
    actorId,
    action: "move" as const,
    destination: { x: 60, y: 59 },
  };
  let waiting = submitAction(state, intent).state;
  expect(waiting.jobs[0]).toEqual(job);
  for (
    let step = 0;
    step < 10 && !waiting.actionQueues[actorId]!.current.started;
    step += 1
  )
    waiting = advanceSimulation(waiting);
  expect(waiting.jobs[0]!.status).toBe("completed");
  expect(waiting.actionQueues[actorId]!.current.started).toBe(true);
  const immediate = submitAction(state, intent, "now").state;
  expect(immediate.jobs[0]).toMatchObject({
    status: "available",
    progress: 62,
    assignedPersonId: null,
  });
  expect(immediate.actionQueues[actorId]!.current.started).toBe(true);
});

it("cancels a waiting intention without preempting the automatic action for the next intention", () => {
  const state = eating();
  const actorId = state.personnel[0]!.id;
  const intent = {
    mapId: state.world.map.id,
    actorId,
    action: "hold" as const,
  };
  let next = submitAction(state, intent).state;
  next = submitAction(next, {
    ...intent,
    action: "move",
    destination: { x: 60, y: 59 },
  }).state;
  expect(next.actionQueues[actorId]!.pending).toHaveLength(1);
  next = editActionQueue(next, intent.mapId, actorId, "cancel").state;
  expect(next.actionQueues[actorId]!.current).toMatchObject({
    started: false,
    waitingFor: automaticAction(state, actorId)!.key,
  });
  expect(next.routines.activities[actorId]).toEqual(
    state.routines.activities[actorId],
  );
});

it("records schedule and discretionary routine sources at selection rather than inferring them later", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  let state: ReturnType<typeof createInitialState> = {
    ...initial,
    personnel: initial.personnel.map((person) => ({
      ...person,
      stress: 0,
      needs: { rest: 80, satiety: 100 },
    })),
  };
  const sleeping = advanceRoutines(
    setPersonnelSchedule(state, actorId, Array(24).fill("sleep")),
  );
  expect(automaticAction(sleeping, actorId)).toMatchObject({
    source: "schedule",
    label: "Sleep",
  });
  state = setPersonnelSchedule(state, actorId, Array(24).fill("free"));
  let relaxed = state;
  for (
    let minute = 0;
    minute < 120 && !automaticAction(relaxed, actorId);
    minute += 1
  )
    relaxed = advanceRoutines({ ...state, gameMinute: minute });
  expect(automaticAction(relaxed, actorId)).toMatchObject({
    source: "autonomy",
    label: "Relax",
  });
});

it("reorders or clears all player intentions waiting behind an automatic action without touching that action", () => {
  const state = eating();
  const actorId = state.personnel[0]!.id;
  const intent = {
    mapId: state.world.map.id,
    actorId,
    action: "move" as const,
    destination: { x: 60, y: 59 },
  };
  let queued = submitAction(state, intent).state;
  queued = submitAction(queued, {
    ...intent,
    destination: { x: 61, y: 59 },
  }).state;
  const queue = queued.actionQueues[actorId]!;
  const reordered = editActionQueue(
    queued,
    intent.mapId,
    actorId,
    "reorder",
    queue.pending[0]!.sequence,
    queue.current.intent.sequence,
  ).state;
  expect(reordered.actionQueues[actorId]!.current.intent.destination).toEqual({
    x: 61,
    y: 59,
  });
  expect(reordered.actionQueues[actorId]!.current.waitingFor).toBe(
    queue.current.waitingFor,
  );
  expect(reordered.routines).toBe(state.routines);
  expect(reordered.objects).toBe(state.objects);
  const cleared = editActionQueue(
    reordered,
    intent.mapId,
    actorId,
    "clear",
  ).state;
  expect(cleared.actionQueues[actorId]).toBeUndefined();
  expect(cleared.routines).toBe(state.routines);
});

it("keeps a carrier's job claim through the pickup-to-delivery stage transition", () => {
  let state = orderSurfaceWork(
    createInitialState(),
    { x: 63, y: 79 },
    "floor",
    "steel",
    "floor",
  ).state;
  let carrier: string | undefined;
  for (let step = 0; step < 150 && !carrier; step += 1) {
    state = advanceSimulation(state);
    const carried = state.objects.items.find(
      (item) => item.location.kind === "carried" && item.kind === "materials",
    );
    carrier =
      carried?.location.kind === "carried"
        ? carried.location.personId
        : undefined;
  }
  expect(carrier).toBeTruthy();
  const actorId = carrier!;
  const owner = automaticAction(state, actorId)!;
  expect(owner.source).toBe("job");
  state = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "move",
    destination: { x: 60, y: 59 },
  }).state;
  for (
    let step = 0;
    step < 150 && !state.actionQueues[actorId]!.current.started;
    step += 1
  )
    state = advanceSimulation(state);
  expect(state.actionQueues[actorId]!.current).toMatchObject({
    started: true,
    blockedReason: null,
  });
  expect(
    state.objects.items.some(
      (item) =>
        item.location.kind === "carried" && item.location.personId === actorId,
    ),
  ).toBe(false);
  expect(loaded(state).status).toBe("loaded");
});

it("adopts clinical commitments without permitting unsafe cancellation and rejects malformed handoff metadata", () => {
  const actorId = "person-caleb-ward";
  let state = advanceSimulation(
    requestAssessment(createInitialState(), actorId, "mood"),
  );
  const owner = automaticAction(state, actorId)!;
  expect(owner).toMatchObject({ source: "job", label: "Attend appointment" });
  expect(
    cancelAutomaticAction(state, state.world.map.id, actorId, owner.key).reason,
  ).toContain("protected");
  state = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "move",
    destination: { x: 60, y: 59 },
  }).state;
  expect(state.actionQueues[actorId]!.current).toMatchObject({
    started: false,
    waitingFor: owner.key,
  });
  expect(loaded(state).status).toBe("loaded");
  const invalid = structuredClone(state);
  Object.assign(invalid.actionQueues[actorId]!.current, { waitingFor: 5 });
  expect(loaded(invalid).status).not.toBe("loaded");
});
