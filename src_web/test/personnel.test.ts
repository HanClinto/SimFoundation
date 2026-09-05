import { describe, expect, it } from "vitest";

import {
  assessPhysicalHealth,
  deriveMood,
  derivePhysicalHealth,
  deriveSanity,
  latestPhysicalAssessment,
  analyzeAnomalousTraitEvidence,
  assessAnomalousTraits,
  projectTraits,
  assessWorkPreferences,
  projectBiases,
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
        recordedOrder: 1,
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
      jon = assessPhysicalHealth(jon, tick * 30);
    }

    expect(jon.physicalAssessments).toHaveLength(50);
    expect(jon.physicalAssessments[0]?.assessedTick).toBe(300);
    expect(jon.physicalAssessments.at(-1)?.assessedTick).toBe(1770);
  });

  it("keeps anomalous Traits hidden until evidence analysis and assessment", () => {
    const emil = createInitialState().personnel.find(
      ({ id }) => id === "person-emil-novak",
    );
    if (!emil) throw new Error("Emil Novak missing");

    expect(projectTraits(emil)).toEqual([
      {
        traitId: "resourceful",
        label: "Resourceful",
        status: "disclosed",
        confidence: 1,
      },
    ]);

    const analyzed = analyzeAnomalousTraitEvidence(emil, 12);
    expect(projectTraits(analyzed)).toContainEqual({
      traitId: "psychic-sensitivity",
      label: "Psychically Attuned",
      status: "suspected",
      confidence: 0.62,
    });

    const assessed = assessAnomalousTraits(analyzed, 18);
    expect(projectTraits(assessed)).toContainEqual({
      traitId: "psychic-sensitivity",
      label: "Psychically Attuned",
      status: "confirmed",
      confidence: 0.9,
    });
    expect(assessed.traits["psychic-sensitivity"]?.parameters).toEqual({
      sensitivity: 2,
    });

    const reanalyzed = analyzeAnomalousTraitEvidence(assessed, 24);
    const reassessed = assessAnomalousTraits(reanalyzed, 30);
    expect(reanalyzed.traitAssessments).toHaveLength(2);
    expect(reassessed.traitAssessments).toHaveLength(2);
    expect(projectTraits(reassessed)).toContainEqual({
      traitId: "psychic-sensitivity",
      label: "Psychically Attuned",
      status: "confirmed",
      confidence: 0.9,
    });
  });

  it("projects work preferences as named ranges rather than exact Biases", () => {
    const mara = createInitialState().personnel.find(
      ({ id }) => id === "person-mara-voss",
    );
    if (!mara) throw new Error("Mara Voss missing");

    expect(mara.biases).toEqual({ mindMight: -2, receptiveResolute: -1 });
    expect(projectBiases(mara)).toBeNull();

    const assessed = assessWorkPreferences(mara, 40);
    expect(projectBiases(assessed)).toEqual({
      mindMight: { label: "Mind", estimate: { minimum: -3, maximum: -1 } },
      receptiveResolute: {
        label: "Receptive",
        estimate: { minimum: -2, maximum: 0 },
      },
      confidence: 0.8,
      assessedTick: 40,
    });
    expect(assessWorkPreferences(assessed, 50).biasAssessments).toHaveLength(1);
  });

  it.each([
    {
      biases: { mindMight: 0, receptiveResolute: 0 },
      mindMight: { label: "Balanced", minimum: -1, maximum: 1 },
      receptiveResolute: { label: "Balanced", minimum: -1, maximum: 1 },
    },
    {
      biases: { mindMight: -3, receptiveResolute: 3 },
      mindMight: { label: "Mind", minimum: -3, maximum: -2 },
      receptiveResolute: { label: "Resolute", minimum: 2, maximum: 3 },
    },
  ])("labels and clamps Bias assessment boundaries", (testCase) => {
    const basePerson = createInitialState().personnel[0];
    if (!basePerson) throw new Error("starting person missing");
    const projection = projectBiases(
      assessWorkPreferences({ ...basePerson, biases: testCase.biases }, 40),
    );

    expect(projection?.mindMight).toEqual({
      label: testCase.mindMight.label,
      estimate: {
        minimum: testCase.mindMight.minimum,
        maximum: testCase.mindMight.maximum,
      },
    });
    expect(projection?.receptiveResolute).toEqual({
      label: testCase.receptiveResolute.label,
      estimate: {
        minimum: testCase.receptiveResolute.minimum,
        maximum: testCase.receptiveResolute.maximum,
      },
    });
  });
});
