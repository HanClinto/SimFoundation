import { describe, expect, it } from "vitest";

import {
  assessPhysicalHealth,
  deriveMood,
  derivePhysicalHealth,
  deriveSanity,
  latestPhysicalAssessment,
} from "../src/simulation/personnel";
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
      needs: { satiety: 81.965, rest: 75.98 },
    });
    expect(first.personnel[5]?.stress).toBe(30.96);
    expect(first.personnel[0]?.stress).toBeGreaterThan(18);
  });

  it("derives explainable mood and sanity without storing duplicates", () => {
    const person = createInitialState().personnel[0];
    if (!person) throw new Error("starting person missing");

    expect("mood" in person).toBe(false);
    expect("sanity" in person).toBe(false);
    expect(deriveMood(person)).toEqual({
      score: 78,
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

  it("serializes fixed equipment slots and carried inventory", () => {
    const [mara, caleb] = createInitialState().personnel;

    expect(mara?.equipment.body?.name).toBe("Research Lab Coat");
    expect(mara?.equipment.head).toBeNull();
    expect(mara?.inventory.map(({ name }) => name)).toEqual([
      "Bound Research Notes",
      "Coffee Thermos",
    ]);
    expect(caleb?.equipment.head?.name).toBe("Utility Hard Hat");
    expect(JSON.parse(JSON.stringify(mara))).toEqual(mara);
  });

  it("keeps a localized injury hidden until physical assessment", () => {
    const jon = createInitialState().personnel.find(
      ({ id }) => id === "person-jon-bell",
    );
    if (!jon) throw new Error("Jon Bell missing");

    expect(derivePhysicalHealth(jon)).toBe(91);
    expect(latestPhysicalAssessment(jon)).toBeNull();

    const assessedJon = assessPhysicalHealth(jon, 42);
    expect(assessedJon.effects).toEqual(jon.effects);
    expect(latestPhysicalAssessment(assessedJon)).toMatchObject({
      assessedTick: 42,
      estimate: { minimum: 89, maximum: 93 },
      conclusions: [
        {
          label: "Sprained left ankle",
          status: "confirmed",
          bodyRegions: ["leftFoot"],
        },
      ],
    });
  });

  it("records an obvious sign without disclosing diagnosis or severity", () => {
    const lena = createInitialState().personnel.find(
      ({ id }) => id === "person-lena-ortiz",
    );
    if (!lena) throw new Error("Lena Ortiz missing");

    expect(lena.physicalObservations).toEqual([
      {
        id: "observation-profuse-bleeding-lena",
        observedTick: 0,
        source: "Supervisor report",
        label: "Profuse bleeding observed",
        bodyRegions: ["rightArm"],
      },
    ]);
    expect(latestPhysicalAssessment(lena)).toBeNull();

    const assessedLena = assessPhysicalHealth(lena, 12);
    expect(latestPhysicalAssessment(assessedLena)?.conclusions).toMatchObject([
      {
        label: "Deep right forearm laceration",
        status: "confirmed",
      },
    ]);
  });

  it("deduplicates same-tick examinations and retains bounded history", () => {
    const initialJon = createInitialState().personnel.find(
      ({ id }) => id === "person-jon-bell",
    );
    if (!initialJon) throw new Error("Jon Bell missing");

    let jon = assessPhysicalHealth(initialJon, 0);
    jon = assessPhysicalHealth(jon, 0);
    for (let tick = 1; tick < 60; tick += 1) {
      jon = assessPhysicalHealth(jon, tick);
    }

    expect(jon.physicalAssessments).toHaveLength(50);
    expect(jon.physicalAssessments[0]?.assessedTick).toBe(10);
    expect(jon.physicalAssessments.at(-1)?.assessedTick).toBe(59);
  });
});
