import { describe, expect, it } from "vitest";
import {
  mapObjects,
  engineeringRecord,
} from "../src/adapters/browser/map-objects";
import { createInitialState } from "../src/simulation/state";
import { TRIAL_LOCATION } from "../src/simulation/containment-trial";

describe("map inspection", () => {
  it("registers cameras and observed AN-001 at their rendered locations", () => {
    const state = createInitialState();
    expect(mapObjects(state).some(({ id }) => id === "camera-laboratory")).toBe(
      true,
    );
    const observed = {
      ...state,
      containmentTrial: {
        ...state.containmentTrial,
        lastReading: {
          phase: "ready" as const,
          material: "concrete" as const,
          protocol: "passive" as const,
          integrity: 74,
          elapsed: 1,
          observedTick: 0,
        },
      },
    };
    expect(
      mapObjects(observed).find(({ id }) => id === "AN-001")?.position,
    ).toEqual(TRIAL_LOCATION);
    expect(engineeringRecord(observed, TRIAL_LOCATION)).toContainEqual([
      "Recorded integrity",
      "74%",
    ]);
    expect(engineeringRecord(state, { x: 100, y: 100 })).toContainEqual([
      "Recorded tile",
      "Unknown",
    ]);
  });
});
