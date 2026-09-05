import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  completeAssessment,
  discoverClinicalWork,
  setClinicalCarePolicy,
  ASSESSMENT_REQUIREMENTS,
} from "../src/simulation/clinical";
import { createController } from "../src/application/controller";
import { loadGameState } from "../src/adapters/browser/game-persistence";

describe("parallel clinical surveys", () => {
  it("lets untrained assigned staff perform mood screening but not psychiatric evaluation", () => {
    const controller = createController(createInitialState());
    controller.setClinicalCarePolicy({
      reviewInterval: 0,
      clinicianIds: ["person-caleb-ward"],
    });
    controller.orderMoodScreening("person-lena-ortiz");
    controller.orderPsychologicalAssessment("person-lena-ortiz");
    const state = controller.advance(130).game;
    const patient = state.personnel.find(
      ({ id }) => id === "person-lena-ortiz",
    )!;
    expect(patient.clinicalSurveys).toHaveLength(1);
    expect(patient.clinicalSurveys[0]).toMatchObject({
      kind: "mood",
      confidence: 0.4,
      assessor: "Caleb Ward",
    });
    expect(patient.psychologicalAssessments).toHaveLength(0);
    expect(
      state.jobs.find(({ assessment }) => assessment?.kind === "psychological")
        ?.assignmentReason,
    ).toContain("Medical 5+");
    expect(
      loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} })
        .status,
    ).toBe("loaded");
  });
  it("rejects corrupted survey cadences and reports", () => {
    const state = createInitialState();
    const invalid = [
      {
        ...state,
        clinicalCare: { ...state.clinicalCare, moodReviewInterval: "often" },
      },
      {
        ...state,
        personnel: state.personnel.map((person) => ({
          ...person,
          clinicalSurveys: [{ kind: "mood" }],
        })),
      },
    ];
    for (const save of invalid)
      expect(
        loadGameState({
          getItem: () => JSON.stringify(save),
          setItem: () => {},
        }).status,
      ).toBe("invalid");
  });
  it("discovers independently scheduled reviews and gates anomalous procedures", () => {
    const state = setClinicalCarePolicy(createInitialState(), {
      reviewInterval: 240,
      moodReviewInterval: 240,
      psychiatricReviewInterval: 480,
      anomalousReviewInterval: 1440,
      clinicianIds: [],
    });
    expect(
      discoverClinicalWork(state).jobs.filter(({ assessment }) => assessment),
    ).toHaveLength(18);
    const unlocked = {
      ...state,
      capabilities: { anomalousPsychometrics: true },
    };
    const discovered = discoverClinicalWork(unlocked);
    expect(discovered.jobs.filter(({ assessment }) => assessment)).toHaveLength(
      24,
    );
    expect(discoverClinicalWork(discovered).jobs).toHaveLength(
      discovered.jobs.length,
    );
    expect(ASSESSMENT_REQUIREMENTS.mood.work).toBeLessThan(
      ASSESSMENT_REQUIREMENTS.psychological.work,
    );
    expect(ASSESSMENT_REQUIREMENTS.psychological.work).toBeLessThan(
      ASSESSMENT_REQUIREMENTS.anomalous.work,
    );
  });
  it("records coarse mood evidence without creating a psychiatric report", () => {
    const state = createInitialState();
    const person = state.personnel[0]!;
    const untrained = state.personnel[1]!;
    const screened = completeAssessment(person, "mood", 10, untrained);
    expect(screened.psychologicalAssessments).toHaveLength(0);
    expect(screened.clinicalSurveys[0]).toMatchObject({
      kind: "mood",
      confidence: 0.4,
      assessor: untrained.name,
    });
    expect(screened.clinicalSurveys[0]?.summary).toContain(
      "psychiatric condition not evaluated",
    );
  });
  it("records an anomalous survey even when no supported finding is available", () => {
    const state = createInitialState();
    const assessed = completeAssessment(
      state.personnel[0]!,
      "anomalous",
      20,
      state.personnel[2]!,
    );
    expect(assessed.clinicalSurveys[0]).toMatchObject({
      kind: "anomalous",
      moodEstimate: null,
    });
    expect(assessed.traitAssessments).toHaveLength(0);
  });
});
