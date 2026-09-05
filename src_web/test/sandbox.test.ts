import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import { advanceSimulation } from "../src/simulation/tick";
import { orderSurfaceWork } from "../src/simulation/environment";
import { surfaceAt } from "../src/simulation/materials";

it("starts without scripted objectives or automatic exposure scenarios", () => {
  const state = createInitialState();
  expect(state.jobs).toEqual([]);
  expect(state.environment.sources).toEqual([]);
  expect(state).not.toHaveProperty("scp9620");
  expect(state.construction).not.toHaveProperty("researchLaboratoryId");
  expect(advanceSimulation(state).jobs).toEqual([]);
});

it("accepts physical work from world view without inventing an observation", () => {
  const initial = createInitialState();
  const position = { x: 61, y: 54 };
  const state = {
    ...initial,
    observations: { ...initial.observations, knownSurfaces: {} },
  };
  const result = orderSurfaceWork(state, position, "structure", "ceramic");
  expect(result.code).toBe("accepted");
  expect(result.state.observations.knownSurfaces).toEqual({});
  expect(
    surfaceAt(result.state.world.map, position, "structure")?.material,
  ).toBe("concrete");
});
