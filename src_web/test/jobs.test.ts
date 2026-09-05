import { describe, expect, it } from "vitest";

import { createController } from "../src/application/controller";
import {
  advanceJobs,
  authorizeJob,
  type SiteJob,
} from "../src/simulation/jobs";
import { createInitialState, createTestJobs } from "./fixtures/work-state";
import { advanceSimulation } from "../src/simulation/tick";

describe("site jobs", () => {
  it("preempts routine work for emergencies without losing progress or taking a cargo carrier", () => {
    const state = createInitialState();
    const person = state.personnel[0]!;
    const routine: SiteJob = {
      ...state.jobs[0]!,
      status: "in-progress",
      assignedPersonId: person.id,
      authorizedTick: 0,
      progress: 24,
      priority: 45,
    };
    const emergency: SiteJob = {
      ...routine,
      id: "job-emergency",
      title: "Emergency repair",
      status: "available",
      assignedPersonId: null,
      priority: 95,
      progress: 0,
    };
    const result = advanceJobs(
      [routine, emergency],
      [{ ...person, currentJobId: routine.id }],
      1,
      state.world,
    );
    expect(result.jobs[0]).toMatchObject({
      status: "available",
      progress: 24,
      assignedPersonId: null,
    });
    expect(result.jobs[1]?.assignedPersonId).toBe(person.id);
    expect(result.personnel[0]?.currentJobId).toBe(emergency.id);
    const carrying = advanceJobs(
      [{ ...routine, requiredWorkerId: person.id }, emergency],
      [person],
      1,
      state.world,
    );
    expect(carrying.jobs[0]?.assignedPersonId).toBe(person.id);
    expect(carrying.jobs[1]?.assignedPersonId).toBeNull();
    const unavailable = advanceJobs(
      [routine, emergency],
      [person],
      1,
      state.world,
      [],
      [person.id],
    );
    expect(unavailable.jobs[1]?.assignedPersonId).toBeNull();
    const clinical = advanceJobs(
      [
        {
          ...routine,
          assessment: { kind: "mood", patientId: state.personnel[1]!.id },
        },
        emergency,
      ],
      state.personnel.map((candidate) => ({
        ...candidate,
        skills: candidate.id === person.id ? candidate.skills : [],
      })),
      1,
      state.world,
      [person.id],
    );
    expect(clinical.jobs[1]?.assignedPersonId).toBeNull();
  });
  it("blocks inaccessible work and resumes when access is restored", () => {
    const state = createInitialState();
    const job = authorizeJob(state.jobs[0]!, 0);
    const tiles = [...state.world.map.tiles];
    tiles[job.workSite.y * state.world.map.width + job.workSite.x] = "wall";
    const blockedWorld = { ...state.world, map: { ...state.world.map, tiles } };
    const blocked = advanceJobs([job], state.personnel, 1, blockedWorld);
    expect(blocked.jobs[0]).toMatchObject({
      status: "available",
      progress: 0,
      assignedPersonId: null,
      assignmentReason: "No eligible worker can reach the work site.",
    });
    const resumed = advanceJobs(
      blocked.jobs,
      blocked.personnel,
      2,
      state.world,
    );
    expect(resumed.jobs[0]).toMatchObject({
      status: "in-progress",
      assignedPersonId: "person-mara-voss",
      progress: 0,
    });
    const interrupted = advanceJobs(resumed.jobs, resumed.personnel, 3, {
      ...blockedWorld,
      positions: resumed.world.positions,
    });
    expect(interrupted.jobs[0]).toMatchObject({
      status: "available",
      assignedPersonId: null,
      progress: 0,
    });
    expect(
      interrupted.personnel.find(({ id }) => id === "person-mara-voss")
        ?.currentJobId,
    ).toBeNull();
  });

  it("does not assign zero-skill workers to work they cannot advance", () => {
    const state = createInitialState();
    const result = advanceJobs(
      [authorizeJob(state.jobs[0]!, 0)],
      state.personnel.map((person) => ({
        ...person,
        skills: person.skills.map((skill) => ({ ...skill, level: 0 })),
      })),
      1,
      state.world,
    );
    expect(result.jobs[0]?.assignedPersonId).toBeNull();
  });

  it("authorizes and assigns calibration to the highest-skilled available researcher", () => {
    const controller = createController(createInitialState(42));

    expect(controller.getSnapshot().game.jobs[0]).toMatchObject({
      status: "proposed",
      assignedPersonId: null,
      progress: 0,
    });

    const authorized = controller.authorizeJob("job-test-survey");
    expect(authorized.game.jobs[0]).toMatchObject({
      status: "available",
      authorizedTick: 0,
    });

    const advanced = controller.advance();
    expect(advanced.game.jobs[0]).toMatchObject({
      status: "in-progress",
      assignedPersonId: "person-mara-voss",
      progress: 0,
      assignmentReason:
        "Highest eligible official research level (8); additional suitability factors and stable ordering resolve ties.",
    });
    const mara = advanced.game.personnel.find(
      ({ id }) => id === "person-mara-voss",
    );
    expect(mara?.currentJobId).toBe("job-test-survey");
    expect(mara?.activity).toBe("Travelling: Survey site");
    expect(mara?.skills.find(({ id }) => id === "research")?.xp).toBe(0);
    expect(advanced.game.world.positions["person-mara-voss"]).toEqual({
      x: 55,
      y: 55,
    });
    expect(controller.advance(2).game.jobs[0]?.progress).toBe(0);
    expect(controller.advance().game.jobs[0]?.progress).toBe(8);
  });

  it("completes work deterministically and releases the assigned pawn", () => {
    const first = createController(createInitialState(42));
    const second = createController(createInitialState(42));
    first.authorizeJob("job-test-survey");
    second.authorizeJob("job-test-survey");

    const firstResult = first.advance(11);
    const secondResult = second.advance(11);
    expect(firstResult.game.jobs).toEqual(secondResult.game.jobs);
    expect(firstResult.game.jobs[0]).toMatchObject({
      status: "completed",
      progress: 64,
      completedTick: 11,
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
    expect(settledMara?.activity).toBe("Available for scheduled work");
    expect(settledMara?.skills.find(({ id }) => id === "research")?.xp).toBe(8);
  });

  it("rejects unknown work orders and does not reauthorize existing work", () => {
    const controller = createController(createInitialState());
    expect(() => controller.authorizeJob("missing-job")).toThrow(
      "Unknown job: missing-job",
    );

    controller.authorizeJob("job-test-survey");
    const authorizedAgain = controller.authorizeJob("job-test-survey");
    expect(authorizedAgain.game.jobs[0]?.status).toBe("available");
    expect(authorizedAgain.game.jobs[0]?.authorizedTick).toBe(0);
  });

  it("assigns competing work by explicit priority and reserves workers", () => {
    const state = createInitialState();
    const baseJob = createTestJobs()[0];
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
      state.world,
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
    const job = createTestJobs()[0];
    if (!job) throw new Error("starting job missing");

    const result = advanceJobs(
      [authorizeJob(job, 0)],
      state.personnel.map((person) => ({ ...person, skills: [] })),
      1,
      state.world,
    );

    expect(result.jobs[0]).toMatchObject({
      status: "available",
      assignedPersonId: null,
      assignmentReason: "No eligible worker is currently available.",
    });
  });
});
