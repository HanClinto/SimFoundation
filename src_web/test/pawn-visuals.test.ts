import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation_legacy/state";
import {
  createPawnVisuals,
  physicalPawnPose,
} from "../src/adapters/browser_legacy/pawn-visuals";

const initial = createInitialState();
const id = initial.personnel[0]!.id;
const at = (tick: number, x: number, y = 60) => ({
  ...initial,
  tick,
  world: { ...initial.world, positions: { [id]: { x, y } } },
});

it("smooths only adjacent observed steps and freezes at the same visual time", () => {
  const visuals = createPawnVisuals();
  visuals(at(0, 60), "world", 0, true);
  expect(visuals(at(1, 61), "world", 500, true)[id]!.position.x).toBe(60);
  const middle = visuals(at(1, 61), "world", 700, true)[id]!;
  expect(middle.position.x).toBe(60.5);
  expect(middle.pose).toMatch(/^walk-/);
  expect(visuals(at(1, 61), "world", 700, false)[id]).toEqual(middle);
  expect(visuals(at(1, 61), "world", 900, true)[id]!.position.x).toBe(61);
  expect(visuals(at(2, 70), "world", 1000, true)[id]!.position.x).toBe(70);
  expect(visuals(at(3, 71), "world", 1500, true, true)[id]!.position.x).toBe(
    71,
  );
  expect(visuals(at(0, 60), "world", 0, false)[id]!.position.x).toBe(60);
});

it("uses actual station occupancy for sleeping and sitting rather than routine intent", () => {
  const station = initial.routines.stations.find(
    (station) => station.kind === "sleep",
  )!;
  const state = {
    ...initial,
    routines: {
      ...initial.routines,
      activities: {
        [id]: {
          kind: "sleep" as const,
          stationId: station.id,
          progress: 1,
          mealObjectId: null,
          startedTick: 0,
          mealConsumed: false,
        },
      },
    },
  };
  expect(
    physicalPawnPose(
      {
        ...state,
        world: { ...state.world, positions: { [id]: { x: 0, y: 0 } } },
      },
      id,
      "world",
    ),
  ).toBe("stand");
  const seated = {
    ...state,
    world: { ...state.world, positions: { [id]: station.position } },
  };
  expect(physicalPawnPose(seated, id, "world")).toBe("sleep");
  expect(
    physicalPawnPose(
      {
        ...seated,
        routines: {
          ...seated.routines,
          activities: {
            [id]: { ...seated.routines.activities[id]!, kind: "break" },
          },
        },
      },
      id,
      "world",
    ),
  ).toBe("sit");
});

it("does not reveal hidden posture, cargo, or motion in Recorded view", () => {
  const state = at(1, 61);
  const knowledge = {
    ...state.observations,
    visibleEntityIds: [],
    entities: {
      ...state.observations.entities,
      [id]: {
        ...state.observations.entities[id]!,
        position: { x: 60, y: 60 },
        observedTick: 0,
        activity: "Sleeping",
      },
    },
  };
  const hidden = {
    ...state,
    observations: knowledge,
    objects: {
      ...state.objects,
      items: state.objects.items.map((item) =>
        item.id === "stock-meals"
          ? { ...item, location: { kind: "carried" as const, personId: id } }
          : item,
      ),
    },
  };
  const visuals = createPawnVisuals();
  const result = visuals(hidden, "recorded", 500, true)[id]!;
  expect(result.position).toEqual({ x: 60, y: 60 });
  expect(result.pose).toBe("stand");
  expect(result.cargo).toBeNull();
  expect(visuals(hidden, "recorded", 750, true)[id]).toEqual(result);
  expect(
    physicalPawnPose(
      { ...hidden, observations: { ...knowledge, visibleEntityIds: [id] } },
      id,
      "recorded",
    ),
  ).toBe("sleep");
});
