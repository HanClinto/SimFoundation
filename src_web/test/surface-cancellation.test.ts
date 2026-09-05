import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  cancelSurfaceWork,
  orderSurfaceWork,
} from "../src/simulation/environment";
import { advanceSimulation } from "../src/simulation/tick";
import { surfaceAt } from "../src/simulation/materials";
import { reservedObject } from "../src/simulation/objects";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { cameraPlacementIssue } from "../src/simulation/observations";
import { validateLaboratoryPlacement } from "../src/simulation/construction";
import { setDoorPolicy } from "../src/simulation/world";

function verifySave(state: ReturnType<typeof createInitialState>) {
  const loaded = loadGameState({
    getItem: () => JSON.stringify(state),
    setItem: () => {},
  });
  expect(loaded.status).toBe("loaded");
  if (loaded.status === "loaded")
    expect(advanceSimulation(loaded.state)).toEqual(advanceSimulation(state));
}

it("cancels before pickup once, releases the worker and stock, and permits replanning", () => {
  let state = orderSurfaceWork(
    createInitialState(),
    { x: 63, y: 79 },
    "floor",
    "steel",
    "floor",
  ).state;
  state = advanceSimulation(state);
  const order = state.environment.orders[0]!;
  const cancelled = cancelSurfaceWork(state, order.id);
  expect(cancelled.environment.orders[0]!.phase).toBe("cancelled");
  expect(cancelled.construction.availableMaterials).toBe(160);
  expect(cancelled.environment.spentMaterials).toBe(0);
  expect(cancelled.jobs.some((job) => job.id === order.jobId)).toBe(false);
  expect(
    cancelled.personnel.some((person) => person.currentJobId === order.jobId),
  ).toBe(false);
  expect(cancelSurfaceWork(cancelled, order.id)).toBe(cancelled);
  verifySave(cancelled);
  expect(reservedObject(cancelled.objects, order.jobId)).toBeUndefined();
  expect(
    orderSurfaceWork(cancelled, order.position, "floor", "steel", "floor").code,
  ).toBe("accepted");
});

it("defers cancellation of carried supplies until real delivery then releases them without fitting", () => {
  let state = orderSurfaceWork(
    createInitialState(),
    { x: 63, y: 79 },
    "floor",
    "steel",
    "floor",
  ).state;
  for (
    let tick = 0;
    tick < 180 && state.environment.orders[0]!.phase !== "delivering";
    tick += 1
  )
    state = advanceSimulation(state);
  expect(state.environment.orders[0]!.phase).toBe("delivering");
  const order = state.environment.orders[0]!;
  const cargo = reservedObject(state.objects, order.jobId)!;
  expect(cargo.location.kind).toBe("carried");
  state = cancelSurfaceWork(state, order.id);
  expect(state.construction.availableMaterials).toBe(156);
  expect(reservedObject(state.objects, order.jobId)).toEqual(cargo);
  expect(cancelSurfaceWork(state, order.id)).toBe(state);
  const destination = state.jobs.find(
    (job) => job.id === order.jobId,
  )!.workSite;
  state = {
    ...state,
    world: setDoorPolicy(
      setDoorPolicy(state.world, { x: 67, y: 64 }, "held-closed"),
      { x: 69, y: 70 },
      "held-closed",
    ),
  };
  for (let tick = 0; tick < 12; tick += 1) state = advanceSimulation(state);
  expect(state.environment.orders[0]!.phase).toBe("delivering");
  expect(state.construction.availableMaterials).toBe(156);
  expect(reservedObject(state.objects, order.jobId)?.location.kind).toBe(
    "carried",
  );
  verifySave(state);
  state = {
    ...state,
    world: setDoorPolicy(state.world, { x: 67, y: 64 }, "automatic"),
  };
  verifySave(state);
  for (
    let tick = 0;
    tick < 180 && state.environment.orders[0]!.phase !== "cancelled";
    tick += 1
  ) {
    state = advanceSimulation(state);
    if (tick % 10 === 0) verifySave(state);
  }
  expect(state.environment.orders[0]!.phase).toBe("cancelled");
  expect(surfaceAt(state.world.map, order.position, "floor")).toBeNull();
  expect(
    state.objects.items.find((item) => item.id === cargo.id),
  ).toMatchObject({
    quantity: 4,
    reservedBy: null,
    location: { kind: "ground", position: destination },
  });
  expect(state.construction.availableMaterials).toBe(160);
  expect(state.environment.spentMaterials).toBe(0);
  verifySave(state);
  expect(
    state.objects.items
      .filter((item) => item.kind === "materials")
      .reduce((sum, item) => sum + item.quantity, 0),
  ).toBe(160);
});

it("cancels fitting and demolition without changing a layer or retaining footprint reservations", () => {
  let state = orderSurfaceWork(
    createInitialState(),
    { x: 63, y: 80 },
    "floor",
    "steel",
    "floor",
  ).state;
  for (
    let tick = 0;
    tick < 180 && state.environment.orders[0]!.phase !== "fitting";
    tick += 1
  )
    state = advanceSimulation(state);
  expect(state.environment.orders[0]!.phase).toBe("fitting");
  state = cancelSurfaceWork(state, state.environment.orders[0]!.id);
  verifySave(state);
  expect(validateLaboratoryPlacement(state, { x: 59, y: 80 })).not.toBe(
    "overlap",
  );
  const position = { x: 59, y: 65 };
  state = orderSurfaceWork(state, position, "floor", "steel", "remove").state;
  const before = surfaceAt(state.world.map, position, "floor");
  state = cancelSurfaceWork(state, state.environment.orders.at(-1)!.id);
  expect(surfaceAt(state.world.map, position, "floor")).toEqual(before);
  expect(cameraPlacementIssue(state, position)).toBeNull();
  expect(state.construction.availableMaterials).toBe(160);
  verifySave(state);
});

it("rejects cancelled saves retaining jobs or invalid cancellation phases", () => {
  const queued = orderSurfaceWork(
    createInitialState(),
    { x: 63, y: 79 },
    "floor",
    "steel",
    "floor",
  ).state;
  const cancelled = cancelSurfaceWork(queued, queued.environment.orders[0]!.id);
  for (const state of [
    { ...cancelled, jobs: queued.jobs },
    {
      ...cancelled,
      environment: {
        ...cancelled.environment,
        orders: cancelled.environment.orders.map((order) => ({
          ...order,
          cancelRequested: true,
        })),
      },
    },
    {
      ...queued,
      environment: {
        ...queued.environment,
        orders: queued.environment.orders.map((order) => ({
          ...order,
          cancelRequested: "yes",
        })),
      },
    },
  ])
    expect(
      loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} })
        .status,
    ).toBe("invalid");
});
