import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  deriveSanity,
  projectPsychology,
  assessPsychologicalState,
  projectTraits,
} from "../src/simulation/personnel";
import { advanceScp999 } from "../src/simulation/scp-999";

describe("outward expression and local social perception", () => {
  it("allows composed presentation despite hidden distress without revealing the trait", () => {
    const jon = createInitialState().personnel.find(
      ({ id }) => id === "person-jon-bell",
    )!;
    const distressed = {
      ...jon,
      stress: 100,
      fear: 100,
      needs: { satiety: 10, rest: 0 },
    };
    expect(deriveSanity(distressed).score).toBeLessThan(20);
    expect(projectPsychology(distressed).moodAppearance).toBe(
      "Smiles during conversation",
    );
    expect(
      projectTraits(distressed).some(
        ({ traitId }) => traitId === "emotional-expression",
      ),
    ).toBe(false);
    expect(
      assessPsychologicalState(distressed, 10).psychologicalAssessments[0]!
        .sanityEstimate.maximum,
    ).toBeLessThan(30);
  });
  it("does not search the entire facility for a distressed person", () => {
    const state = createInitialState();
    const people = state.personnel.map((person) => ({
      ...person,
      stress: person.id === "person-emil-novak" ? 100 : 0,
    }));
    const result = advanceScp999(state.scp999, people, 1, state.world);
    expect(result.anomaly.targetPersonId).toBeNull();
  });
  it("can greet a nearby content person without a stress threshold", () => {
    const state = createInitialState();
    const people = state.personnel.map((person) => ({ ...person, stress: 0 }));
    const world = {
      ...state.world,
      positions: {
        ...state.world.positions,
        "person-mara-voss": { x: 58, y: 66 },
      },
    };
    const result = advanceScp999(state.scp999, people, 1, world);
    expect(result.anomaly).toMatchObject({
      status: "comforting",
      targetPersonId: "person-mara-voss",
    });
    expect(
      result.personnel[0]?.effects.some(
        ({ id }) => id === "effect-comforted-by-999",
      ),
    ).toBe(true);
  });
});
