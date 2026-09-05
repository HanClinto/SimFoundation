import { GAME_STATE_VERSION, type GameState } from "../../simulation/state";
import {
  isWalkable,
  sameTile,
  tileAt,
  type SiteWorld,
} from "../../simulation/world";
import {
  LABORATORY_HEIGHT,
  LABORATORY_WIDTH,
  laboratoryTiles,
  laboratoryWorkSite,
  availableResearchLaboratories,
  type ConstructionState,
} from "../../simulation/construction";

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

function isPsychologicalAssessment(value: unknown): boolean {
  const isEstimate = (estimate: unknown) =>
    isRecord(estimate) &&
    isNumberInRange(estimate.minimum, 0, 100) &&
    isNumberInRange(estimate.maximum, estimate.minimum, 100);
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isIntegerInRange(value.assessedTick, 0) &&
    isIntegerInRange(value.recordedOrder, 0) &&
    isNonEmptyString(value.assessor) &&
    isNonEmptyString(value.method) &&
    isNumberInRange(value.confidence, 0, 1) &&
    isEstimate(value.moodEstimate) &&
    isEstimate(value.sanityEstimate) &&
    isArrayOf(value.moodContributors, isNonEmptyString) &&
    isArrayOf(value.sanityContributors, isNonEmptyString)
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
    isArrayOf(value.physicalAssessments, isPhysicalAssessment, 50) &&
    isArrayOf(value.psychologicalAssessments, isPsychologicalAssessment, 50)
  );
}

function isSiteJob(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.title) &&
    (value.assessment === undefined ||
      (isRecord(value.assessment) &&
        isNonEmptyString(value.assessment.patientId) &&
        isLiteral(value.assessment.kind, [
          "physical",
          "psychological",
          "preferences",
          "anomalous",
        ]) &&
        value.skillId === "medical")) &&
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
    isNullableString(value.requiredWorkerId) &&
    isNullableString(value.assignmentReason) &&
    isNullableTick(value.authorizedTick) &&
    isNullableTick(value.completedTick) &&
    isRecord(value.workSite) &&
    isIntegerInRange(value.workSite.x, 0, 127) &&
    isIntegerInRange(value.workSite.y, 0, 127)
  );
}

function isSiteWorld(value: unknown): value is SiteWorld {
  if (!isRecord(value) || !isRecord(value.map) || !isRecord(value.positions))
    return false;
  const map = value.map;
  if (
    !isNonEmptyString(map.id) ||
    !isIntegerInRange(map.width, 1, 128) ||
    !isIntegerInRange(map.height, 1, 128)
  )
    return false;
  const width = map.width;
  const height = map.height;
  if (
    !isArrayOf(map.tiles, (tile) =>
      isLiteral(tile, ["grass", "floor", "wall", "door"]),
    ) ||
    map.tiles.length !== width * height
  )
    return false;
  if (
    !isArrayOf(
      map.rooms,
      (room) =>
        isRecord(room) &&
        isNonEmptyString(room.id) &&
        isNonEmptyString(room.name) &&
        isLiteral(room.kind, [
          "laboratory",
          "containment",
          "storage",
          "dormitory",
          "mess",
          "medical",
          "utilities",
          "security",
        ]) &&
        isIntegerInRange(room.x, 0, width - 1) &&
        isIntegerInRange(room.y, 0, height - 1) &&
        isIntegerInRange(room.width, 1, width - room.x) &&
        isIntegerInRange(room.height, 1, height - room.y),
      128,
    )
  )
    return false;
  return Object.values(value.positions).every(
    (position) =>
      isRecord(position) &&
      isIntegerInRange(position.x, 0, width - 1) &&
      isIntegerInRange(position.y, 0, height - 1) &&
      (map.tiles as unknown[])[position.y * width + position.x] !== "wall",
  );
}

function isConstructionState(value: unknown): value is ConstructionState {
  return (
    isRecord(value) &&
    isIntegerInRange(value.availableMaterials, 0, 160) &&
    isNonEmptyString(value.researchLaboratoryId) &&
    value.availableMaterials % 40 === 0 &&
    isRecord(value.stockpile) &&
    isIntegerInRange(value.stockpile.x, 0, 127) &&
    isIntegerInRange(value.stockpile.y, 0, 127) &&
    isIntegerInRange(value.nextBlueprintNumber, 1, 33) &&
    isArrayOf(
      value.blueprints,
      (blueprint) =>
        isRecord(blueprint) &&
        isNonEmptyString(blueprint.id) &&
        isRecord(blueprint.origin) &&
        isIntegerInRange(blueprint.origin.x, 0, 128 - LABORATORY_WIDTH) &&
        isIntegerInRange(blueprint.origin.y, 1, 128 - LABORATORY_HEIGHT) &&
        isLiteral(blueprint.status, [
          "reserved",
          "hauling",
          "building",
          "completed",
          "cancelled",
        ]) &&
        isNonEmptyString(blueprint.haulJobId) &&
        isNonEmptyString(blueprint.buildJobId) &&
        isNonEmptyString(blueprint.commissionJobId) &&
        isNullableString(blueprint.blockedReason),
      32,
    )
  );
}

function constructionReferencesValid(state: GameState): boolean {
  const construction = state.construction;
  if (
    !availableResearchLaboratories(state).some(
      ({ id }) => id === construction.researchLaboratoryId,
    )
  )
    return false;
  if (
    !isWalkable(state.world.map, construction.stockpile) ||
    construction.nextBlueprintNumber !== construction.blueprints.length + 1
  )
    return false;
  if (
    construction.availableMaterials +
      construction.blueprints.filter(({ status }) => status !== "cancelled")
        .length *
        40 !==
    160
  )
    return false;
  const footprint = new Set<string>();
  const jobIds = new Set<string>();
  return construction.blueprints.every((blueprint, index) => {
    const number = index + 1;
    if (
      blueprint.id !== `blueprint-lab-${number}` ||
      blueprint.haulJobId !== `job-haul-lab-${number}` ||
      blueprint.buildJobId !== `job-build-lab-${number}` ||
      blueprint.commissionJobId !== `job-commission-lab-${number}`
    )
      return false;
    for (const id of [
      blueprint.haulJobId,
      blueprint.buildJobId,
      blueprint.commissionJobId,
    ]) {
      if (jobIds.has(id)) return false;
      jobIds.add(id);
    }
    const haul = state.jobs.find(({ id }) => id === blueprint.haulJobId);
    const build = state.jobs.find(({ id }) => id === blueprint.buildJobId);
    const commission = state.jobs.find(
      ({ id }) => id === blueprint.commissionJobId,
    );
    if (blueprint.status === "cancelled") return !haul && !build && !commission;
    for (const { position, tile } of laboratoryTiles(blueprint.origin)) {
      const key = `${position.x},${position.y}`;
      if (footprint.has(key)) return false;
      footprint.add(key);
      if (
        tileAt(state.world.map, position) !==
        (blueprint.status === "completed" ? tile : "grass")
      )
        return false;
    }
    if (
      !haul ||
      haul.skillId !== "logistics" ||
      haul.requiredProgress !== 1 ||
      !sameTile(
        haul.workSite,
        blueprint.status === "reserved"
          ? construction.stockpile
          : laboratoryWorkSite(blueprint.origin),
      )
    )
      return false;
    if (blueprint.status === "reserved")
      return (
        haul.status !== "completed" &&
        haul.requiredWorkerId === null &&
        !build &&
        !commission
      );
    if (haul.requiredWorkerId === null) return false;
    if (blueprint.status === "hauling")
      return haul.status !== "completed" && !build && !commission;
    if (
      haul.status !== "completed" ||
      !build ||
      build.skillId !== "engineering" ||
      build.requiredProgress !== 112 ||
      !sameTile(build.workSite, laboratoryWorkSite(blueprint.origin))
    )
      return false;
    if (blueprint.status === "building") return !commission;
    return (
      build.status === "completed" &&
      commission?.skillId === "research" &&
      commission.requiredProgress === 48 &&
      sameTile(commission.workSite, {
        x: blueprint.origin.x + 4,
        y: blueprint.origin.y + 3,
      }) &&
      state.world.map.rooms.some(
        (room) =>
          room.id === `room-${blueprint.id}` &&
          room.kind === "laboratory" &&
          room.x === blueprint.origin.x &&
          room.y === blueprint.origin.y &&
          room.width === LABORATORY_WIDTH &&
          room.height === LABORATORY_HEIGHT,
      )
    );
  });
}

function workerReferencesValid(state: GameState): boolean {
  const reserved = new Set<string>();
  const pendingReferrals = new Set<string>();
  for (const job of state.jobs) {
    if (job.assessment) {
      if (
        !state.personnel.some(({ id }) => id === job.assessment?.patientId) ||
        job.assignedPersonId === job.assessment.patientId
      )
        return false;
      if (job.status !== "completed") {
        const key = `${job.assessment.patientId}:${job.assessment.kind}`;
        if (pendingReferrals.has(key)) return false;
        pendingReferrals.add(key);
      }
      if (job.status === "in-progress") {
        if (reserved.has(job.assessment.patientId)) return false;
        reserved.add(job.assessment.patientId);
        if (
          state.personnel.find(({ id }) => id === job.assessment?.patientId)
            ?.currentJobId !== job.id
        )
          return false;
      }
    }
    if (
      job.requiredWorkerId !== null &&
      job.assignedPersonId !== null &&
      job.requiredWorkerId !== job.assignedPersonId
    )
      return false;
    if (job.status === "in-progress") {
      if (job.assignedPersonId === null || reserved.has(job.assignedPersonId))
        return false;
      reserved.add(job.assignedPersonId);
      if (
        state.personnel.find(({ id }) => id === job.assignedPersonId)
          ?.currentJobId !== job.id
      )
        return false;
    }
    if (
      (job.status === "available" || job.status === "proposed") &&
      job.assignedPersonId !== null
    )
      return false;
  }
  return state.personnel.every(
    (person) =>
      person.currentJobId === null ||
      state.jobs.some(
        (job) =>
          job.id === person.currentJobId &&
          job.status === "in-progress" &&
          (job.assignedPersonId === person.id ||
            job.assessment?.patientId === person.id),
      ),
  );
}

function isScp999State(value: unknown): boolean {
  if (!isRecord(value) || value.id !== "SCP-999") return false;
  if (
    !isLiteral(value.status, [
      "wandering",
      "approaching",
      "comforting",
      "resting",
    ] as const)
  )
    return false;
  if (!isNullableString(value.targetPersonId)) return false;
  if (!isNullableTick(value.interactionEndsAtTick)) return false;
  if (!isIntegerInRange(value.nextAvailableTick, 0)) return false;
  if (
    (value.status === "comforting" || value.status === "approaching") !==
    (value.targetPersonId !== null)
  )
    return false;
  if (
    (value.status === "comforting") !==
    (value.interactionEndsAtTick !== null)
  )
    return false;
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
  if (
    !isRecord(value.clinicalCare) ||
    ![0, 240, 480, 1440].includes(
      value.clinicalCare.reviewInterval as number,
    ) ||
    !isArrayOf(value.clinicalCare.clinicianIds, isNonEmptyString, 100)
  )
    return false;
  if (typeof value.capabilities.anomalousPsychometrics !== "boolean")
    return false;
  if (
    !isArrayOf(value.jobs, isSiteJob) ||
    !isArrayOf(value.personnel, isPersonnelRecord) ||
    !isScp999State(value.scp999) ||
    !isScp9620State(value.scp9620) ||
    !isSiteWorld(value.world) ||
    !isConstructionState(value.construction)
  )
    return false;
  const state = value as unknown as GameState;
  const personIds = state.personnel.map(({ id }) => id);
  const entityIds = [...personIds, "SCP-999"];
  return (
    new Set(state.clinicalCare.clinicianIds).size ===
      state.clinicalCare.clinicianIds.length &&
    state.clinicalCare.clinicianIds.every((id) =>
      state.personnel.some(
        (person) =>
          person.id === id &&
          person.skills.some(
            (skill) => skill.id === "medical" && skill.level >= 3,
          ),
      ),
    ) &&
    constructionReferencesValid(state) &&
    workerReferencesValid(state) &&
    (state.scp999.targetPersonId === null ||
      personIds.includes(state.scp999.targetPersonId)) &&
    (state.scp999.lastInteraction === null ||
      personIds.includes(state.scp999.lastInteraction.personId)) &&
    new Set(entityIds).size === entityIds.length &&
    Object.keys(state.world.positions).length === entityIds.length &&
    entityIds.every((id) => {
      const position = state.world.positions[id];
      return position !== undefined && isWalkable(state.world.map, position);
    }) &&
    new Set(state.jobs.map(({ id }) => id)).size === state.jobs.length &&
    new Set(state.world.map.rooms.map(({ id }) => id)).size ===
      state.world.map.rooms.length &&
    state.jobs.every(
      (job) =>
        tileAt(state.world.map, job.workSite) !== null &&
        (job.assignedPersonId === null ||
          personIds.includes(job.assignedPersonId)) &&
        (job.requiredWorkerId === null ||
          personIds.includes(job.requiredWorkerId)),
    )
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
