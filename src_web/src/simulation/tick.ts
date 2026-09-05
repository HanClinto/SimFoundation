import {
  advanceJobs,
  createActivationTrialJob,
  createBaselineObservationJob,
  createTelemetryRecoveryJob,
} from "./jobs";
import { advancePersonnel } from "./personnel";
import { advanceScp999 } from "./scp-999";
import { advanceConstruction } from "./construction";
import type { GameState } from "./state";
import { discoverClinicalWork } from "./clinical";
import {
  advancePantrySupply,
  advanceRoutines,
  routineUnavailableIds,
} from "./routines";

export function advanceSimulation(state: GameState): GameState {
  const tick = state.tick + 1;
  state = advanceRoutines(
    discoverClinicalWork({
      ...state,
      tick,
      gameMinute: state.gameMinute + 1,
      personnel: state.personnel.map((person) =>
        advancePersonnel(person, tick),
      ),
    }),
  );
  const jobResult = advanceJobs(
    state.jobs,
    state.personnel,
    tick,
    state.world,
    state.clinicalCare.clinicianIds,
    routineUnavailableIds(state),
  );
  const scp999Result = advanceScp999(
    state.scp999,
    jobResult.personnel,
    tick,
    jobResult.world,
    Object.entries(state.routines.activities)
      .filter(([, activity]) => activity.kind !== "break")
      .map(([id]) => id),
  );
  const previousJobs = new Map(state.jobs.map((job) => [job.id, job]));
  const completedThisTick = (jobId: string) =>
    jobResult.jobs.some(
      (job) =>
        job.id === jobId &&
        job.status === "completed" &&
        previousJobs.get(job.id)?.status !== "completed",
    );
  let jobs = jobResult.jobs;
  let incident = state.incident;
  let scp9620 = state.scp9620;

  if (completedThisTick("job-calibrate-9620-sensors")) {
    jobs = [...jobs, createBaselineObservationJob()];
    scp9620 = {
      ...scp9620,
      phase: "baseline",
      observations: [
        ...scp9620.observations,
        {
          id: "observation-9620-calibration",
          recordedTick: tick,
          certainty: "confirmed",
          label: "Sensor array response is within approved baseline limits.",
        },
      ],
    };
  } else if (completedThisTick("job-record-9620-baseline")) {
    jobs = [...jobs, createActivationTrialJob()];
    scp9620 = {
      ...scp9620,
      phase: "activation",
      observations: [
        ...scp9620.observations,
        {
          id: "observation-9620-passive",
          recordedTick: tick,
          certainty: "unresolved",
          label:
            "No repeatable output observed under passive monitoring; function remains unclassified.",
        },
      ],
    };
  } else if (completedThisTick("job-run-9620-activation-trial")) {
    jobs = [...jobs, createTelemetryRecoveryJob()];
    incident = {
      level: "yellow",
      summary: "SCP-9620 telemetry feedback outside validated limits",
    };
    scp9620 = {
      ...scp9620,
      phase: "feedback-incident",
      observations: [
        ...scp9620.observations,
        {
          id: "observation-9620-feedback",
          recordedTick: tick,
          certainty: "confirmed",
          label:
            "Approved low-energy input produced self-amplifying telemetry feedback.",
        },
      ],
    };
  } else if (completedThisTick("job-stabilize-9620-feedback")) {
    incident = { level: "green", summary: "Telemetry feedback stabilized" };
    scp9620 = {
      ...scp9620,
      phase: "stabilized",
      observations: [
        ...scp9620.observations,
        {
          id: "observation-9620-unresolved",
          recordedTick: tick,
          certainty: "unresolved",
          label:
            "Feedback ceased after relay isolation; the underlying response remains unexplained.",
        },
      ],
    };
  }
  return advanceConstruction(
    advancePantrySupply({
      ...state,
      tick,
      gameMinute: state.gameMinute,
      incident,
      jobs,
      personnel: scp999Result.personnel,
      scp999: scp999Result.anomaly,
      scp9620,
      world: scp999Result.world,
    }),
  );
}
