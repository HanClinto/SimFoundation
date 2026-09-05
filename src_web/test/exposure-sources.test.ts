import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  advanceExposure,
  exposureTiles,
  setExposureSource,
  removeExposureSource,
  discoverSurfaceWork,
} from "../src/simulation/environment";
import {
  damageSurface,
  setSurface,
  surfaceAt,
} from "../src/simulation/materials";
import { observeSite } from "../src/simulation/observations";
import { setDoorPolicy } from "../src/simulation/world";
import { createController } from "../src/application/controller";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { advanceSimulation } from "../src/simulation/tick";

const policy = {
  name: "Corrosive source",
  position: { x: 60, y: 54 },
  kind: "corrosion" as const,
  radius: 3,
  dose: 200,
  enabled: true,
};

it("previews without mutation and round-trips enabled source controls deterministically", () => {
  const controller = createController(createInitialState());
  expect(controller.previewExposureSource(policy)).toBeNull();
  expect(controller.getSnapshot().game.environment.sources).toEqual([]);
  const result = controller.setExposureSource({ ...policy, dose: 4 });
  expect(result.code).toBe("accepted");
  for (const enabled of [true, false]) {
    const state = controller.setExposureSource(
      { ...policy, dose: 4, enabled },
      result.snapshot.game.environment.sources[0]!.id,
    ).snapshot.game;
    const loaded = loadGameState({
      getItem: () => JSON.stringify(state),
      setItem: () => {},
    });
    expect(loaded.status).toBe("loaded");
    if (loaded.status === "loaded")
      expect(advanceSimulation(loaded.state)).toEqual(advanceSimulation(state));
    const invalid = {
      ...state,
      environment: {
        ...state.environment,
        sources: state.environment.sources.map((source) => ({
          ...source,
          enabled: "yes",
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
});

it("breaches horizontal barriers without damaging floor materials and disabling stops further exposure", () => {
  const initial = createInitialState();
  const result = setExposureSource(
    {
      ...initial,
      world: setDoorPolicy(initial.world, { x: 61, y: 55 }, "held-closed"),
    },
    policy,
  );
  expect(result.code).toBe("accepted");
  const source = result.state.environment.sources[0]!;
  expect(exposureTiles(result.state, source)).not.toContainEqual({
    x: 62,
    y: 54,
  });
  const damaged = advanceExposure(result.state);
  expect(
    surfaceAt(damaged.world.map, { x: 61, y: 54 }, "structure")?.integrity,
  ).toBe(0);
  expect(exposureTiles(damaged, source)).toContainEqual({ x: 62, y: 54 });
  for (const [index, cell] of Object.entries(initial.world.map.surfaces))
    expect(damaged.world.map.surfaces[Number(index)]?.floor).toEqual(
      cell.floor,
    );
  const disabled = setExposureSource(
    damaged,
    { ...policy, enabled: false },
    source.id,
  ).state;
  expect(exposureTiles(disabled, disabled.environment.sources[0]!)).toEqual([]);
  expect(advanceExposure(disabled)).toBe(disabled);
  expect(removeExposureSource(disabled, source.id).environment.sources).toEqual(
    [],
  );
  expect(initial.environment.sources).toEqual([]);
});

it("validates source policies and avoids ID collisions after removal without aliasing inputs", () => {
  const initial = createInitialState();
  for (const invalid of [
    { dose: NaN },
    { dose: -1 },
    { radius: 17 },
    { radius: 1.5 },
    { name: " " },
  ])
    expect(setExposureSource(initial, { ...policy, ...invalid }).code).toBe(
      "invalid-source",
    );
  expect(
    setExposureSource(initial, { ...policy, position: { x: 61, y: 54 } }).code,
  ).toBe("invalid-position");
  expect(setExposureSource(initial, policy, "missing").code).toBe("not-found");
  const draft = { ...policy, position: { ...policy.position } };
  let state = setExposureSource(initial, draft).state;
  draft.position.x = 0;
  expect(state.environment.sources[0]!.position.x).toBe(60);
  state = setExposureSource(state, policy).state;
  state = removeExposureSource(state, "exposure-1");
  state = setExposureSource(state, policy).state;
  expect(
    new Set(state.environment.sources.map((source) => source.id)).size,
  ).toBe(2);
  for (let count = state.environment.sources.length; count < 32; count += 1)
    state = setExposureSource(state, policy).state;
  expect(setExposureSource(state, policy).code).toBe("limit-reached");
});

it("automatic containment maintenance ignores floor damage", () => {
  const initial = createInitialState();
  const state = observeSite({
    ...initial,
    environment: { ...initial.environment, automaticRepairs: true },
    world: {
      ...initial.world,
      map: damageSurface(
        initial.world.map,
        { x: 56, y: 55 },
        "floor",
        "impact",
        10000,
      ),
    },
  });
  expect(discoverSurfaceWork(state).environment.orders).toEqual([]);
});

it("lets a generic source trigger observed barrier failure and physical maintenance recovery", () => {
  const initial = createInitialState();
  let state = setExposureSource(
    {
      ...initial,
      environment: { ...initial.environment, automaticRepairs: true },
    },
    { ...policy, radius: 1 },
  ).state;
  state = advanceSimulation(state);
  expect(state.incident.level).toBe("orange");
  expect(
    surfaceAt(state.world.map, { x: 61, y: 54 }, "structure")?.integrity,
  ).toBe(0);
  expect(state.environment.orders).toHaveLength(1);
  expect(state.environment.orders[0]).toMatchObject({
    layer: "structure",
    phase: "collecting",
    position: { x: 61, y: 54 },
  });
  expect(state.construction.availableMaterials).toBe(158);
  state = setExposureSource(
    state,
    { ...policy, radius: 1, enabled: false },
    state.environment.sources[0]!.id,
  ).state;
  const phases = new Set<string>();
  for (
    let tick = 0;
    tick < 220 && state.environment.orders[0]!.phase !== "completed";
    tick += 1
  ) {
    phases.add(state.environment.orders[0]!.phase);
    state = advanceSimulation(state);
    if (tick % 20 === 0) {
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
  expect(phases).toEqual(new Set(["collecting", "delivering", "fitting"]));
  expect(state.environment.orders[0]!.phase).toBe("completed");
  expect(
    surfaceAt(state.world.map, { x: 61, y: 54 }, "structure")?.integrity,
  ).toBe(100);
  expect(state.incident.level).toBe("green");
  expect(state.construction.availableMaterials).toBe(158);
  for (const [index, cell] of Object.entries(initial.world.map.surfaces))
    expect(state.world.map.surfaces[Number(index)]?.floor).toEqual(cell.floor);
});

it("can disable an existing source after construction blocks its tile", () => {
  let state = setExposureSource(createInitialState(), policy).state;
  state = {
    ...state,
    world: {
      ...state.world,
      map: setSurface(state.world.map, policy.position, "structure", {
        kind: "wall",
        material: "concrete",
        integrity: 100,
      }),
    },
  };
  expect(
    setExposureSource(
      state,
      { ...policy, enabled: false },
      state.environment.sources[0]!.id,
    ).code,
  ).toBe("accepted");
  expect(setExposureSource(state, policy).code).toBe("invalid-position");
});
