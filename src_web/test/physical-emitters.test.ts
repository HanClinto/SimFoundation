import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  advanceExposure,
  exposurePosition,
  exposureTiles,
  setExposureSource,
} from "../src/simulation/environment";
import {
  cancelObjectMove,
  orderObjectMove,
} from "../src/simulation/object-work";
import { surfaceAt } from "../src/simulation/materials";
import { advanceSimulation } from "../src/simulation/tick";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { exposureMapPosition } from "../src/adapters/browser/map-objects";
import { pawnCues } from "../src/adapters/browser/pawn-cues";

const policy = {
  name: "Emitting object",
  position: { x: 1, y: 1 },
  objectId: "spare-break-seat",
  kind: "corrosion" as const,
  dose: 0.1,
  radius: 1,
  enabled: true,
};

it("follows an individual object through physical pickup, carrier movement, and installation", () => {
  const initial = createInitialState();
  const bound = setExposureSource(initial, policy);
  expect(bound.code).toBe("accepted");
  const source = bound.state.environment.sources[0]!;
  expect(source.position).toEqual({ x: 67, y: 66 });
  let state = orderObjectMove(
    bound.state,
    policy.objectId,
    { x: 54, y: 59 },
    "north",
    true,
  ).state;
  let carried = false;
  for (
    let tick = 0;
    tick < 180 && state.objectOrders[0]!.phase !== "completed";
    tick += 1
  ) {
    state = advanceSimulation(state);
    if (tick % 10 === 0) {
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
    const object = state.objects.items.find(
      (item) => item.id === policy.objectId,
    )!;
    if (object.location.kind === "carried") {
      carried = true;
      expect(exposurePosition(state, source)).toEqual(
        state.world.positions[object.location.personId],
      );
      expect(exposureTiles(state, source)).toContainEqual(
        state.world.positions[object.location.personId],
      );
      if (
        state.personnel.find(
          (person) =>
            object.location.kind === "carried" &&
            person.id === object.location.personId,
        )?.activity !== "Opening door"
      )
        expect(
          pawnCues(state, object.location.personId, "world")[0]?.label,
        ).toContain("Carrying emitting");
    }
  }
  expect(carried).toBe(true);
  expect(state.objectOrders[0]!.phase).toBe("completed");
  expect(exposurePosition(state, source)).toEqual({ x: 54, y: 59 });
  expect(state.environment.sources).toHaveLength(1);
  state = orderObjectMove(
    state,
    policy.objectId,
    { x: 54, y: 59 },
    "north",
    false,
  ).state;
  for (
    let tick = 0;
    tick < 100 && state.objectOrders.at(-1)!.phase !== "completed";
    tick += 1
  )
    state = advanceSimulation(state);
  expect(
    state.objects.items.find((item) => item.id === policy.objectId)?.installed,
  ).toBe(false);
  expect(exposurePosition(state, source)).toEqual({ x: 54, y: 59 });
  expect(exposureTiles(state, source).length).toBeGreaterThan(0);
  state = orderObjectMove(
    state,
    policy.objectId,
    { x: 55, y: 59 },
    "north",
    true,
  ).state;
  state = cancelObjectMove(state, state.objectOrders.at(-1)!.id);
  expect(state.environment.sources).toHaveLength(1);
  expect(exposurePosition(state, source)).toEqual({ x: 54, y: 59 });
  expect(initial.environment.sources).toEqual([]);
});

it("applies damage at the host's current position without damaging floors or leaving a phantom source behind", () => {
  const initial = createInitialState();
  const placed = {
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.map((item) =>
        item.id === policy.objectId
          ? {
              ...item,
              location: { kind: "ground" as const, position: { x: 60, y: 54 } },
            }
          : item,
      ),
    },
  };
  const bound = setExposureSource(placed, { ...policy, dose: 20 }).state;
  const moved = {
    ...bound,
    objects: {
      ...bound.objects,
      items: bound.objects.items.map((item) =>
        item.id === policy.objectId
          ? {
              ...item,
              location: { kind: "ground" as const, position: { x: 50, y: 54 } },
            }
          : item,
      ),
    },
  };
  const damaged = advanceExposure(moved);
  expect(
    surfaceAt(damaged.world.map, { x: 49, y: 54 }, "structure")!.integrity,
  ).toBeLessThan(100);
  expect(
    surfaceAt(damaged.world.map, { x: 61, y: 54 }, "structure")!.integrity,
  ).toBe(100);
  for (const [index, cell] of Object.entries(initial.world.map.surfaces))
    expect(damaged.world.map.surfaces[Number(index)]!.floor).toEqual(
      cell.floor,
    );
  const disabled = setExposureSource(
    moved,
    { ...policy, dose: 20, enabled: false },
    moved.environment.sources[0]!.id,
  ).state;
  expect(advanceExposure(disabled)).toBe(disabled);
});

it("rejects invalid attachment saves and hides unobserved object movement", () => {
  const state = setExposureSource(createInitialState(), policy).state;
  const source = state.environment.sources[0]!;
  const observed = exposureMapPosition(state, source, "recorded");
  const moved = {
    ...state,
    objects: {
      ...state.objects,
      items: state.objects.items.map((item) =>
        item.id === policy.objectId
          ? {
              ...item,
              location: {
                kind: "ground" as const,
                position: { x: 100, y: 100 },
              },
            }
          : item,
      ),
    },
  };
  expect(exposureMapPosition(moved, source, "world")).toEqual({
    x: 100,
    y: 100,
  });
  expect(exposureMapPosition(moved, source, "recorded")).toEqual(observed);
  expect(
    exposureMapPosition(
      { ...moved, observations: { ...moved.observations, objects: {} } },
      source,
      "recorded",
    ),
  ).toBeNull();
  for (const objectId of ["missing", "stock-materials", 42, ""]) {
    const invalid = {
      ...state,
      environment: { ...state.environment, sources: [{ ...source, objectId }] },
    };
    expect(
      loadGameState({
        getItem: () => JSON.stringify(invalid),
        setItem: () => {},
      }).status,
    ).toBe("invalid");
  }
});

it("rejects split/merge supplies and missing objects, and has no fallback emission for absent hosts", () => {
  const state = createInitialState();
  for (const objectId of ["stock-materials", "pantry-meals", "missing", ""])
    expect(setExposureSource(state, { ...policy, objectId }).code).toBe(
      "invalid-source",
    );
  const bound = setExposureSource(state, policy).state;
  const absent = {
    ...bound,
    objects: {
      ...bound.objects,
      items: bound.objects.items.filter((item) => item.id !== policy.objectId),
    },
  };
  expect(exposurePosition(absent, bound.environment.sources[0]!)).toBeNull();
  expect(exposureTiles(absent, bound.environment.sources[0]!)).toEqual([]);
});
