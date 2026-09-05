import {
  assessAnomalousTraits,
  assessPhysicalHealth,
  assessPsychologicalState,
  assessWorkPreferences,
  recordClinicalSurvey,
  type PersonnelRecord,
} from "./personnel";
import type { SiteJob } from "./jobs";
import type { GameState } from "./state";

export type AssessmentKind =
  | "physical"
  | "mood"
  | "psychological"
  | "preferences"
  | "anomalous";
export interface ClinicalOrder {
  readonly patientId: string;
  readonly kind: AssessmentKind;
}
export interface ClinicalCarePolicy {
  readonly reviewInterval: 0 | 240 | 480 | 1440;
  readonly moodReviewInterval?: 0 | 240 | 480 | 1440;
  readonly psychiatricReviewInterval?: 0 | 240 | 480 | 1440;
  readonly anomalousReviewInterval?: 0 | 240 | 480 | 1440;
  readonly clinicianIds: readonly string[];
}

export const SURVEY_KINDS = [
  "physical",
  "mood",
  "psychological",
  "anomalous",
] as const;
export type SurveyKind = (typeof SURVEY_KINDS)[number];
export const SURVEY_INTERVAL_FIELDS = {
  physical: "reviewInterval",
  mood: "moodReviewInterval",
  psychological: "psychiatricReviewInterval",
  anomalous: "anomalousReviewInterval",
} as const;
export const ASSESSMENT_REQUIREMENTS: Record<
  AssessmentKind,
  { readonly medicalLevel: number; readonly work: number }
> = {
  mood: { medicalLevel: 0, work: 16 },
  physical: { medicalLevel: 3, work: 48 },
  psychological: { medicalLevel: 5, work: 96 },
  preferences: { medicalLevel: 3, work: 64 },
  anomalous: { medicalLevel: 6, work: 144 },
};

export function clinicalQualificationReasons(
  person: PersonnelRecord,
  kind: AssessmentKind,
  anomalousPsychometrics = true,
): readonly string[] {
  const reasons: string[] = [];
  const minimum = ASSESSMENT_REQUIREMENTS[kind].medicalLevel;
  if ((person.skills.find(({ id }) => id === "medical")?.level ?? 0) < minimum)
    reasons.push(`Medical ${minimum} required`);
  if (kind === "anomalous" && !anomalousPsychometrics)
    reasons.push("Anomalous Psychometrics research required");
  return reasons;
}

export function lastClinicalReview(
  person: PersonnelRecord,
  kind: AssessmentKind,
): number | undefined {
  return kind === "physical"
    ? person.physicalAssessments.at(-1)?.assessedTick
    : kind === "psychological"
      ? person.psychologicalAssessments.at(-1)?.assessedTick
      : kind === "preferences"
        ? person.biasAssessments.at(-1)?.assessedTick
        : person.clinicalSurveys.filter((record) => record.kind === kind).at(-1)
            ?.assessedTick;
}

export function setClinicalCarePolicy(
  state: GameState,
  policy: ClinicalCarePolicy,
): GameState {
  if (
    ![0, 240, 480, 1440].includes(policy.reviewInterval) ||
    [
      policy.moodReviewInterval,
      policy.psychiatricReviewInterval,
      policy.anomalousReviewInterval,
    ].some(
      (interval) =>
        interval !== undefined && ![0, 240, 480, 1440].includes(interval),
    ) ||
    new Set(policy.clinicianIds).size !== policy.clinicianIds.length ||
    policy.clinicianIds.some(
      (id) => !state.personnel.some((person) => person.id === id),
    )
  )
    throw new Error("Invalid clinical care policy");
  return {
    ...state,
    clinicalCare: {
      reviewInterval: policy.reviewInterval,
      moodReviewInterval: policy.moodReviewInterval ?? 0,
      psychiatricReviewInterval: policy.psychiatricReviewInterval ?? 0,
      anomalousReviewInterval: policy.anomalousReviewInterval ?? 0,
      clinicianIds: [...policy.clinicianIds],
    },
  };
}

export function discoverClinicalWork(state: GameState): GameState {
  if (
    SURVEY_KINDS.every(
      (kind) => !state.clinicalCare[SURVEY_INTERVAL_FIELDS[kind]],
    ) ||
    !state.world.map.rooms.some(({ kind }) => kind === "medical")
  )
    return state;
  let next = state;
  for (const person of [...state.personnel].sort((first, second) =>
    first.id.localeCompare(second.id),
  )) {
    for (const kind of SURVEY_KINDS) {
      const interval = state.clinicalCare[SURVEY_INTERVAL_FIELDS[kind]] ?? 0;
      if (
        !interval ||
        (kind === "anomalous" && !state.capabilities.anomalousPsychometrics)
      )
        continue;
      const last = lastClinicalReview(person, kind);
      if (last === undefined || state.tick - last >= interval)
        next = requestAssessment(next, person.id, kind);
    }
  }
  return next;
}
export const ASSESSMENT_LABELS: Record<AssessmentKind, string> = {
  physical: "Physical examination",
  mood: "Rapid mood screener",
  psychological: "Psychiatric evaluation",
  preferences: "Work-preference interview",
  anomalous: "Extended anomalous behavior survey",
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
    state.personnel.length * 5
  )
    return state;
  const latestTick = lastClinicalReview(patient, kind);
  if (latestTick !== undefined && state.tick - latestTick < 30) return state;
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
    requiredProgress: ASSESSMENT_REQUIREMENTS[kind].work,
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
          : kind === "mood"
            ? patient
            : assessAnomalousTraits(patient, tick);
  if (kind === "mood" || kind === "anomalous")
    return recordClinicalSurvey(
      assessed,
      kind,
      tick,
      clinician.name,
      clinician.skills.find(({ id }) => id === "medical")?.level ?? 0,
    );
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
