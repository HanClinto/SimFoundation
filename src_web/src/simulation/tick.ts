import { advanceJobs, createTelemetryRecoveryJob } from "./jobs";
import { advancePersonnel } from "./personnel";
import type { GameState } from "./state";

export function advanceSimulation(state: GameState): GameState {
  const tick = state.tick + 1;
  const jobResult = advanceJobs(
    state.jobs,
    state.personnel.map(advancePersonnel),
    tick,
  );
  const previousJobs = new Map(state.jobs.map((job) => [job.id, job]));
  const calibrationCompleted = jobResult.jobs.some(
    (job) =>
      job.id === "job-calibrate-9620-sensors" &&
      job.status === "completed" &&
      previousJobs.get(job.id)?.status !== "completed",
  );
  const recoveryCompleted = jobResult.jobs.some(
    (job) =>
      job.id === "job-stabilize-9620-feedback" &&
      job.status === "completed" &&
      previousJobs.get(job.id)?.status !== "completed",
  );
  const jobs =
    calibrationCompleted &&
    !jobResult.jobs.some(({ id }) => id === "job-stabilize-9620-feedback")
      ? [...jobResult.jobs, createTelemetryRecoveryJob()]
      : jobResult.jobs;
  const incident = recoveryCompleted
    ? { level: "green" as const, summary: "Telemetry feedback stabilized" }
    : calibrationCompleted
      ? {
          level: "yellow" as const,
          summary: "SCP-9620 telemetry feedback outside validated limits",
        }
      : state.incident;
  return {
    ...state,
    tick,
    gameMinute: state.gameMinute + 1,
    incident,
    jobs,
    personnel: jobResult.personnel,
  };
}
