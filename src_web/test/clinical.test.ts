import { describe, expect, it } from "vitest";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import { loadGameState } from "../src/adapters/browser/game-persistence";

describe("clinical work", () => {
  it("releases both participants when medical duty is withdrawn and resumes without duplicate reports", () => {
    const controller = createController(createInitialState());
    controller.orderPhysicalAssessment("person-lena-ortiz");
    controller.advance(3);
    controller.setClinicalCarePolicy({ reviewInterval: 0, clinicianIds: [] });
    const interrupted = controller.advance().game;
    expect(
      interrupted.jobs.find(({ assessment }) => assessment)?.assignedPersonId,
    ).toBeNull();
    expect(
      interrupted.personnel
        .filter(
          ({ id }) => id === "person-lena-ortiz" || id === "person-priya-shah",
        )
        .every(({ currentJobId }) => currentJobId === null),
    ).toBe(true);
    expect(
      interrupted.personnel.find(({ id }) => id === "person-lena-ortiz")
        ?.physicalAssessments,
    ).toHaveLength(0);
    controller.setClinicalCarePolicy({
      reviewInterval: 0,
      clinicianIds: ["person-priya-shah"],
    });
    const resumed = controller.advance(100).game;
    expect(
      resumed.personnel.find(({ id }) => id === "person-lena-ortiz")
        ?.physicalAssessments,
    ).toHaveLength(1);
  });

  it("cannot perform a remote examination when the medical bay is inaccessible", () => {
    const initial = createInitialState();
    const tiles = [...initial.world.map.tiles];
    tiles[73 * initial.world.map.width + 61] = "wall";
    const controller = createController({
      ...initial,
      world: { ...initial.world, map: { ...initial.world.map, tiles } },
    });
    controller.orderPhysicalAssessment("person-lena-ortiz");
    const state = controller.advance(20).game;
    expect(
      state.personnel.find(({ id }) => id === "person-lena-ortiz")
        ?.physicalAssessments,
    ).toHaveLength(0);
    expect(state.jobs.find(({ assessment }) => assessment)?.progress).toBe(0);
    expect(
      state.personnel.every(({ currentJobId }) => currentJobId === null),
    ).toBe(true);
  });

  it("discovers recurring reviews without duplicates and uses assigned clinical staff", () => {
    const controller = createController(createInitialState());
    controller.setClinicalCarePolicy({
      reviewInterval: 240,
      clinicianIds: ["person-priya-shah", "person-mara-voss"],
    });
    expect(
      controller.advance().game.jobs.filter(({ assessment }) => assessment),
    ).toHaveLength(6);
    expect(
      controller.advance().game.jobs.filter(({ assessment }) => assessment),
    ).toHaveLength(6);
    const completed = controller.advance(220).game;
    expect(
      completed.personnel.every(
        (person) => person.physicalAssessments.length === 1,
      ),
    ).toBe(true);
    expect(
      completed.personnel.find(({ id }) => id === "person-priya-shah")
        ?.physicalAssessments[0]?.assessor,
    ).toBe("Dr. Mara Voss");
    const later = controller.advance(240).game;
    expect(
      later.personnel.some((person) => person.physicalAssessments.length > 1),
    ).toBe(true);
    const untrained = controller.setClinicalCarePolicy({
      reviewInterval: 240,
      clinicianIds: ["person-caleb-ward"],
    });
    expect(untrained.game.clinicalCare.clinicianIds).toEqual([
      "person-caleb-ward",
    ]);
    expect(
      loadGameState({
        getItem: () => JSON.stringify(untrained.game),
        setItem: () => {},
      }).status,
    ).toBe("loaded");
    expect(() =>
      controller.setClinicalCarePolicy({
        reviewInterval: 240,
        clinicianIds: ["missing-person"],
      }),
    ).toThrow("Invalid clinical care policy");
  });
  it("round-trips clinician and patient reservations and rejects invalid clinical records", () => {
    const original = createController(createInitialState());
    original.orderPhysicalAssessment("person-lena-ortiz");
    const state = original.advance(4).game;
    const loaded = loadGameState({
      getItem: () => JSON.stringify(state),
      setItem: () => {},
    });
    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") throw new Error("clinical save rejected");
    expect(createController(loaded.state).advance(70).game).toEqual(
      original.advance(70).game,
    );
    for (const assessment of [
      { patientId: "missing", kind: "physical" },
      { patientId: "person-lena-ortiz", kind: "invalid" },
    ]) {
      const invalid = {
        ...state,
        jobs: state.jobs.map((job) =>
          job.assessment ? { ...job, assessment } : job,
        ),
      };
      expect(
        loadGameState({
          getItem: () => JSON.stringify(invalid),
          setItem: () => {},
        }).status,
      ).toBe("invalid");
    }
  });
  it("requires a medic and patient to attend before producing a report", () => {
    const controller = createController(createInitialState());
    const scheduled = controller.orderPhysicalAssessment("person-lena-ortiz");
    expect(
      scheduled.game.personnel.find(({ id }) => id === "person-lena-ortiz")
        ?.physicalAssessments,
    ).toHaveLength(0);
    expect(
      controller
        .orderPhysicalAssessment("person-lena-ortiz")
        .game.jobs.filter(({ assessment }) => assessment),
    ).toHaveLength(1);
    controller.advance();
    const travelling = controller.getSnapshot().game;
    const clinical = travelling.jobs.find(({ assessment }) => assessment)!;
    expect(clinical.assignedPersonId).toBe("person-priya-shah");
    expect(clinical.progress).toBe(0);
    for (
      let tick = 0;
      tick < 100 &&
      controller.getSnapshot().game.jobs.find(({ id }) => id === clinical.id)
        ?.status !== "completed";
      tick += 1
    )
      controller.advance();
    const completed = controller.getSnapshot().game;
    const patient = completed.personnel.find(
      ({ id }) => id === "person-lena-ortiz",
    )!;
    expect(patient.physicalAssessments).toHaveLength(1);
    expect(patient.physicalAssessments[0]?.assessor).toBe("Priya Shah");
    expect(patient.effects).toEqual(
      scheduled.game.personnel.find(({ id }) => id === patient.id)?.effects,
    );
    expect(completed.world.positions[patient.id]).toEqual(clinical.workSite);
    expect(completed.world.positions[clinical.assignedPersonId!]).toEqual(
      clinical.workSite,
    );
  });
  it("cannot self-assess or generate reports without qualified available staff", () => {
    const initial = createInitialState();
    const controller = createController({
      ...initial,
      personnel: initial.personnel.map((person) =>
        person.id === "person-priya-shah" ? person : { ...person, skills: [] },
      ),
    });
    controller.orderPhysicalAssessment("person-priya-shah");
    expect(
      controller
        .advance(40)
        .game.personnel.find(({ id }) => id === "person-priya-shah")
        ?.physicalAssessments,
    ).toHaveLength(0);
  });
});
