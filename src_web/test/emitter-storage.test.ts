import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  discoverStorageWork,
  setStorageArea,
  storageStatus,
  type StoragePolicy,
} from "../src/simulation/storage";
import { setExposureSource } from "../src/simulation/environment";
import { orderObjectMove } from "../src/simulation/object-work";
import { advanceSimulation } from "../src/simulation/tick";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { reservedObject } from "../src/simulation/objects";

function verifySave(state: ReturnType<typeof createInitialState>) {
  const loaded = loadGameState({
    getItem: () => JSON.stringify(state),
    setItem: () => {},
  });
  expect(loaded.status).toBe("loaded");
  if (loaded.status === "loaded")
    expect(advanceSimulation(loaded.state)).toEqual(advanceSimulation(state));
}

const area: StoragePolicy = {
  name: "Emitter storage",
  origin: { x: 54, y: 59 },
  width: 1,
  height: 1,
  accepts: ["break-seat"],
  capacity: 1,
  target: 1,
  serveMeals: false,
  enabled: true,
  emission: "active",
};
const source = {
  name: "Emitter",
  objectId: "spare-break-seat",
  position: { x: 67, y: 66 },
  kind: "corrosion" as const,
  radius: 1,
  dose: 0.1,
  enabled: true,
};

it("automatically hauls emitting packed objects only to accepting areas", () => {
  let state = setExposureSource(createInitialState(), source).state;
  state = setStorageArea(state, {
    ...area,
    name: "Ordinary storage",
    emission: "none",
    origin: { x: 53, y: 59 },
  }).state;
  expect(discoverStorageWork(state).objectOrders).toEqual([]);
  expect(
    orderObjectMove(state, source.objectId, { x: 53, y: 59 }, "north", false)
      .code,
  ).toBe("occupied");
  state = setStorageArea(state, area).state;
  for (
    let tick = 0;
    tick < 200 &&
    !state.objectOrders.some((order) => order.phase === "completed");
    tick += 1
  )
    state = advanceSimulation(state);
  expect(state.objectOrders).toHaveLength(1);
  expect(state.objectOrders[0]).toMatchObject({
    objectId: source.objectId,
    destination: area.origin,
    phase: "completed",
    install: false,
  });
  expect(state.environment.sources[0]!.objectId).toBe(source.objectId);
  verifySave(state);
});

it("lets an emitting-only store pull stock that no longer matches its current store despite that store's target", () => {
  let state = setExposureSource(createInitialState(), {
    ...source,
    enabled: false,
  }).state;
  state = setStorageArea(state, {
    ...area,
    name: "Ordinary storage",
    origin: { x: 67, y: 66 },
    emission: "none",
  }).state;
  const ordinary = state.storage.areas.at(-1)!;
  state = setStorageArea(state, area).state;
  expect(discoverStorageWork(state).objectOrders).toHaveLength(0);
  state = setExposureSource(
    state,
    source,
    state.environment.sources[0]!.id,
  ).state;
  expect(storageStatus(state, ordinary)).toContain(
    "outside the acceptance filter",
  );
  const queued = discoverStorageWork(state);
  expect(queued.objectOrders[0]).toMatchObject({
    objectId: source.objectId,
    destination: area.origin,
  });
  verifySave(queued);
});

it("blocks a newly emitting delivery without dropping its cargo, then resumes when the source is disabled", () => {
  let state = setExposureSource(createInitialState(), {
    ...source,
    enabled: false,
  }).state;
  state = setStorageArea(state, { ...area, emission: "none" }).state;
  for (
    let tick = 0;
    tick < 160 && state.objectOrders[0]?.phase !== "carry";
    tick += 1
  )
    state = advanceSimulation(state);
  expect(state.objectOrders[0]!.phase).toBe("carry");
  state = setExposureSource(
    state,
    source,
    state.environment.sources[0]!.id,
  ).state;
  for (
    let tick = 0;
    tick < 120 && !state.objectOrders[0]!.blockedReason;
    tick += 1
  )
    state = advanceSimulation(state);
  expect(state.objectOrders[0]!.phase).toBe("carry");
  expect(state.objectOrders[0]!.blockedReason).toContain("occupied");
  expect(
    reservedObject(state.objects, state.objectOrders[0]!.jobId)?.location.kind,
  ).toBe("carried");
  expect(storageStatus(state, state.storage.areas.at(-1)!)).toContain(
    "acceptance filter",
  );
  verifySave(state);
  state = setExposureSource(
    state,
    { ...source, enabled: false },
    state.environment.sources[0]!.id,
  ).state;
  for (
    let tick = 0;
    tick < 80 && state.objectOrders[0]!.phase !== "completed";
    tick += 1
  )
    state = advanceSimulation(state);
  expect(state.objectOrders[0]!.phase).toBe("completed");
  verifySave(state);
});

it("rejects invalid emission policies while retaining valid legacy defaults", () => {
  const initial = createInitialState();
  verifySave(initial);
  expect(
    setStorageArea(initial, { ...area, emission: "unsafe" as "active" }).code,
  ).toBe("invalid-policy");
  const invalid = {
    ...initial,
    storage: {
      ...initial.storage,
      areas: initial.storage.areas.map((item) => ({
        ...item,
        emission: "unsafe",
      })),
    },
  };
  expect(
    loadGameState({ getItem: () => JSON.stringify(invalid), setItem: () => {} })
      .status,
  ).toBe("invalid");
});
