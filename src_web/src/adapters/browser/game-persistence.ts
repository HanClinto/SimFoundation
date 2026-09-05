import { GAME_STATE_VERSION, type GameState } from "../../simulation/state";
import {
  MATERIALS,
  surfaceTile,
  type TileSurfaces,
} from "../../simulation/materials";
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

function isClinicalSurvey(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isLiteral(value.kind, ["mood", "anomalous"]) &&
    isIntegerInRange(value.assessedTick, 0) &&
    isIntegerInRange(value.recordedOrder, 0) &&
    isNonEmptyString(value.assessor) &&
    isNumberInRange(value.confidence, 0, 1) &&
    isNonEmptyString(value.summary) &&
    (value.kind === "anomalous"
      ? value.moodEstimate === null
      : isRecord(value.moodEstimate) &&
        isNumberInRange(value.moodEstimate.minimum, 0, 100) &&
        isNumberInRange(
          value.moodEstimate.maximum,
          value.moodEstimate.minimum,
          100,
        ))
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
    isArrayOf(value.psychologicalAssessments, isPsychologicalAssessment, 50) &&
    isArrayOf(value.clinicalSurveys, isClinicalSurvey, 50)
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
          "mood",
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
      isLiteral(tile, ["grass", "floor", "wall", "door", "closed-door"]),
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
    !isWalkable(state.world.map, construction.stockpile) ||
    construction.nextBlueprintNumber !== construction.blueprints.length + 1
  )
    return false;
  if (
    construction.availableMaterials +
      state.environment.spentMaterials +
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
      if (blueprint.status === "completed") {
        const cell =
          state.world.map.surfaces[
            position.y * state.world.map.width + position.x
          ];
        if (
          !cell?.floor ||
          (tile === "wall" && cell.structure?.kind !== "wall") ||
          (tile === "door" &&
            !["door", "closed-door"].includes(cell.structure?.kind ?? ""))
        )
          return false;
      } else if (tileAt(state.world.map, position) !== "grass") return false;
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

function isRoutineState(value: unknown): boolean {
  return (
    isRecord(value) &&
    isIntegerInRange(value.pantryMeals, 0, 108) &&
    isIntegerInRange(value.mealsConsumed, 0, 108) &&
    isIntegerInRange(value.reserveMeals, 0, 72) &&
    isIntegerInRange(value.nextSupplyNumber, 1, 1000) &&
    (value.supplyOrder === null ||
      (isRecord(value.supplyOrder) &&
        isNonEmptyString(value.supplyOrder.jobId) &&
        isIntegerInRange(value.supplyOrder.quantity, 1, 12) &&
        isLiteral(value.supplyOrder.phase, ["collection", "delivery"]))) &&
    isArrayOf(
      value.stations,
      (station) =>
        isRecord(station) &&
        isNonEmptyString(station.id) &&
        isLiteral(station.kind, ["meal", "sleep", "break"]) &&
        isRecord(station.position) &&
        isIntegerInRange(station.position.x, 0, 127) &&
        isIntegerInRange(station.position.y, 0, 127),
      100,
    ) &&
    isRecord(value.schedules) &&
    Object.values(value.schedules).every(
      (schedule) =>
        isArrayOf(
          schedule,
          (block) => isLiteral(block, ["work", "free", "sleep"]),
          24,
        ) && schedule.length === 24,
    ) &&
    isRecord(value.activities) &&
    Object.values(value.activities).every(
      (activity) =>
        isRecord(activity) &&
        isLiteral(activity.kind, ["meal", "sleep", "break"]) &&
        isNonEmptyString(activity.stationId) &&
        isIntegerInRange(activity.progress, 0) &&
        isIntegerInRange(activity.startedTick, 0) &&
        typeof activity.mealConsumed === "boolean",
    ) &&
    isRecord(value.blockedReasons) &&
    Object.values(value.blockedReasons).every(isNonEmptyString)
  );
}

function routineReferencesValid(state: GameState): boolean {
  const ids = state.personnel.map(({ id }) => id);
  const routines = state.routines;
  const carried =
    routines.supplyOrder?.phase === "delivery"
      ? routines.supplyOrder.quantity
      : 0;
  if (
    routines.pantryMeals +
      routines.reserveMeals +
      routines.mealsConsumed +
      carried !==
    108
  )
    return false;
  if (routines.supplyOrder) {
    const supplyJob = state.jobs.find(
      ({ id }) => id === routines.supplyOrder!.jobId,
    );
    if (
      !supplyJob ||
      supplyJob.skillId !== "logistics" ||
      supplyJob.status === "completed" ||
      supplyJob.requiredProgress !== 1 ||
      supplyJob.assessment
    )
      return false;
    if (
      routines.supplyOrder.phase === "delivery" &&
      supplyJob.requiredWorkerId === null
    )
      return false;
    if (
      routines.supplyOrder.phase === "collection" &&
      routines.reserveMeals < routines.supplyOrder.quantity
    )
      return false;
  }
  if (
    Object.keys(routines.schedules).length !== ids.length ||
    !ids.every((id) => routines.schedules[id] !== undefined)
  )
    return false;
  if (
    new Set(routines.stations.map(({ id }) => id)).size !==
    routines.stations.length
  )
    return false;
  if (
    !routines.stations.every(({ position }) =>
      isWalkable(state.world.map, position),
    )
  )
    return false;
  if (!Object.keys(routines.blockedReasons).every((id) => ids.includes(id)))
    return false;
  const reserved = new Set<string>();
  return Object.entries(routines.activities).every(([id, activity]) => {
    const person = state.personnel.find((person) => person.id === id);
    const station = routines.stations.find(
      ({ id }) => id === activity.stationId,
    );
    if (
      !person ||
      person.currentJobId !== null ||
      !station ||
      station.kind !== activity.kind ||
      reserved.has(station.id) ||
      activity.startedTick > state.tick
    )
      return false;
    if (activity.kind !== "meal" && activity.mealConsumed) return false;
    if (
      activity.kind === "meal" &&
      activity.progress > 0 &&
      !activity.mealConsumed
    )
      return false;
    reserved.add(station.id);
    return true;
  });
}

function isObservationState(value: unknown): boolean {
  return (
    isRecord(value) &&
    isArrayOf(
      value.knownTiles,
      (tile) =>
        tile === null ||
        isLiteral(tile, ["grass", "floor", "wall", "door", "closed-door"]),
      16384,
    ) &&
    isArrayOf(
      value.tileLastSeen,
      (tick) => isIntegerInRange(tick, -1),
      16384,
    ) &&
    isArrayOf(
      value.visibleTiles,
      (index) => isIntegerInRange(index, 0, 16383),
      16384,
    ) &&
    isArrayOf(value.visibleEntityIds, isNonEmptyString, 100) &&
    isRecord(value.entities) &&
    Object.entries(value.entities).every(
      ([id, entry]) =>
        isRecord(entry) &&
        entry.id === id &&
        isRecord(entry.position) &&
        isIntegerInRange(entry.position.x, 0, 127) &&
        isIntegerInRange(entry.position.y, 0, 127) &&
        isIntegerInRange(entry.observedTick, 0) &&
        isArrayOf(entry.sources, isNonEmptyString, 200) &&
        entry.sources.length > 0 &&
        isString(entry.activity) &&
        isNullableString(entry.moodAppearance) &&
        isNullableString(entry.sanityAppearance) &&
        isNullableString(entry.blockedReason),
    ) &&
    isArrayOf(
      value.knownRooms,
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
        isIntegerInRange(room.x, 0, 127) &&
        isIntegerInRange(room.y, 0, 127) &&
        isIntegerInRange(room.width, 1, 128 - room.x) &&
        isIntegerInRange(room.height, 1, 128 - room.y),
      128,
    ) &&
    (value.scp999 === null ||
      (isRecord(value.scp999) &&
        isScp999State(value.scp999.state) &&
        isIntegerInRange(value.scp999.observedTick, 0))) &&
    isIntegerInRange(value.cameraKits, 0, 3) &&
    isArrayOf(
      value.cameras,
      (camera) =>
        isRecord(camera) &&
        isNonEmptyString(camera.id) &&
        isNonEmptyString(camera.name) &&
        isRecord(camera.position) &&
        isIntegerInRange(camera.position.x, 0, 127) &&
        isIntegerInRange(camera.position.y, 0, 127) &&
        typeof camera.enabled === "boolean" &&
        isIntegerInRange(camera.range, 1, 12) &&
        isNullableString(camera.installJobId),
      6,
    )
  );
}

function observationReferencesValid(state: GameState): boolean {
  const knowledge = state.observations;
  const size = state.world.map.width * state.world.map.height;
  if (
    knowledge.knownTiles.length !== size ||
    knowledge.tileLastSeen.length !== size ||
    knowledge.tileLastSeen.some(
      (tick, index) =>
        tick > state.tick ||
        (knowledge.knownTiles[index] === null) !== (tick === -1),
    )
  )
    return false;
  const visible = new Set(knowledge.visibleTiles);
  if (
    visible.size !== knowledge.visibleTiles.length ||
    knowledge.visibleTiles.some(
      (index) =>
        index >= size ||
        knowledge.knownTiles[index] === null ||
        knowledge.tileLastSeen[index] !== state.tick,
    )
  )
    return false;
  const entityIds = [...state.personnel.map(({ id }) => id), "SCP-999"];
  const sourceIds = new Set([
    ...entityIds,
    ...knowledge.cameras.map(({ id }) => id),
  ]);
  if (
    Object.entries(knowledge.entities).some(
      ([id, observation]) =>
        !entityIds.includes(id) ||
        observation.observedTick > state.tick ||
        observation.sources.some((source) => !sourceIds.has(source)),
    )
  )
    return false;
  if (
    new Set(knowledge.visibleEntityIds).size !==
      knowledge.visibleEntityIds.length ||
    knowledge.visibleEntityIds.some((id) => {
      const entry = knowledge.entities[id];
      return (
        !entry ||
        entry.observedTick !== state.tick ||
        !visible.has(
          entry.position.y * state.world.map.width + entry.position.x,
        )
      );
    })
  )
    return false;
  if (knowledge.scp999 && knowledge.scp999.observedTick > state.tick)
    return false;
  if (
    new Set(knowledge.cameras.map(({ id }) => id)).size !==
      knowledge.cameras.length ||
    knowledge.cameraKits +
      knowledge.cameras.filter(({ installJobId }) => installJobId !== null)
        .length !==
      3
  )
    return false;
  return knowledge.cameras.every(
    (camera) =>
      tileAt(state.world.map, camera.position) !== null &&
      (camera.installJobId === null ||
        state.jobs.some(
          (job) =>
            job.id === camera.installJobId &&
            job.skillId === "engineering" &&
            sameTile(job.workSite, camera.position),
        )),
  );
}

function isSurfaceRecord(
  value: unknown,
): value is Record<number, TileSurfaces> {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([key, cell]) =>
        isIntegerInRange(Number(key), 0, 16383) &&
        String(Number(key)) === key &&
        isRecord(cell) &&
        ["floor", "structure"].every((layer) => {
          const surface = cell[layer];
          return (
            surface === null ||
            (isRecord(surface) &&
              isNonEmptyString(surface.material) &&
              Object.hasOwn(MATERIALS, surface.material) &&
              isNumberInRange(surface.integrity, 0, 100) &&
              isLiteral(
                surface.kind,
                layer === "floor" ? ["floor"] : ["wall", "door", "closed-door"],
              ))
          );
        }),
    )
  );
}

function isTilePosition(value: unknown): boolean {
  return (
    isRecord(value) &&
    isIntegerInRange(value.x, 0, 127) &&
    isIntegerInRange(value.y, 0, 127)
  );
}

function isEnvironment(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.automaticRepairs === "boolean" &&
    isIntegerInRange(value.spentMaterials, 0, 160) &&
    isIntegerInRange(value.nextOrder, 1) &&
    isArrayOf(
      value.orders,
      (order) =>
        isRecord(order) &&
        isNonEmptyString(order.id) &&
        isNonEmptyString(order.jobId) &&
        isTilePosition(order.position) &&
        isLiteral(order.layer, ["floor", "structure"]) &&
        isNonEmptyString(order.material) &&
        Object.hasOwn(MATERIALS, order.material) &&
        isLiteral(order.phase, [
          "collecting",
          "delivering",
          "fitting",
          "completed",
        ]) &&
        isNullableString(order.blockedReason),
      1000,
    ) &&
    isArrayOf(
      value.sources,
      (source) =>
        isRecord(source) &&
        isNonEmptyString(source.id) &&
        isNonEmptyString(source.name) &&
        isTilePosition(source.position) &&
        isLiteral(source.kind, ["corrosion", "impact"]) &&
        isNumberInRange(source.dose, 0, 1000) &&
        isIntegerInRange(source.radius, 0, 16),
      32,
    )
  );
}

function environmentReferencesValid(state: GameState): boolean {
  const environment = state.environment;
  if (
    environment.nextOrder !== environment.orders.length + 1 ||
    new Set(environment.orders.map((order) => order.id)).size !==
      environment.orders.length
  )
    return false;
  if (
    environment.spentMaterials !==
    environment.orders.reduce(
      (sum, order) => sum + MATERIALS[order.material].cost,
      0,
    )
  )
    return false;
  if (
    !isSurfaceRecord(state.world.map.surfaces) ||
    !isSurfaceRecord(state.observations.knownSurfaces)
  )
    return false;
  if (
    !state.world.map.tiles.every(
      (tile, index) =>
        tile ===
        (state.world.map.surfaces[index]
          ? surfaceTile(state.world.map.surfaces[index]!)
          : "grass"),
    )
  )
    return false;
  if (
    !Object.entries(state.observations.knownSurfaces).every(
      ([key, cell]) =>
        state.observations.knownTiles[Number(key)] === surfaceTile(cell),
    )
  )
    return false;
  if (
    new Set(environment.sources.map((source) => source.id)).size !==
    environment.sources.length
  )
    return false;
  const active = environment.orders
    .filter((order) => order.phase !== "completed")
    .map((order) => `${order.position.x},${order.position.y}:${order.layer}`);
  if (
    new Set(active).size !== active.length ||
    state.jobs.filter((job) => job.id.startsWith("job-surface-")).length !==
      environment.orders.length
  )
    return false;
  return (
    environment.sources.every(
      (source) => tileAt(state.world.map, source.position) !== null,
    ) &&
    environment.orders.every((order, index) => {
      if (
        order.id !== `surface-${index + 1}` ||
        order.jobId !== `job-${order.id}`
      )
        return false;
      const job = state.jobs.find((job) => job.id === order.jobId);
      if (
        !job ||
        !state.world.map.surfaces[
          order.position.y * state.world.map.width + order.position.x
        ]?.[order.layer]
      )
        return false;
      if (order.phase === "completed") return job.status === "completed";
      if (job.status === "completed" && !order.blockedReason) return false;
      return (
        job.skillId ===
          (order.phase === "fitting" ? "engineering" : "logistics") &&
        (order.phase === "collecting"
          ? sameTile(job.workSite, state.construction.stockpile)
          : Math.abs(job.workSite.x - order.position.x) +
              Math.abs(job.workSite.y - order.position.y) ===
            1) &&
        (order.phase === "delivering"
          ? job.requiredWorkerId !== null
          : job.requiredWorkerId === null)
      );
    })
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
    !isArrayOf(value.clinicalCare.clinicianIds, isNonEmptyString, 100) ||
    [
      value.clinicalCare.moodReviewInterval,
      value.clinicalCare.psychiatricReviewInterval,
      value.clinicalCare.anomalousReviewInterval,
    ].some(
      (interval) =>
        interval !== undefined &&
        ![0, 240, 480, 1440].includes(interval as number),
    )
  )
    return false;
  if (typeof value.capabilities.anomalousPsychometrics !== "boolean")
    return false;
  if (
    !isArrayOf(value.jobs, isSiteJob) ||
    !isArrayOf(value.personnel, isPersonnelRecord) ||
    !isScp999State(value.scp999) ||
    !isSiteWorld(value.world) ||
    !isConstructionState(value.construction) ||
    !isRoutineState(value.routines) ||
    !isObservationState(value.observations) ||
    !isEnvironment(value.environment)
  )
    return false;
  const state = value as unknown as GameState;
  const personIds = state.personnel.map(({ id }) => id);
  const entityIds = [...personIds, "SCP-999"];
  return (
    new Set(state.clinicalCare.clinicianIds).size ===
      state.clinicalCare.clinicianIds.length &&
    state.clinicalCare.clinicianIds.every((id) =>
      state.personnel.some((person) => person.id === id),
    ) &&
    constructionReferencesValid(state) &&
    routineReferencesValid(state) &&
    observationReferencesValid(state) &&
    environmentReferencesValid(state) &&
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
