import { expect, it } from "vitest";
import {
  advanceJobs,
  effectiveJobPriority,
  setWorkPriority,
} from "../src/simulation/jobs";
import { createInitialState, createTestJobs } from "./fixtures/work-state";
import { createInitialState as createSite } from "../src/simulation/state";
import { createController } from "../src/application/controller";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { advanceSimulation } from "../src/simulation/tick";

function fixture() {
  const initial = createInitialState();
  const person = initial.personnel[0]!;
  const base = {
    ...createTestJobs()[0]!,
    status: "available" as const,
    authorizedTick: 0,
    workSite: initial.world.positions[person.id]!,
  };
  return {
    initial,
    person,
    jobs: [
      { ...base, id: "job-first", priority: 60 },
      { ...base, id: "job-second", priority: 40 },
    ],
  };
}

it("uses manual priority for available work and restores the original automatic value", () => {
  const { initial, person, jobs } = fixture();
  const raised = setWorkPriority(jobs, "job-second", "high");
  expect(effectiveJobPriority(raised[1]!)).toBe(75);
  const result = advanceJobs(raised, [person], 1, initial.world);
  expect(
    result.jobs.find((job) => job.id === "job-second")!.assignedPersonId,
  ).toBe(person.id);
  expect(
    result.jobs.find((job) => job.id === "job-first")!.assignedPersonId,
  ).toBeNull();
  expect(jobs[1]!.priority).toBe(40);
  const restored = setWorkPriority(raised, "job-second", null);
  expect(effectiveJobPriority(restored[1]!)).toBe(40);
  expect(restored[1]!.priorityOverride).toBeUndefined();
});

it("preserves active assignments and carrier reservations rather than treating High as an emergency", () => {
  const { initial, person, jobs } = fixture();
  const active = {
    ...jobs[0]!,
    status: "in-progress" as const,
    assignedPersonId: person.id,
    requiredWorkerId: person.id,
    progress: 12,
  };
  const raised = setWorkPriority([active, jobs[1]!], "job-second", "high");
  const result = advanceJobs(
    raised,
    [{ ...person, currentJobId: active.id }],
    1,
    initial.world,
    [],
    [],
    { [person.id]: active.id },
  );
  expect(result.jobs[0]!.assignedPersonId).toBe(person.id);
  expect(result.jobs[0]!.progress).toBeGreaterThan(12);
  expect(result.jobs[1]!.assignedPersonId).toBeNull();
});

it("protects automatic emergencies and ignores invalid or completed edits", () => {
  const { initial, person, jobs } = fixture();
  const emergency = {
    ...jobs[0]!,
    priority: 95,
    priorityOverride: "low" as const,
  };
  expect(effectiveJobPriority(emergency)).toBe(95);
  const ordered = [
    emergency,
    { ...jobs[1]!, priorityOverride: "high" as const },
  ];
  expect(setWorkPriority(ordered, emergency.id, "normal")).toBe(ordered);
  expect(
    advanceJobs(ordered, [person], 1, initial.world).jobs[0]!.assignedPersonId,
  ).toBe(person.id);
  expect(setWorkPriority(jobs, "missing", "high")).toBe(jobs);
  expect(setWorkPriority(jobs, jobs[0]!.id, "urgent" as "high")).toBe(jobs);
  const complete = [{ ...jobs[0]!, status: "completed" as const }];
  expect(setWorkPriority(complete, complete[0]!.id, "low")).toBe(complete);
});

it("preserves the override, cargo ownership and resource ledger across physical work phases and reload", () => {
  const controller = createController(createSite());
  const queued = controller.craftVessel({ x: 66, y: 65 }, "steel").snapshot
    .game;
  const jobId = queued.vesselWork.orders[0]!.jobId;
  const edited = controller.setWorkPriority(jobId, "high").game;
  expect(edited.objects).toEqual(queued.objects);
  expect(edited.personnel).toEqual(queued.personnel);
  expect(edited.construction).toEqual(queued.construction);
  const phases = new Set<string>();
  let state = edited;
  for (
    let tick = 0;
    tick < 200 && state.vesselWork.orders[0]!.phase !== "completed";
    tick += 1
  ) {
    phases.add(state.vesselWork.orders[0]!.phase);
    state = controller.advance().game;
    expect(state.jobs.find((job) => job.id === jobId)!.priorityOverride).toBe(
      "high",
    );
    if (tick % 20 === 0) {
      const loaded = loadGameState({
        getItem: () => JSON.stringify(state),
        setItem: () => {},
      });
      expect(loaded.status).toBe("loaded");
      if (loaded.status === "loaded")
        expect(advanceSimulation(loaded.state)).toEqual(
          advanceSimulation(state),
        );
    }
  }
  expect(phases).toEqual(new Set(["collecting", "delivering", "working"]));
  expect(state.vesselWork.orders[0]!.phase).toBe("completed");
  expect(state.construction.availableMaterials).toBe(144);
  expect(controller.setWorkPriority(jobId, "low").game.jobs).toEqual(
    state.jobs,
  );
  const invalid = {
    ...edited,
    jobs: edited.jobs.map((job) => ({ ...job, priorityOverride: "emergency" })),
  };
  expect(
    loadGameState({ getItem: () => JSON.stringify(invalid), setItem: () => {} })
      .status,
  ).toBe("invalid");
});
