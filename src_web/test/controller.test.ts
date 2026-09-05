import { describe, expect, it, vi } from "vitest";

import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";

describe("game controller", () => {
  it("loads and advances without browser globals", () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");

    const controller = createController(createInitialState(42));
    const snapshot = controller.advance(3);

    expect(snapshot.game).toMatchObject({
      seed: 42,
      tick: 3,
      gameMinute: 483,
    });
  });

  it("does not advance while paused", () => {
    const controller = createController(createInitialState());
    const personnelBeforePause = controller.getSnapshot().game.personnel;

    controller.setRunning(false);
    controller.advance(10);

    expect(controller.getSnapshot()).toMatchObject({
      running: false,
      game: { tick: 0, gameMinute: 480 },
    });
    expect(controller.getSnapshot().game.personnel).toEqual(
      personnelBeforePause,
    );
  });

  it("publishes detached snapshots after state changes", () => {
    const controller = createController(createInitialState());
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    const snapshot = controller.advance();
    unsubscribe();
    controller.advance();

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(snapshot);
    expect(snapshot).not.toBe(controller.getSnapshot());
    expect(snapshot.game).not.toBe(controller.getSnapshot().game);
  });

  it("rejects invalid tick counts", () => {
    const controller = createController(createInitialState());

    expect(() => controller.advance(0)).toThrow(RangeError);
    expect(() => controller.advance(1.5)).toThrow(RangeError);
  });

  it("orders a physical assessment without changing authoritative injuries", () => {
    const controller = createController(createInitialState());
    const before = controller
      .getSnapshot()
      .game.personnel.find(({ id }) => id === "person-jon-bell");
    const queued = controller.orderPhysicalAssessment("person-jon-bell");
    expect(
      queued.game.personnel.find(({ id }) => id === "person-jon-bell")
        ?.physicalAssessments,
    ).toHaveLength(0);
    controller.orderPhysicalAssessment("person-jon-bell");
    for (
      let tick = 0;
      tick < 100 &&
      controller
        .getSnapshot()
        .game.jobs.some((job) => job.assessment && job.status !== "completed");
      tick += 1
    )
      controller.advance();
    const after = controller
      .getSnapshot()
      .game.personnel.find(({ id }) => id === "person-jon-bell");

    expect(before?.physicalAssessments).toHaveLength(0);
    expect(after?.effects.filter(({ kind }) => kind === "injury")).toEqual(
      before?.effects.filter(({ kind }) => kind === "injury"),
    );
    expect(after?.physicalAssessments).toHaveLength(1);
    expect(
      controller
        .orderPhysicalAssessment("person-jon-bell")
        .game.personnel.find(({ id }) => id === "person-jon-bell")
        ?.physicalAssessments,
    ).toHaveLength(1);
    expect(() => controller.orderPhysicalAssessment("missing-person")).toThrow(
      "Unknown person: missing-person",
    );
  });

  it("unlocks anomalous evidence analysis before targeted screening", () => {
    const controller = createController(createInitialState());

    expect(() =>
      controller.orderAnomalousAssessment("person-emil-novak"),
    ).toThrow("Anomalous Psychometrics has not been unlocked");

    const unlocked = controller.unlockAnomalousPsychometrics();
    const analyzedEmil = unlocked.game.personnel.find(
      ({ id }) => id === "person-emil-novak",
    );
    const analyzedMara = unlocked.game.personnel.find(
      ({ id }) => id === "person-mara-voss",
    );
    expect(unlocked.game.capabilities.anomalousPsychometrics).toBe(true);
    expect(analyzedEmil?.traitAssessments.at(-1)?.conclusions[0]?.status).toBe(
      "suspected",
    );
    expect(analyzedMara?.traitAssessments).toHaveLength(0);

    const unlockedAgain = controller.unlockAnomalousPsychometrics();
    expect(
      unlockedAgain.game.personnel.find(({ id }) => id === "person-emil-novak")
        ?.traitAssessments,
    ).toHaveLength(1);

    controller.orderAnomalousAssessment("person-emil-novak");
    for (
      let tick = 0;
      tick < 100 &&
      controller
        .getSnapshot()
        .game.jobs.some((job) => job.assessment && job.status !== "completed");
      tick += 1
    )
      controller.advance();
    const screened = controller.getSnapshot();
    const screenedEmil = screened.game.personnel.find(
      ({ id }) => id === "person-emil-novak",
    );
    expect(screenedEmil?.traitAssessments.at(-1)?.conclusions[0]?.status).toBe(
      "confirmed",
    );
    expect(
      controller
        .orderAnomalousAssessment("person-emil-novak")
        .game.personnel.find(({ id }) => id === "person-emil-novak")
        ?.traitAssessments,
    ).toHaveLength(2);
  });

  it("orders a bounded work-preference evaluation", () => {
    const controller = createController(createInitialState());
    controller.orderWorkPreferenceAssessment("person-mara-voss");
    for (
      let tick = 0;
      tick < 100 &&
      controller
        .getSnapshot()
        .game.jobs.some((job) => job.assessment && job.status !== "completed");
      tick += 1
    )
      controller.advance();
    const assessed = controller.getSnapshot();
    const mara = assessed.game.personnel.find(
      ({ id }) => id === "person-mara-voss",
    );

    expect(mara?.biasAssessments).toHaveLength(1);
    expect(mara?.biasAssessments[0]?.estimates.mindMight).toEqual({
      minimum: -3,
      maximum: -1,
    });
    expect(
      controller
        .orderWorkPreferenceAssessment("person-mara-voss")
        .game.personnel.find(({ id }) => id === "person-mara-voss")
        ?.biasAssessments,
    ).toHaveLength(1);
  });

  it("orders a bounded psychological evaluation", () => {
    const controller = createController(createInitialState());
    controller.orderPsychologicalAssessment("person-mara-voss");
    for (
      let tick = 0;
      tick < 100 &&
      controller
        .getSnapshot()
        .game.jobs.some((job) => job.assessment && job.status !== "completed");
      tick += 1
    )
      controller.advance();
    const assessed = controller.getSnapshot();
    const mara = assessed.game.personnel.find(
      ({ id }) => id === "person-mara-voss",
    );

    expect(mara?.psychologicalAssessments).toHaveLength(1);
    expect(mara?.psychologicalAssessments[0]?.assessor).toBe("Priya Shah");
    expect(
      mara?.psychologicalAssessments[0]?.moodEstimate.maximum,
    ).toBeGreaterThan(
      mara?.psychologicalAssessments[0]?.moodEstimate.minimum ?? 100,
    );
    expect(
      controller
        .orderPsychologicalAssessment("person-mara-voss")
        .game.personnel.find(({ id }) => id === "person-mara-voss")
        ?.psychologicalAssessments,
    ).toHaveLength(1);
    expect(() =>
      controller.orderPsychologicalAssessment("missing-person"),
    ).toThrow("Unknown person: missing-person");
  });
});
