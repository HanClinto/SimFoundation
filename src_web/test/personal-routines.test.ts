import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation_legacy/state";
import {
  orderPersonalRoutine,
  advanceRoutines,
  cancelPersonalRoutine,
} from "../src/simulation_legacy/routines";
import {
  submitAction,
  editActionQueue,
} from "../src/simulation_legacy/action-queue";
import { advanceSimulation } from "../src/simulation_legacy/tick";
import { loadGameState } from "../src/adapters/browser_legacy/game-persistence";
import { interactionOptions } from "../src/simulation_legacy/interactions";
import { createController } from "../src/application/legacy/controller";
import { objectBlocks } from "../src/simulation_legacy/objects";
import { pawnCues } from "../src/adapters/browser_legacy/pawn-cues";

const load = (state: ReturnType<typeof createInitialState>) =>
  loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} });
function quietState(): ReturnType<typeof createInitialState> {
  const state = createInitialState();
  return {
    ...state,
    personnel: state.personnel.map((person) => ({
      ...person,
      stress: 0,
      needs: { rest: 90, satiety: 100 },
    })),
  };
}

it("starts a requested break outside free time and uses physical travel before relaxation", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const station = initial.routines.stations.find(
    (entry) => entry.kind === "break",
  )!;
  const issued = orderPersonalRoutine(initial, actorId, "break", station.id);
  expect(issued.reason).toBeNull();
  expect(issued.state.world).toEqual(initial.world);
  const next = advanceRoutines(issued.state);
  expect(next.routines.activities[actorId]).toMatchObject({
    source: "player",
    stationId: station.id,
    progress: 0,
  });
  expect(next.personnel[0]!.stress).toBe(initial.personnel[0]!.stress);
  expect(next.world.positions[actorId]).not.toEqual(
    initial.world.positions[actorId],
  );
  expect(pawnCues(next, actorId, "world")[0]!.icon).toBe("break");
  expect(
    cancelPersonalRoutine(next, actorId).state.routines.activities[actorId],
  ).toBeUndefined();
});

it("rejects unusable or occupied furniture before interrupting the person", () => {
  const state = createInitialState();
  const actorId = state.personnel[0]!.id;
  expect(orderPersonalRoutine(state, actorId, "sleep", "spare-bed").state).toBe(
    state,
  );
  const bed = state.routines.stations.find((entry) => entry.kind === "sleep")!;
  const occupied = orderPersonalRoutine(
    state,
    state.personnel[1]!.id,
    "sleep",
    bed.id,
  ).state;
  expect(orderPersonalRoutine(occupied, actorId, "sleep", bed.id)).toEqual({
    state: occupied,
    reason: "This bed or seat is already in use or reserved.",
  });
});

it("queues Eat, physically collects one meal, protects carried food and starts the next action after eating", () => {
  const initial = quietState();
  const actorId = initial.personnel[0]!.id;
  const station = initial.routines.stations.find(
    (entry) => entry.kind === "meal",
  )!;
  let state = submitAction(initial, {
    mapId: initial.world.map.id,
    actorId,
    action: "eat",
    targetId: `object:${station.id}`,
  }).state;
  state = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "move",
    destination: { x: 60, y: 59 },
  }).state;
  expect(state.actionQueues[actorId]!.current.started).toBe(true);
  expect(state.routines.activities[actorId]).toMatchObject({
    source: "player",
    kind: "meal",
    stationId: station.id,
  });
  expect(state.objects).toEqual(initial.objects);
  expect(load(state).status).toBe("loaded");
  for (
    let step = 0;
    step < 100 && !state.routines.activities[actorId]!.mealObjectId;
    step += 1
  )
    state = advanceSimulation(state);
  expect(state.routines.activities[actorId]!.mealObjectId).toBeTruthy();
  const carried = state;
  expect(
    editActionQueue(state, state.world.map.id, actorId, "cancel").reason,
  ).toContain("cargo");
  expect(
    editActionQueue(state, state.world.map.id, actorId, "cancel").state,
  ).toBe(carried);
  const saved = load(state);
  expect(saved.status).toBe("loaded");
  if (saved.status !== "loaded")
    throw new Error("carried player meal save rejected");
  expect(advanceSimulation(saved.state)).toEqual(advanceSimulation(state));
  for (
    let step = 0;
    step < 100 && state.actionQueues[actorId]!.current.intent.action === "eat";
    step += 1
  )
    state = advanceSimulation(state);
  expect(state.routines.activities[actorId]).toBeUndefined();
  expect(state.actionQueues[actorId]!.current.intent.action).toBe("move");
  expect(state.routines.mealsConsumed).toBe(1);
  expect(
    state.objects.items
      .filter(
        (item) => item.kind === "meals" && item.location.kind !== "consumed",
      )
      .reduce((sum, item) => sum + item.quantity, 0),
  ).toBe(107);
  expect(load(state).status).toBe("loaded");
});

it("waits for a queued seat to become available and retries without reserving it prematurely", () => {
  const state = quietState();
  const actorId = state.personnel[0]!.id;
  const otherId = state.personnel[1]!.id;
  const intent = {
    mapId: state.world.map.id,
    actorId,
    action: "relax" as const,
    targetId: "object:break-seat-1",
  };
  let next = submitAction(state, { ...intent, actorId: otherId }).state;
  next = submitAction(next, intent).state;
  expect(next.actionQueues[actorId]!.current).toMatchObject({
    started: false,
    blockedReason: "This bed or seat is already in use or reserved.",
  });
  expect(next.routines.activities[actorId]).toBeUndefined();
  next = editActionQueue(next, intent.mapId, otherId, "cancel").state;
  next = editActionQueue(next, intent.mapId, actorId, "retry").state;
  expect(next.actionQueues[actorId]!.current.started).toBe(true);
  expect(next.routines.activities[actorId]!.stationId).toBe("break-seat-1");
  expect(load(next).status).toBe("loaded");
});

it("rejects unavailable meal supplies and safely replaces a non-carrying routine through legacy orders", () => {
  const state = quietState();
  const actorId = state.personnel[0]!.id;
  const empty = {
    ...state,
    objects: {
      ...state.objects,
      items: state.objects.items.filter((item) => item.kind !== "meals"),
    },
  };
  expect(orderPersonalRoutine(empty, actorId, "meal", "meal-seat-1")).toEqual({
    state: empty,
    reason: "No reachable meal supply is available.",
  });
  const controller = createController(state);
  controller.queueAction({
    mapId: state.world.map.id,
    actorId,
    action: "relax",
    targetId: "object:break-seat-1",
  });
  expect(
    controller.orderResponder(actorId, "move", { x: 60, y: 59 }).code,
  ).toBe("accepted");
  expect(
    controller.getSnapshot().game.routines.activities[actorId],
  ).toBeUndefined();
  expect(controller.getSnapshot().game.actionQueues[actorId]).toBeUndefined();
  expect(load(controller.getSnapshot().game).status).toBe("loaded");
});

it("runs Sleep then Relax at selected furniture and releases temporary control after both finish", () => {
  const initial = quietState();
  const actorId = initial.personnel[0]!.id;
  const bed = initial.routines.stations.find(
    (entry) => entry.kind === "sleep",
  )!;
  const chair = initial.routines.stations.find(
    (entry) => entry.kind === "break",
  )!;
  let state = submitAction(initial, {
    mapId: initial.world.map.id,
    actorId,
    action: "sleep",
    targetId: `object:${bed.id}`,
  }).state;
  state = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "relax",
    targetId: `object:${chair.id}`,
  }).state;
  expect(state.routines.activities[actorId]!.stationId).toBe(bed.id);
  expect(
    Object.values(state.routines.activities).some(
      (activity) => activity.stationId === chair.id,
    ),
  ).toBe(false);
  let relaxed = false;
  for (let step = 0; step < 250 && state.actionQueues[actorId]; step += 1) {
    state = advanceSimulation(state);
    if (state.routines.activities[actorId]?.kind === "break") {
      relaxed = true;
      expect(state.routines.activities[actorId]!.stationId).toBe(chair.id);
    }
  }
  expect(relaxed).toBe(true);
  expect(state.actionQueues[actorId]).toBeUndefined();
  expect(state.routines.activities[actorId]).toBeUndefined();
  state = advanceSimulation(state);
  expect(state.combat.responders[actorId]!.drafted).toBe(false);
  expect(load(state).status).toBe("loaded");
});

it("keeps a damaged target blocked rather than silently moving to another seat or the next intention", () => {
  const initial = quietState();
  const actorId = initial.personnel[0]!.id;
  const chair = initial.routines.stations.find(
    (entry) => entry.kind === "break",
  )!;
  let state = submitAction(initial, {
    mapId: initial.world.map.id,
    actorId,
    action: "relax",
    targetId: `object:${chair.id}`,
  }).state;
  state = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "move",
    destination: { x: 60, y: 59 },
  }).state;
  state = {
    ...state,
    objects: {
      ...state.objects,
      items: state.objects.items.map((item) =>
        item.id === chair.id ? { ...item, condition: 0 } : item,
      ),
    },
  };
  state = {
    ...state,
    world: {
      ...state.world,
      map: {
        ...state.world.map,
        objectBlocks: objectBlocks(state.objects, state.world.map.width),
      },
    },
  };
  state = advanceSimulation(state);
  expect(state.actionQueues[actorId]!.current).toMatchObject({
    started: false,
    blockedReason: "Routine destination is no longer reachable.",
  });
  expect(state.actionQueues[actorId]!.pending).toHaveLength(1);
  expect(load(state).status).toBe("loaded");
});

it("cancels before meal pickup without spending food and preserves explicit drafting", () => {
  const controller = createController(quietState());
  const state = controller.getSnapshot().game;
  const actorId = state.personnel[0]!.id;
  controller.draftResponder(actorId, true);
  const result = controller.interact({
    mapId: state.world.map.id,
    actorId,
    action: "eat",
    targetId: "object:meal-seat-1",
  });
  expect(result.reason).toBeNull();
  expect(load(result.snapshot.game).status).toBe("loaded");
  controller.draftResponder(actorId, true);
  expect(
    controller.getSnapshot().game.actionQueues[actorId]!.current.intent.action,
  ).toBe("eat");
  expect(load(controller.getSnapshot().game).status).toBe("loaded");
  const cancelled = controller.editQueue(state.world.map.id, actorId, "cancel");
  expect(cancelled.reason).toBeNull();
  expect(cancelled.snapshot.game.routines.activities[actorId]).toBeUndefined();
  expect(cancelled.snapshot.game.objects).toEqual(state.objects);
  controller.advance(2);
  expect(
    controller.getSnapshot().game.combat.responders[actorId]!.drafted,
  ).toBe(true);
});

it("offers implemented routine verbs for matching objects", () => {
  const state = quietState();
  const actorId = state.personnel[0]!.id;
  expect(
    interactionOptions(state, state.world.map.id, actorId, "object:bed-1"),
  ).toMatchObject([{ action: "sleep", reason: null }]);
  expect(
    interactionOptions(
      state,
      state.world.map.id,
      actorId,
      "object:meal-seat-1",
    ),
  ).toMatchObject([{ action: "eat", reason: null }]);
  expect(
    interactionOptions(
      state,
      state.world.map.id,
      actorId,
      "object:break-seat-1",
    ),
  ).toMatchObject([{ action: "relax", reason: null }]);
});
