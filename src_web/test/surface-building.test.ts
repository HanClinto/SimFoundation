import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import { setSurface, surfaceAt } from "../src/simulation/materials";
import {
  advanceSurfaceWork,
  orderSurfaceWork,
  type SurfaceOperation,
} from "../src/simulation/environment";
import { advanceSimulation } from "../src/simulation/tick";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { orderObjectMove } from "../src/simulation/object-work";
import { removeStorageArea, setStorageArea } from "../src/simulation/storage";
import { validateLaboratoryPlacement } from "../src/simulation/construction";
import { cameraPlacementIssue } from "../src/simulation/observations";

it("workers pave soil, build a barrier, remove it, and install an automatic door using finite stock", () => {
  let state = createInitialState();
  const position = { x: 63, y: 79 };
  for (const operation of [
    "floor",
    "wall",
    "remove",
    "door",
    "remove",
    "remove",
  ] as SurfaceOperation[]) {
    const layer =
      operation === "floor" ||
      (operation === "remove" &&
        !surfaceAt(state.world.map, position, "structure"))
        ? "floor"
        : "structure";
    const before = state.construction.availableMaterials;
    const queued = orderSurfaceWork(state, position, layer, "steel", operation);
    expect(queued.code).toBe("accepted");
    state = queued.state;
    expect(state.construction.availableMaterials).toBe(
      before - (operation === "remove" ? 0 : 4),
    );
    for (
      let tick = 0;
      tick < 240 && state.environment.orders.at(-1)!.phase !== "completed";
      tick += 1
    ) {
      state = advanceSimulation(state);
      if (tick % 12 === 0) {
        const loaded = loadGameState({
          getItem: () => JSON.stringify(state),
          setItem: () => {},
        });
        expect(loaded.status).toBe("loaded");
        if (loaded.status === "loaded")
          expect(advanceSimulation(loaded.state)).toEqual(
            advanceSimulation(state),
          );
      }
    }
    expect(state.environment.orders.at(-1)!.phase).toBe("completed");
    if (operation === "door")
      expect(
        state.world.map.doorPolicies?.[position.y * 128 + position.x],
      ).toBe("automatic");
    if (layer === "structure")
      expect(surfaceAt(state.world.map, position, "floor")?.material).toBe(
        "steel",
      );
  }
  expect(state.world.map.tiles[position.y * 128 + position.x]).toBe("grass");
  expect(state.construction.availableMaterials).toBe(148);
  expect(state.environment.spentMaterials).toBe(12);
}, 20000);

it("rejects unsupported, occupied and conflicting footprint work without spending resources", () => {
  const initial = createInitialState();
  expect(
    orderSurfaceWork(initial, { x: 80, y: 80 }, "structure", "steel", "wall")
      .code,
  ).toBe("unsupported");
  expect(
    orderSurfaceWork(initial, { x: 61, y: 54 }, "floor", "steel", "remove")
      .code,
  ).toBe("unsupported");
  expect(
    orderSurfaceWork(initial, { x: 58, y: 67 }, "floor", "steel", "remove")
      .code,
  ).toBe("occupied");
  const position = { x: 59, y: 65 };
  const queued = orderSurfaceWork(
    initial,
    position,
    "structure",
    "steel",
    "wall",
  );
  expect(queued.code).toBe("accepted");
  expect(
    orderSurfaceWork(queued.state, position, "floor", "steel", "remove").code,
  ).toBe("busy");
  expect(
    orderObjectMove(queued.state, "spare-bed", position, "north", true).code,
  ).toBe("occupied");
  expect(
    setStorageArea(
      queued.state,
      { ...initial.storage.areas[0]!, origin: position },
      "storage-1",
    ).code,
  ).toBe("occupied");
  expect(cameraPlacementIssue(queued.state, position)).toBe("occupied");
  expect(
    orderSurfaceWork(
      initial,
      initial.observations.cameras[0]!.position,
      "floor",
      "steel",
      "remove",
    ).code,
  ).toBe("occupied");
  expect(initial.construction.availableMaterials).toBe(160);
});

it("waits for late obstructions before fitting without consuming supplies", () => {
  const position = { x: 59, y: 65 };
  let state = orderSurfaceWork(
    createInitialState(),
    position,
    "structure",
    "steel",
    "wall",
  ).state;
  for (
    let tick = 0;
    tick < 180 && state.environment.orders[0]!.phase !== "fitting";
    tick += 1
  )
    state = advanceSimulation(state);
  expect(state.environment.orders[0]!.phase).toBe("fitting");
  const savedObjects = state.objects;
  state = {
    ...state,
    jobs: state.jobs.map((job) =>
      job.id === state.environment.orders[0]!.jobId
        ? { ...job, status: "completed" as const }
        : job,
    ),
    objects: {
      ...state.objects,
      items: state.objects.items.map((item) =>
        item.id === "spare-bed"
          ? { ...item, location: { kind: "ground" as const, position } }
          : item,
      ),
    },
  };
  const blocked = advanceSurfaceWork(state);
  expect(blocked.environment.orders[0]!.blockedReason).toContain("occupied");
  expect(surfaceAt(blocked.world.map, position, "structure")).toBeNull();
  expect(blocked.objects).toEqual(state.objects);
  const workSite = blocked.jobs.find(
    (job) => job.id === blocked.environment.orders[0]!.jobId,
  )!.workSite;
  const cleared = advanceSurfaceWork({
    ...blocked,
    objects: savedObjects,
    world: {
      ...blocked.world,
      positions: Object.fromEntries(
        Object.entries(blocked.world.positions).map(([id, origin]) => [
          id,
          origin.x === position.x && origin.y === position.y
            ? workSite
            : origin,
        ]),
      ),
    },
  });
  expect(cleared.environment.orders[0]!.phase).toBe("completed");
  expect(surfaceAt(cleared.world.map, position, "structure")?.kind).toBe(
    "wall",
  );
});

it("rejects corrupt operation types, phase combinations and removal ledgers", () => {
  const state = orderSurfaceWork(
    createInitialState(),
    { x: 61, y: 54 },
    "structure",
    "steel",
    "remove",
  ).state;
  for (const replacement of [
    { operation: "instant" },
    { operation: "floor" },
    { phase: "collecting" },
  ]) {
    const invalid = {
      ...state,
      environment: {
        ...state.environment,
        orders: state.environment.orders.map((order) => ({
          ...order,
          ...replacement,
        })),
      },
    };
    expect(
      loadGameState({
        getItem: () => JSON.stringify(invalid),
        setItem: () => {},
      }).status,
    ).toBe("invalid");
  }
  const invalid = {
    ...state,
    environment: { ...state.environment, spentMaterials: 4 },
  };
  expect(
    loadGameState({ getItem: () => JSON.stringify(invalid), setItem: () => {} })
      .status,
  ).toBe("invalid");
});

it("installs and removes independent layers without retaining removed door policies", () => {
  const initial = createInitialState().world.map;
  const position = { x: 80, y: 65 };
  const floor = {
    kind: "floor" as const,
    material: "concrete" as const,
    integrity: 100,
  };
  const paved = setSurface(initial, position, "floor", floor);
  const walled = setSurface(paved, position, "structure", {
    ...floor,
    kind: "wall",
  });
  expect(walled.tiles[65 * 128 + 80]).toBe("wall");
  const door = setSurface(walled, position, "structure", {
    ...floor,
    kind: "door",
  });
  expect(door.doorPolicies?.[65 * 128 + 80]).toBe("automatic");
  const cleared = setSurface(door, position, "structure", null);
  expect(surfaceAt(cleared, position, "floor")).toEqual(floor);
  expect(cleared.tiles[65 * 128 + 80]).toBe("floor");
  expect(cleared.doorPolicies?.[65 * 128 + 80]).toBeUndefined();
  expect(
    setSurface(cleared, position, "floor", null).tiles[65 * 128 + 80],
  ).toBe("grass");
  expect(initial.tiles[65 * 128 + 80]).toBe("grass");
});

it("allows remodeling the former material-store tile after its supplies and designation move", () => {
  const initial = removeStorageArea(createInitialState(), "storage-2").state;
  const relocated = {
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.map((item) =>
        item.id === "stock-materials"
          ? {
              ...item,
              location: { kind: "ground" as const, position: { x: 66, y: 70 } },
            }
          : item,
      ),
    },
  };
  let state = orderSurfaceWork(
    relocated,
    initial.construction.stockpile,
    "structure",
    "steel",
    "wall",
  ).state;
  for (
    let tick = 0;
    tick < 200 && state.environment.orders[0]!.phase !== "completed";
    tick += 1
  )
    state = advanceSimulation(state);
  expect(state.environment.orders[0]!.phase).toBe("completed");
  expect(state.world.map.tiles[68 * 128 + 67]).toBe("wall");
  expect(
    loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} })
      .status,
  ).toBe("loaded");
  expect(validateLaboratoryPlacement(state, { x: 59, y: 80 })).toBeNull();
});
