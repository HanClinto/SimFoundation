import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  engineeringRecord,
  mapObjects,
} from "../src/adapters/browser/map-objects";
import { damageSurface } from "../src/simulation/materials";

describe("map inspection", () => {
  it("registers known sources and cameras and reports separate surface layers", () => {
    const state = createInitialState();
    expect(mapObjects(state).some((object) => object.id === "AN-001")).toBe(
      true,
    );
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
    expect(engineeringRecord(state, { x: 100, y: 100 })).toEqual(
      expect.arrayContaining([["Recorded tile", "Unknown"]]),
    );
  });
});
