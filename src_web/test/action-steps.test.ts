import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation_legacy/state";
import { submitAction } from "../src/simulation_legacy/action-queue";
import { advanceSimulation } from "../src/simulation_legacy/tick";
import { setSurface } from "../src/simulation_legacy/materials";
import { currentActionIdentity } from "../src/simulation_legacy/action-progress";
import { actionExecutionStep } from "../src/simulation_legacy/action-steps";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { createController } from "../src/application/controller";
import { createTestJobs } from "./fixtures/work-state";

it("records actual door opening under the movement parent without injecting another intention", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const door = { x: 58, y: 55 };
  const state = {
    ...initial,
    world: {
      ...initial.world,
      map: setSurface(initial.world.map, door, "structure", {
        kind: "closed-door" as const,
        material: "steel" as const,
        integrity: 100,
      }),
      positions: { ...initial.world.positions, [actorId]: { x: 57, y: 55 } },
    },
  };
  const queued = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "move",
    destination: { x: 59, y: 55 },
  }).state;
  const next = advanceSimulation(queued);
  expect(next.world.positions[actorId]).toEqual(state.world.positions[actorId]);
  expect(next.actionQueues[actorId]!.current.intent).toEqual(
    queued.actionQueues[actorId]!.current.intent,
  );
  expect(next.actionQueues[actorId]!.pending).toEqual([]);
  expect(next.actionTimings[actorId]).toMatchObject({
    key: currentActionIdentity(next, actorId)!.key,
    doorStep: { tick: next.tick, position: door },
  });
  expect(actionExecutionStep(next, actorId)).toMatchObject({
    parentKey: currentActionIdentity(next, actorId)!.key,
    kind: "open-door",
    label: "Open door",
    path: ["Walk to destination", "Open door"],
  });
  const saved = loadGameState({
    getItem: () => JSON.stringify(next),
    setItem: () => {},
  });
  expect(saved.status).toBe("loaded");
  if (saved.status !== "loaded") throw new Error("door step save rejected");
  expect(actionExecutionStep(saved.state, actorId)).toEqual(
    actionExecutionStep(next, actorId),
  );
  expect(advanceSimulation(saved.state)).toEqual(advanceSimulation(next));
  const replaced = createController(next);
  replaced.queueAction(
    { mapId: state.world.map.id, actorId, action: "hold" },
    "now",
  );
  expect(actionExecutionStep(replaced.getSnapshot().game, actorId)).toBeNull();
  expect(actionExecutionStep(advanceSimulation(next), actorId)).toMatchObject({
    kind: "walk",
    label: "Walk to destination",
  });
});

it("attributes an actual job travel door step to that job rather than a separate queued action", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const job = {
    ...createTestJobs()[0]!,
    status: "in-progress" as const,
    assignedPersonId: actorId,
    workSite: { x: 59, y: 55 },
    authorizedTick: 0,
  };
  const state = {
    ...initial,
    jobs: [job],
    personnel: initial.personnel.map((person) =>
      person.id === actorId ? { ...person, currentJobId: job.id } : person,
    ),
    world: {
      ...initial.world,
      positions: { ...initial.world.positions, [actorId]: { x: 57, y: 55 } },
      map: setSurface(initial.world.map, { x: 58, y: 55 }, "structure", {
        kind: "closed-door" as const,
        material: "steel" as const,
        integrity: 100,
      }),
    },
  };
  const next = advanceSimulation(state);
  expect(actionExecutionStep(next, actorId)).toMatchObject({
    source: "job",
    parentKey: `job:${job.id}:${actorId}`,
    label: "Open door",
    path: ["Travel to work site", "Open door"],
  });
  expect(next.actionQueues).toEqual({});
  expect(next.jobs[0]!.progress).toBe(0);
  expect(next.actionTimings[actorId]!.startedTick).toBe(0);
});

it("shows real meal execution phases under one unchanged parent without speculative queue entries", () => {
  let state = createInitialState();
  const actorId = state.personnel[0]!.id;
  state = {
    ...state,
    personnel: state.personnel.map((person) => ({
      ...person,
      stress: 0,
      needs: { rest: 100, satiety: 100 },
    })),
  };
  state = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "eat",
    targetId: "object:meal-seat-1",
  }).state;
  const parent = currentActionIdentity(state, actorId)!.key;
  const seen = new Set<string>();
  for (let tick = 0; tick < 120 && state.actionQueues[actorId]; tick += 1) {
    const before = JSON.stringify(state);
    const step = actionExecutionStep(state, actorId)!;
    expect(step.parentKey).toBe(parent);
    expect(step.source).toBe("player");
    expect(JSON.stringify(state)).toBe(before);
    expect(state.actionQueues[actorId]!.pending).toEqual([]);
    seen.add(step.label);
    state = advanceSimulation(state);
  }
  for (const label of [
    "Walk to pantry",
    "Pick up meal",
    "Carry meal to seat",
    "Eat meal",
  ])
    expect(seen.has(label)).toBe(true);
  expect(state.routines.mealsConsumed).toBe(1);
  expect(state.actionQueues[actorId]).toBeUndefined();
});
