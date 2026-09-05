import { expect, it } from "vitest";
import {
  closeAutomaticDoors,
  findRoute,
  isWalkable,
  stepWorld,
  type SiteWorld,
} from "../src/simulation/world";
import { surfacesForTile } from "../src/simulation/materials";
import { createInitialState } from "../src/simulation/state";
import { createController } from "../src/application/controller";
import { orderObjectMove } from "../src/simulation/object-work";
import { advanceSimulation } from "../src/simulation/tick";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { canObserve } from "../src/simulation/observations";
import { pawnCues } from "../src/adapters/browser/pawn-cues";

function corridor(): SiteWorld {
  return {
    map: {
      id: "corridor",
      width: 5,
      height: 1,
      rooms: [],
      tiles: ["floor", "floor", "closed-door", "floor", "floor"],
      surfaces: { 2: surfacesForTile("closed-door") },
      doorPolicies: { 2: "automatic" },
    },
    positions: { worker: { x: 1, y: 0 } },
  };
}

it("plans through automatic doors but spends a step opening them before passage", () => {
  const world = corridor();
  expect(isWalkable(world.map, { x: 2, y: 0 })).toBe(false);
  expect(
    findRoute(world.map, world.positions.worker!, { x: 4, y: 0 }),
  ).toHaveLength(3);
  const opened = stepWorld(world, "worker", { x: 2, y: 0 });
  expect(opened.positions.worker).toEqual(world.positions.worker);
  expect(opened.map.tiles[2]).toBe("door");
  expect(world.map.tiles[2]).toBe("closed-door");
  const crossed = stepWorld(opened, "worker", { x: 2, y: 0 });
  expect(crossed.positions.worker).toEqual({ x: 2, y: 0 });
  expect(closeAutomaticDoors(crossed).map.tiles[2]).toBe("door");
  const cleared = stepWorld(
    stepWorld(crossed, "worker", { x: 3, y: 0 }),
    "worker",
    { x: 4, y: 0 },
  );
  expect(closeAutomaticDoors(cleared, [{ x: 2, y: 0 }]).map.tiles[2]).toBe(
    "door",
  );
  expect(closeAutomaticDoors(cleared).map.tiles[2]).toBe("closed-door");
});

it("held-closed doors block routes and remote opening is not a movement action", () => {
  const world = corridor();
  const locked = {
    ...world,
    map: { ...world.map, doorPolicies: { 2: "held-closed" as const } },
  };
  expect(
    findRoute(locked.map, world.positions.worker!, { x: 4, y: 0 }),
  ).toBeNull();
  expect(stepWorld(locked, "worker", { x: 2, y: 0 })).toBe(locked);
  expect(stepWorld(world, "worker", { x: 4, y: 0 })).toBe(world);
});

it("closed automatic doors block sight until a physical opening step", () => {
  const world = corridor();
  expect(canObserve(world.map, { x: 1, y: 0 }, { x: 3, y: 0 }, 6)).toBe(false);
  expect(
    canObserve(
      stepWorld(world, "worker", { x: 2, y: 0 }).map,
      { x: 1, y: 0 },
      { x: 3, y: 0 },
      6,
    ),
  ).toBe(true);
});

it("stalls committed hauling behind a held door and resumes through automatic passage with deterministic saves", () => {
  const initial = createInitialState();
  let state = orderObjectMove(
    initial,
    "stock-materials",
    { x: 58, y: 60 },
    "north",
    false,
    12,
  ).state;
  const controller = createController(state);
  const { setDoorOpen } = controller;
  state = setDoorOpen({ x: 61, y: 55 }, false).game;
  for (let tick = 0; tick < 45; tick += 1) state = advanceSimulation(state);
  expect(state.objectOrders[0]?.phase).not.toBe("completed");
  controller.replaceState(state);
  state = controller.setDoorPolicy({ x: 61, y: 55 }, "automatic").game;
  let sawOpen = false;
  let sawOpeningAction = false;
  for (
    let tick = 0;
    tick < 180 && state.objectOrders[0]?.phase !== "completed";
    tick += 1
  ) {
    state = advanceSimulation(state);
    sawOpen ||= state.world.map.tiles[55 * 128 + 61] === "door";
    for (const person of state.personnel.filter(
      (person) => person.activity === "Opening door",
    )) {
      sawOpeningAction = true;
      expect(pawnCues(state, person.id, "world")[0]?.label).toBe(
        "Opening door",
      );
    }
    if (tick % 15 === 0) {
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
  expect(sawOpen).toBe(true);
  expect(sawOpeningAction).toBe(true);
  expect(state.objectOrders[0]?.phase).toBe("completed");
  expect(
    state.objects.items
      .filter(
        (item) =>
          item.kind === "materials" && item.location.kind !== "consumed",
      )
      .reduce((sum, item) => sum + item.quantity, 0),
  ).toBe(160);
});

it("rejects corrupt saved policies and refuses to close on a pawn or loose cargo", () => {
  const initial = createInitialState();
  const door = { x: 61, y: 55 };
  const index = door.y * 128 + door.x;
  for (const doorPolicies of [
    { [index]: "invalid" },
    { 0: "automatic" },
    { [index]: "held-closed" },
  ]) {
    const invalid = {
      ...initial,
      world: { ...initial.world, map: { ...initial.world.map, doorPolicies } },
    };
    expect(
      loadGameState({
        getItem: () => JSON.stringify(invalid),
        setItem: () => {},
      }).status,
    ).not.toBe("loaded");
  }
  const controller = createController({
    ...initial,
    world: {
      ...initial.world,
      positions: {
        ...initial.world.positions,
        [initial.personnel[0]!.id]: door,
      },
    },
  });
  expect(controller.setDoorOpen(door, false).game.world.map.tiles[index]).toBe(
    "door",
  );
  controller.replaceState({
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.map((item) =>
        item.id === "stock-materials"
          ? { ...item, location: { kind: "ground", position: door } }
          : item,
      ),
    },
  });
  expect(controller.setDoorOpen(door, false).game.world.map.tiles[index]).toBe(
    "door",
  );
});
