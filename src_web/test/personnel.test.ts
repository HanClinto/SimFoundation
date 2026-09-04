import { describe, expect, it } from "vitest";

import { deriveMood, deriveSanity } from "../src/simulation/personnel";
import { createInitialState } from "../src/simulation/state";
import { advanceSimulation } from "../src/simulation/tick";

describe("personnel simulation", () => {
  it("creates six serializable personnel with stable identities", () => {
    const state = createInitialState();

    expect(state.personnel).toHaveLength(6);
    expect(new Set(state.personnel.map(({ id }) => id)).size).toBe(6);
    expect(JSON.parse(JSON.stringify(state)).personnel).toEqual(
      state.personnel,
    );
  });

  it("advances needs and psychological pressure deterministically", () => {
    const first = advanceSimulation(createInitialState(42));
    const second = advanceSimulation(createInitialState(42));

    expect(first.personnel).toEqual(second.personnel);
    expect(first.personnel[0]).toMatchObject({
      stress: 18.008,
      fear: 5.99,
      needs: { satiety: 81.965, rest: 75.98, recreation: 63.975 },
    });
  });

  it("derives explainable mood and sanity without storing duplicates", () => {
    const person = createInitialState().personnel[0];
    if (!person) throw new Error("starting person missing");

    expect("mood" in person).toBe(false);
    expect("sanity" in person).toBe(false);
    expect(deriveMood(person)).toEqual({
      score: 68,
      band: "stable",
      contributors: [
        "Recently fed",
        "Adequately rested",
        "Manageable workload",
      ],
    });
    expect(deriveSanity(person)).toEqual({
      score: 98,
      band: "strong",
      contributors: [
        "High mental resilience",
        "Stress within coping capacity",
        "No acute fear response",
      ],
    });
  });
});
