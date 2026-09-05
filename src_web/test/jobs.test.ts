import { describe, expect, it } from "vitest";

import { createController } from "../src/application/controller";
import {
  advanceJobs,
  authorizeJob,
  createStartingJobs,
  type SiteJob,
} from "../src/simulation/jobs";
import { createInitialState } from "../src/simulation/state";
import { advanceSimulation } from "../src/simulation/tick";

describe("site jobs", () => {
  it("authorizes and assigns calibration to the highest-skilled available researcher", () => {
    const controller = createController(createInitialState(42));

    expect(controller.getSnapshot().game.jobs[0]).toMatchObject({
      status: "proposed",
      assignedPersonId: null,
      progress: 0,
    });

    const authorized = controller.authorizeJob("job-calibrate-9620-sensors");
    expect(authorized.game.jobs[0]).toMatchObject({
      status: "available",
      authorizedTick: 0,
    });

    const advanced = controller.advance();
    expect(advanced.game.jobs[0]).toMatchObject({
      status: "in-progress",
      assignedPersonId: "person-mara-voss",
      progress: 8,
      assignmentReason:
        "Highest eligible official research level (8); additional suitability factors and stable ordering resolve ties.",
    });
    const mara = advanced.game.personnel.find(
      ({ id }) => id === "person-mara-voss",
    );
    expect(mara?.currentJobId).toBe("job-calibrate-9620-sensors");
    expect(mara?.activity).toBe("Working: Calibrate SCP-9620 sensor array");
    expect(mara?.skills.find(({ id }) => id === "research")?.xp).toBe(1);
  });

  it("completes work deterministically and releases the assigned pawn", () => {
    const first = createController(createInitialState(42));
    const second = createController(createInitialState(42));
    first.authorizeJob("job-calibrate-9620-sensors");
    second.authorizeJob("job-calibrate-9620-sensors");

    const firstResult = first.advance(8);
    const secondResult = second.advance(8);
    expect(firstResult.game.jobs).toEqual(secondResult.game.jobs);
    expect(firstResult.game.jobs[0]).toMatchObject({
      status: "completed",
      progress: 64,
      completedTick: 8,
    });
    const mara = firstResult.game.personnel.find(
      ({ id }) => id === "person-mara-voss",
    );
    expect(mara?.currentJobId).toBeNull();
    expect(mara?.skills.find(({ id }) => id === "research")?.xp).toBe(8);

    const settled = advanceSimulation(firstResult.game);
    const settledMara = settled.personnel.find(
      ({ id }) => id === "person-mara-voss",
    );
    expect(settled.jobs[0]?.status).toBe("completed");
    expect(settledMara?.activity).toBe("Reviewing SCP-9620 telemetry");
    expect(settledMara?.skills.find(({ id }) => id === "research")?.xp).toBe(8);
  });

  it("rejects unknown work orders and does not reauthorize existing work", () => {
    const controller = createController(createInitialState());
    expect(() => controller.authorizeJob("missing-job")).toThrow(
      "Unknown job: missing-job",
    );

    controller.authorizeJob("job-calibrate-9620-sensors");
    const authorizedAgain = controller.authorizeJob(
      "job-calibrate-9620-sensors",
    );
    expect(authorizedAgain.game.jobs[0]?.status).toBe("available");
    expect(authorizedAgain.game.jobs[0]?.authorizedTick).toBe(0);
  });

  it("assigns competing work by explicit priority and reserves workers", () => {
    const state = createInitialState();
    const baseJob = createStartingJobs()[0];
    if (!baseJob) throw new Error("starting job missing");
    const lowerPriority: SiteJob = {
      ...baseJob,
      id: "job-lower-priority",
      title: "Review archived calibration notes",
      priority: 10,
    };
    const higherPriority: SiteJob = {
      ...baseJob,
      id: "job-higher-priority",
      title: "Stabilize active telemetry",
      priority: 90,
    };

    const result = advanceJobs(
      [authorizeJob(lowerPriority, 0), authorizeJob(higherPriority, 0)],
      state.personnel,
      1,
    );

    expect(
      result.jobs.find(({ id }) => id === "job-higher-priority")
        ?.assignedPersonId,
    ).toBe("person-mara-voss");
    expect(
      result.jobs.find(({ id }) => id === "job-lower-priority")
        ?.assignedPersonId,
    ).toBe("person-priya-shah");
  });

  it("leaves work available with a reason when no worker is eligible", () => {
    const state = createInitialState();
    const job = createStartingJobs()[0];
    if (!job) throw new Error("starting job missing");

    const result = advanceJobs(
      [authorizeJob(job, 0)],
      state.personnel.map((person) => ({ ...person, skills: [] })),
      1,
    );

    expect(result.jobs[0]).toMatchObject({
      status: "available",
      assignedPersonId: null,
      assignmentReason: "No eligible worker is currently available.",
    });
  });

  it("runs the staged SCP-9620 protocol and resolves its incident", () => {
    const controller = createController(createInitialState(42));
    controller.authorizeJob("job-calibrate-9620-sensors");

    const calibrated = controller.advance(8);
    expect(calibrated.game.incident.level).toBe("green");
    expect(calibrated.game.scp9620).toMatchObject({
      phase: "baseline",
      observations: [
        expect.objectContaining({ id: "observation-9620-calibration" }),
      ],
    });
    expect(
      calibrated.game.jobs.find(({ id }) => id === "job-record-9620-baseline"),
    ).toMatchObject({ status: "proposed", skillId: "research" });

    controller.authorizeJob("job-record-9620-baseline");
    const baseline = controller.advance(6);
    expect(baseline.game.scp9620.phase).toBe("activation");
    expect(
      baseline.game.jobs.find(
        ({ id }) => id === "job-run-9620-activation-trial",
      ),
    ).toMatchObject({ status: "proposed", skillId: "research" });

    controller.authorizeJob("job-run-9620-activation-trial");
    const incident = controller.advance(5);
    expect(incident.game.incident).toEqual({
      level: "yellow",
      summary: "SCP-9620 telemetry feedback outside validated limits",
    });
    expect(incident.game.scp9620.phase).toBe("feedback-incident");
    expect(
      incident.game.jobs.find(({ id }) => id === "job-stabilize-9620-feedback"),
    ).toMatchObject({ status: "proposed", skillId: "engineering" });

    controller.authorizeJob("job-stabilize-9620-feedback");
    const resolved = controller.advance(8);
    const recovery = resolved.game.jobs.find(
      ({ id }) => id === "job-stabilize-9620-feedback",
    );
    expect(recovery).toMatchObject({
      status: "completed",
      assignedPersonId: "person-caleb-ward",
      progress: 56,
    });
    expect(resolved.game.incident).toEqual({
      level: "green",
      summary: "Telemetry feedback stabilized",
    });
    expect(resolved.game.scp9620).toMatchObject({
      phase: "stabilized",
      observations: [
        expect.objectContaining({ id: "observation-9620-calibration" }),
        expect.objectContaining({ id: "observation-9620-passive" }),
        expect.objectContaining({ id: "observation-9620-feedback" }),
        expect.objectContaining({ id: "observation-9620-unresolved" }),
      ],
    });
    expect(
      resolved.game.personnel
        .find(({ id }) => id === "person-caleb-ward")
        ?.skills.find(({ id }) => id === "engineering")?.xp,
    ).toBe(8);
  });
});
