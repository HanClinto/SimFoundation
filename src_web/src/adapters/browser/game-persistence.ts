import { GAME_STATE_VERSION, type GameState } from "../../simulation/state";

export const GAME_STATE_STORAGE_KEY = "scp-site-manager.game-state.v1";

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type GameLoadResult =
  | { readonly status: "loaded"; readonly state: GameState }
  | {
      readonly status: "empty" | "invalid" | "incompatible" | "unavailable";
      readonly state: null;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isIntegerInRange(
  value: unknown,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= minimum &&
    (value as number) <= maximum
  );
}

function isNumberInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return isFiniteNumber(value) && value >= minimum && value <= maximum;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isNonEmptyString(value);
}

function isNullableTick(value: unknown): value is number | null {
  return value === null || isIntegerInRange(value, 0);
}

function isArrayOf(
  value: unknown,
  predicate: (entry: unknown) => boolean,
  maximumLength = Number.MAX_SAFE_INTEGER,
): value is readonly unknown[] {
  return (
    Array.isArray(value) &&
    value.length <= maximumLength &&
    value.every(predicate)
  );
}

const SKILL_IDS = [
  "research",
  "engineering",
  "medical",
  "security",
  "logistics",
] as const;
const BODY_REGIONS = [
  "head",
  "torso",
  "leftArm",
  "rightArm",
  "leftHand",
  "rightHand",
  "leftLeg",
  "rightLeg",
  "leftFoot",
  "rightFoot",
] as const;
const TRAIT_TAGS = [
  "work",
  "threat-response",
  "social",
  "anomalous",
  "medical",
  "conduct",
] as const;
const ASSESSMENT_STATUSES = ["suspected", "confirmed", "ruled-out"] as const;

function isLiteral<Value extends string>(
  value: unknown,
  values: readonly Value[],
): value is Value {
  return isString(value) && values.includes(value as Value);
}

function isPersonnelItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isString(value.description)
  );
}

function isPersonnelSkill(value: unknown): boolean {
  return (
    isRecord(value) &&
    isLiteral(value.id, SKILL_IDS) &&
    isIntegerInRange(value.level, 0) &&
    isIntegerInRange(value.xp, 0)
  );
}

function isBodyRegions(value: unknown): boolean {
  return isArrayOf(value, (region) => isLiteral(region, BODY_REGIONS));
}

function isPersonnelEffect(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isLiteral(value.kind, ["injury", "condition", "memory"] as const) &&
    isLiteral(value.severity, ["minor", "moderate", "serious"] as const) &&
    isBodyRegions(value.bodyRegions) &&
    isFiniteNumber(value.physicalHealthPenalty) &&
    value.physicalHealthPenalty >= 0 &&
    isFiniteNumber(value.stressRecoveryPerTick) &&
    value.stressRecoveryPerTick >= 0 &&
    isNullableTick(value.expiresAtTick)
  );
}

function isAssessmentConclusion(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.subjectEffectId) &&
    isNonEmptyString(value.label) &&
    isLiteral(value.status, ASSESSMENT_STATUSES) &&
    isNumberInRange(value.confidence, 0, 1) &&
    isBodyRegions(value.bodyRegions)
  );
}

function isPhysicalObservation(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isIntegerInRange(value.observedTick, 0) &&
    isIntegerInRange(value.recordedOrder, 0) &&
    isNonEmptyString(value.source) &&
    isNonEmptyString(value.label) &&
    isBodyRegions(value.bodyRegions)
  );
}

function isPhysicalAssessment(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isIntegerInRange(value.assessedTick, 0) &&
    isIntegerInRange(value.recordedOrder, 0) &&
    isNonEmptyString(value.assessor) &&
    isNonEmptyString(value.method) &&
    isNumberInRange(value.confidence, 0, 1) &&
    isRecord(value.estimate) &&
    isNumberInRange(value.estimate.minimum, 0, 100) &&
    isNumberInRange(value.estimate.maximum, value.estimate.minimum, 100) &&
    isArrayOf(value.conclusions, isAssessmentConclusion)
  );
}

function isPersonnelTrait(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.label) ||
    !isArrayOf(value.tags, (tag) => isLiteral(tag, TRAIT_TAGS)) ||
    typeof value.disclosed !== "boolean"
  ) {
    return false;
  }
  return (
    value.parameters === undefined ||
    (isRecord(value.parameters) &&
      Object.values(value.parameters).every(isFiniteNumber))
  );
}

function isTraitEvidence(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isIntegerInRange(value.observedTick, 0) &&
    isIntegerInRange(value.recordedOrder, 0) &&
    isNonEmptyString(value.source) &&
    isNonEmptyString(value.label) &&
    isNonEmptyString(value.supportsTraitId)
  );
}

function isTraitConclusion(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.traitId) &&
    isNonEmptyString(value.label) &&
    isLiteral(value.status, ASSESSMENT_STATUSES) &&
    isNumberInRange(value.confidence, 0, 1) &&
    isArrayOf(value.evidenceIds, isNonEmptyString)
  );
}

function isTraitAssessment(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isIntegerInRange(value.assessedTick, 0) &&
    isIntegerInRange(value.recordedOrder, 0) &&
    isNonEmptyString(value.method) &&
    isIntegerInRange(value.protocolVersion, 0) &&
    isArrayOf(value.conclusions, isTraitConclusion)
  );
}

function isBiasEstimate(value: unknown): boolean {
  return (
    isRecord(value) &&
    isIntegerInRange(value.minimum, -3, 3) &&
    isIntegerInRange(value.maximum, value.minimum, 3)
  );
}

function isBiasAssessment(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isIntegerInRange(value.assessedTick, 0) &&
    isIntegerInRange(value.recordedOrder, 0) &&
    isNonEmptyString(value.method) &&
    isNumberInRange(value.confidence, 0, 1) &&
    isRecord(value.estimates) &&
    isBiasEstimate(value.estimates.mindMight) &&
    isBiasEstimate(value.estimates.receptiveResolute)
  );
}

function isPersonnelRecord(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (
    ![
      value.id,
      value.name,
      value.assignment,
      value.defaultActivity,
      value.activity,
    ].every(isNonEmptyString) ||
    !isNullableString(value.currentJobId) ||
    !isIntegerInRange(value.clearance, 0) ||
    !isNumberInRange(value.resilience, 0, 100) ||
    !isNumberInRange(value.stress, 0, 100) ||
    !isNumberInRange(value.fear, 0, 100) ||
    !isRecord(value.needs) ||
    !isNumberInRange(value.needs.satiety, 0, 100) ||
    !isNumberInRange(value.needs.rest, 0, 100)
  ) {
    return false;
  }
  if (
    !isRecord(value.traits) ||
    !Object.entries(value.traits).every(
      ([traitId, trait]) => traitId.length > 0 && isPersonnelTrait(trait),
    ) ||
    !isArrayOf(value.traitEvidence, isTraitEvidence) ||
    !isArrayOf(value.traitAssessments, isTraitAssessment, 50) ||
    !isRecord(value.biases) ||
    !isIntegerInRange(value.biases.mindMight, -3, 3) ||
    !isIntegerInRange(value.biases.receptiveResolute, -3, 3) ||
    !isArrayOf(value.biasAssessments, isBiasAssessment, 20) ||
    !isArrayOf(value.skills, isPersonnelSkill)
  ) {
    return false;
  }
  if (!isRecord(value.equipment)) return false;
  for (const slot of ["head", "body", "primaryHand", "offHand", "accessory"]) {
    const item = value.equipment[slot];
    if (item !== null && !isPersonnelItem(item)) return false;
  }
  return (
    isArrayOf(value.inventory, isPersonnelItem) &&
    isArrayOf(value.effects, isPersonnelEffect) &&
    isArrayOf(value.physicalObservations, isPhysicalObservation) &&
    isArrayOf(value.physicalAssessments, isPhysicalAssessment, 50)
  );
}

function isSiteJob(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.description) &&
    isLiteral(value.skillId, SKILL_IDS) &&
    isIntegerInRange(value.priority, 0) &&
    isIntegerInRange(value.xpPerTick, 0) &&
    isRecord(value.preferredBiases) &&
    [-1, 0, 1].includes(value.preferredBiases.mindMight as number) &&
    [-1, 0, 1].includes(value.preferredBiases.receptiveResolute as number) &&
    isLiteral(value.status, [
      "proposed",
      "available",
      "in-progress",
      "completed",
    ] as const) &&
    isIntegerInRange(value.progress, 0) &&
    isIntegerInRange(value.requiredProgress, 1) &&
    value.progress <= value.requiredProgress &&
    isNullableString(value.assignedPersonId) &&
    isNullableString(value.assignmentReason) &&
    isNullableTick(value.authorizedTick) &&
    isNullableTick(value.completedTick)
  );
}

function isScp999State(value: unknown): boolean {
  if (!isRecord(value) || value.id !== "SCP-999") return false;
  if (!isLiteral(value.status, ["wandering", "comforting", "resting"] as const))
    return false;
  if (!isNullableString(value.targetPersonId)) return false;
  if (!isNullableTick(value.interactionEndsAtTick)) return false;
  if (!isIntegerInRange(value.nextAvailableTick, 0)) return false;
  if (value.lastInteraction === null) return true;
  return (
    isRecord(value.lastInteraction) &&
    isNonEmptyString(value.lastInteraction.personId) &&
    isIntegerInRange(value.lastInteraction.completedTick, 0)
  );
}

function isScp9620State(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.id === "SCP-9620" &&
    isLiteral(value.phase, [
      "calibration",
      "baseline",
      "activation",
      "feedback-incident",
      "stabilized",
    ] as const) &&
    isArrayOf(
      value.observations,
      (observation) =>
        isRecord(observation) &&
        isNonEmptyString(observation.id) &&
        isIntegerInRange(observation.recordedTick, 0) &&
        isLiteral(observation.certainty, [
          "confirmed",
          "unresolved",
        ] as const) &&
        isNonEmptyString(observation.label),
    )
  );
}

function isGameState(value: unknown): value is GameState {
  if (!isRecord(value)) return false;
  if (value.version !== GAME_STATE_VERSION) return false;
  if (!Number.isSafeInteger(value.seed)) return false;
  if (!isIntegerInRange(value.tick, 0)) return false;
  if (!isIntegerInRange(value.gameMinute, 0)) return false;
  if (!isNonEmptyString(value.siteName)) return false;
  if (!isRecord(value.incident) || !isNonEmptyString(value.incident.summary))
    return false;
  if (!isLiteral(value.incident.level, ["green", "yellow", "orange", "red"])) {
    return false;
  }
  if (!isRecord(value.capabilities)) return false;
  if (typeof value.capabilities.anomalousPsychometrics !== "boolean")
    return false;
  return (
    isArrayOf(value.jobs, isSiteJob) &&
    isArrayOf(value.personnel, isPersonnelRecord) &&
    isScp999State(value.scp999) &&
    isScp9620State(value.scp9620)
  );
}

export function loadGameState(storage: StoragePort): GameLoadResult {
  let serialized: string | null;
  try {
    serialized = storage.getItem(GAME_STATE_STORAGE_KEY);
  } catch {
    return { status: "unavailable", state: null };
  }
  if (serialized === null) return { status: "empty", state: null };

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (isRecord(parsed) && parsed.version !== GAME_STATE_VERSION) {
      return { status: "incompatible", state: null };
    }
    return isGameState(parsed)
      ? { status: "loaded", state: parsed }
      : { status: "invalid", state: null };
  } catch {
    return { status: "invalid", state: null };
  }
}

export function saveGameState(storage: StoragePort, state: GameState): boolean {
  try {
    storage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
