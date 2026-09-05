import {
  assessAnomalousTraits,
  assessPhysicalHealth,
  assessPsychologicalState,
  assessWorkPreferences,
  type PersonnelRecord,
} from "./personnel";
import type { SiteJob } from "./jobs";
import type { GameState } from "./state";

export type AssessmentKind =
  | "physical"
  | "psychological"
  | "preferences"
  | "anomalous";
export interface ClinicalOrder {
  readonly patientId: string;
  readonly kind: AssessmentKind;
}
export interface ClinicalCarePolicy {
  readonly reviewInterval: 0 | 240 | 480 | 1440;
  readonly clinicianIds: readonly string[];
}

export function setClinicalCarePolicy(
  state: GameState,
  policy: ClinicalCarePolicy,
): GameState {
  if (
    ![0, 240, 480, 1440].includes(policy.reviewInterval) ||
    new Set(policy.clinicianIds).size !== policy.clinicianIds.length ||
    policy.clinicianIds.some(
      (id) =>
        !state.personnel.some(
          (person) =>
            person.id === id &&
            person.skills.some(
              (skill) => skill.id === "medical" && skill.level >= 3,
            ),
        ),
    )
  )
    throw new Error("Invalid clinical care policy");
  return {
    ...state,
    clinicalCare: {
      reviewInterval: policy.reviewInterval,
      clinicianIds: [...policy.clinicianIds],
    },
  };
}

export function discoverClinicalWork(state: GameState): GameState {
  if (
    state.clinicalCare.reviewInterval === 0 ||
    !state.world.map.rooms.some(({ kind }) => kind === "medical")
  )
    return state;
  let next = state;
  for (const person of [...state.personnel].sort((first, second) =>
    first.id.localeCompare(second.id),
  )) {
    const last = person.physicalAssessments.at(-1)?.assessedTick;
    if (
      last === undefined ||
      state.tick - last >= state.clinicalCare.reviewInterval
    )
      next = requestAssessment(next, person.id, "physical");
  }
  return next;
}
export const ASSESSMENT_LABELS: Record<AssessmentKind, string> = {
  physical: "Physical examination",
  psychological: "Psychological evaluation",
  preferences: "Work-preference interview",
  anomalous: "Anomalous screening",
};

export function requestAssessment(
  state: GameState,
  patientId: string,
  kind: AssessmentKind,
): GameState {
  const patient = state.personnel.find(({ id }) => id === patientId);
  if (!patient) throw new Error(`Unknown person: ${patientId}`);
  if (kind === "anomalous" && !state.capabilities.anomalousPsychometrics)
    throw new Error("Anomalous Psychometrics has not been unlocked");
  if (
    state.jobs.some(
      (job) =>
        job.assessment?.patientId === patientId &&
        job.assessment.kind === kind &&
        job.status !== "completed",
    )
  )
    return state;
  if (
    state.jobs.filter((job) => job.assessment && job.status !== "completed")
      .length >=
    state.personnel.length * 4
  )
    return state;
  const latestTick =
    kind === "physical"
      ? patient.physicalAssessments.at(-1)?.assessedTick
      : kind === "psychological"
        ? patient.psychologicalAssessments.at(-1)?.assessedTick
        : kind === "preferences"
          ? patient.biasAssessments.at(-1)?.assessedTick
          : undefined;
  if (latestTick !== undefined && state.tick - latestTick < 30) return state;
  if (
    kind === "anomalous" &&
    !patient.traitEvidence.some(
      (evidence) =>
        !patient.traitAssessments.some((assessment) =>
          assessment.conclusions.some(
            (conclusion) =>
              conclusion.traitId === evidence.supportsTraitId &&
              conclusion.status === "confirmed",
          ),
        ),
    )
  )
    return state;
  const room = state.world.map.rooms.find(({ kind }) => kind === "medical");
  if (!room) throw new Error("No medical bay is available");
  const sequence =
    Math.max(
      0,
      ...state.jobs
        .filter((job) => job.assessment)
        .map((job) => Number(job.id.split("-").at(-1)) || 0),
    ) + 1;
  const job: SiteJob = {
    id: `job-clinical-${sequence}`,
    title: `${ASSESSMENT_LABELS[kind]}: ${patient.name}`,
    description:
      "Clinical referral. A qualified clinician and the patient must attend before findings can be recorded.",
    skillId: "medical",
    priority: 55,
    xpPerTick: 1,
    preferredBiases: { mindMight: -1, receptiveResolute: -1 },
    status: "available",
    progress: 0,
    requiredProgress: kind === "physical" ? 48 : 64,
    assignedPersonId: null,
    requiredWorkerId: null,
    assignmentReason: null,
    authorizedTick: state.tick,
    completedTick: null,
    workSite: { x: room.x + 2, y: room.y + 2 },
    assessment: { patientId, kind },
  };
  const completed = state.jobs
    .filter((job) => job.assessment && job.status === "completed")
    .slice(-49);
  const retained = new Set(completed.map(({ id }) => id));
  return {
    ...state,
    jobs: [
      ...state.jobs.filter(
        (job) =>
          !job.assessment || job.status !== "completed" || retained.has(job.id),
      ),
      job,
    ],
  };
}

export function completeAssessment(
  patient: PersonnelRecord,
  kind: AssessmentKind,
  tick: number,
  clinician: PersonnelRecord,
): PersonnelRecord {
  const assessed =
    kind === "physical"
      ? assessPhysicalHealth(patient, tick)
      : kind === "psychological"
        ? assessPsychologicalState(patient, tick)
        : kind === "preferences"
          ? assessWorkPreferences(patient, tick)
          : assessAnomalousTraits(patient, tick);
  return {
    ...assessed,
    physicalAssessments: assessed.physicalAssessments.map((record) =>
      kind === "physical" && record.assessedTick === tick
        ? { ...record, assessor: clinician.name }
        : record,
    ),
    psychologicalAssessments: assessed.psychologicalAssessments.map((record) =>
      kind === "psychological" && record.assessedTick === tick
        ? { ...record, assessor: clinician.name }
        : record,
    ),
  };
}
