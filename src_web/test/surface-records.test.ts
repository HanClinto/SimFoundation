import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  engineeringRecord,
  mapObjects,
} from "../src/adapters/browser/map-objects";
import { damageSurface } from "../src/simulation/materials";

describe("map inspection", () => {
  it("separates current world positions from recorded sightings without changing knowledge", () => {
    const initial = createInitialState();
    const position = { x: 100, y: 100 };
    const state = {
      ...initial,
      world: {
        ...initial.world,
        positions: { ...initial.world.positions, "person-mara-voss": position },
      },
    };
    expect(
      mapObjects(state, "world").find(
        (object) => object.id === "person-mara-voss",
      )?.position,
    ).toEqual(position);
    expect(
      mapObjects(state, "recorded").find(
        (object) => object.id === "person-mara-voss",
      )?.position,
    ).toEqual(initial.observations.entities["person-mara-voss"]?.position);
    expect(state.observations).toBe(initial.observations);
  });
  it("registers known sources and cameras and reports separate surface layers", () => {
    const initial = createInitialState();
    const state = {
      ...initial,
      environment: {
        ...initial.environment,
        sources: [
          {
            id: "test-source",
            name: "Test source",
            position: { x: 56, y: 55 },
            kind: "corrosion" as const,
            dose: 1,
            radius: 1,
          },
        ],
      },
    };
    expect(
      mapObjects(state).some((object) => object.id === "test-source"),
    ).toBe(true);
    expect(
      mapObjects(state).some((object) => object.id === "camera-laboratory"),
    ).toBe(true);
    expect(engineeringRecord(state, { x: 61, y: 54 })).toContainEqual([
      "Floor",
      "floor / Concrete / 100%",
    ]);
    expect(engineeringRecord(state, { x: 61, y: 54 })).toContainEqual([
      "Structure",
      "wall / Concrete / 100%",
    ]);
    expect(
      engineeringRecord(state, { x: 61, y: 54 }, "structure", "world"),
    ).toContainEqual(["Structure", "wall / Concrete / 100%"]);
    expect(
      engineeringRecord(state, { x: 61, y: 54 }, "structure", "world"),
    ).toContainEqual(["Observation", "Simulation state"]);
  });
  it("does not reveal unobserved damage or unsurveyed surfaces", () => {
    const initial = createInitialState();
    const state = {
      ...initial,
      world: {
        ...initial.world,
        map: damageSurface(
          initial.world.map,
          { x: 61, y: 54 },
          "structure",
          "impact",
          1000,
        ),
      },
    };
    expect(engineeringRecord(state, { x: 61, y: 54 })).toContainEqual([
      "Structure",
      "wall / Concrete / 100%",
    ]);
    expect(
      engineeringRecord(state, { x: 61, y: 54 }, "structure", "world"),
    ).toContainEqual(["Structure", "wall / Concrete / 0%"]);
    expect(engineeringRecord(state, { x: 100, y: 100 })).toEqual(
      expect.arrayContaining([["Recorded tile", "Unknown"]]),
    );
  });
});
