import { GAME_STATE_VERSION, type GameState } from "../../simulation/state";
import {
  EXPEDITION_SCENARIOS,
  expeditionScenario,
} from "../../simulation/expedition-site";
import { combatStateValid } from "./combat-persistence";
import { actionQueuesValid } from "./queue-persistence";
import {
  awayPersonnel,
  fieldState,
  EXPEDITION_ASSEMBLY,
} from "../../simulation/expeditions";
import { isElectrical } from "../../simulation/power";
import {
  activeVesselOrder,
  vesselOrderCost,
} from "../../simulation/vessel-work";
import {
  isActiveSurfaceOrder,
  surfaceOrderCost,
} from "../../simulation/environment";
import {
  storageContains,
  servingMealCount,
  storageTiles,
  storageQuantity,
  incomingQuantity,
  type StorageArea,
} from "../../simulation/storage";
import {
  OBJECT_DEFINITIONS,
  objectBlocks,
  objectFootprint,
  reservedObject,
  type PhysicalObject,
} from "../../simulation/objects";
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
    isNullableTick(value.expiresAtTick) &&
    (value.causes === undefined ||
      (value.kind === "injury" &&
        isArrayOf(
          value.causes,
          (cause) =>
            isRecord(cause) &&
            isNonEmptyString(cause.sourceId) &&
            isNonEmptyString(cause.sourceName) &&
            isNonEmptyString(cause.mapId) &&
            isNonEmptyString(cause.locationName) &&
            isIntegerInRange(cause.tick, 0) &&
            isIntegerInRange(cause.gameMinute, 0),
        )))
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
    value.kind === "mood" &&
    isIntegerInRange(value.assessedTick, 0) &&
    isIntegerInRange(value.recordedOrder, 0) &&
    isNonEmptyString(value.assessor) &&
    isNumberInRange(value.confidence, 0, 1) &&
    isNonEmptyString(value.summary) &&
    isRecord(value.moodEstimate) &&
    isNumberInRange(value.moodEstimate.minimum, 0, 100) &&
    isNumberInRange(value.moodEstimate.maximum, value.moodEstimate.minimum, 100)
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
    !isArrayOf(value.tags, (tag) => isLiteral(tag, TRAIT_TAGS))
  ) {
    return false;
  }
  return (
    value.parameters === undefined ||
    (isRecord(value.parameters) &&
      Object.values(value.parameters).every(isFiniteNumber))
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
        ]) &&
        value.skillId === "medical")) &&
    isNonEmptyString(value.description) &&
    isLiteral(value.skillId, SKILL_IDS) &&
    isIntegerInRange(value.priority, 0) &&
    (value.priorityOverride === undefined ||
      isLiteral(value.priorityOverride, ["low", "normal", "high"])) &&
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
    isIntegerInRange(value.reserveMeals, 0, 108) &&
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
        (activity.source === undefined ||
          isLiteral(activity.source, [
            "schedule",
            "need",
            "autonomy",
            "player",
          ])) &&
        typeof activity.mealConsumed === "boolean",
    ) &&
    isRecord(value.blockedReasons) &&
    Object.values(value.blockedReasons).every(isNonEmptyString)
  );
}

function routineReferencesValid(state: GameState): boolean {
  const ids = state.personnel.map(({ id }) => id);
  const routines = state.routines;
  if (
    routines.pantryMeals + routines.reserveMeals + routines.mealsConsumed !==
    108
  )
    return false;
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
    if (activity.source === "player") {
      const current = state.actionQueues?.[id]?.current;
      if (
        !current?.started ||
        !["eat", "sleep", "relax"].includes(current.intent.action) ||
        current.intent.targetId !== `object:${activity.stationId}` ||
        !state.combat.responders[id]?.drafted
      )
        return false;
    }
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
    isIntegerInRange(value.nextOrder, 1) &&
    isArrayOf(
      value.orders,
      (order) =>
        isRecord(order) &&
        isNonEmptyString(order.id) &&
        isNonEmptyString(order.jobId) &&
        isTilePosition(order.position) &&
        isLiteral(order.layer, ["floor", "structure"]) &&
        (order.operation === undefined ||
          isLiteral(order.operation, [
            "replace",
            "floor",
            "wall",
            "door",
            "remove",
          ])) &&
        (order.operation !== "floor" || order.layer === "floor") &&
        (!["wall", "door"].includes(String(order.operation)) ||
          order.layer === "structure") &&
        (order.operation !== "remove" ||
          ["fitting", "completed", "cancelled"].includes(
            String(order.phase),
          )) &&
        (order.cancelRequested === undefined ||
          typeof order.cancelRequested === "boolean") &&
        (order.cancelRequested !== true || order.phase === "delivering") &&
        isNonEmptyString(order.material) &&
        Object.hasOwn(MATERIALS, order.material) &&
        isLiteral(order.phase, [
          "collecting",
          "delivering",
          "fitting",
          "completed",
          "cancelled",
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
        (source.objectId === undefined || isNonEmptyString(source.objectId)) &&
        isTilePosition(source.position) &&
        isLiteral(source.kind, ["corrosion", "impact"]) &&
        (source.enabled === undefined || typeof source.enabled === "boolean") &&
        isNumberInRange(source.dose, 0, 1000) &&
        isIntegerInRange(source.radius, 0, 16),
      32,
    )
  );
}

function environmentReferencesValid(state: GameState): boolean {
  const environment = state.environment;
  const policies = state.world.map.doorPolicies;
  if (
    policies !== undefined &&
    (!isRecord(policies) ||
      !Object.entries(policies).every(([key, policy]) => {
        const index = Number(key);
        const surface = state.world.map.surfaces[index]?.structure;
        return (
          String(index) === key &&
          isIntegerInRange(index, 0, state.world.map.tiles.length - 1) &&
          isLiteral(policy, ["automatic", "held-open", "held-closed"]) &&
          surface &&
          ["door", "closed-door"].includes(surface.kind) &&
          (surface.integrity === 0 ||
            policy === "automatic" ||
            surface.kind === (policy === "held-open" ? "door" : "closed-door"))
        );
      }))
  )
    return false;
  if (
    environment.nextOrder !== environment.orders.length + 1 ||
    new Set(environment.orders.map((order) => order.id)).size !==
      environment.orders.length
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
    .filter(isActiveSurfaceOrder)
    .map((order) => `${order.position.x},${order.position.y}:${order.layer}`);
  if (
    new Set(active).size !== active.length ||
    state.jobs.filter((job) => job.id.startsWith("job-surface-")).length !==
      environment.orders.filter((order) => order.phase !== "cancelled").length
  )
    return false;
  return (
    environment.sources.every(
      (source) =>
        tileAt(state.world.map, source.position) !== null &&
        (source.objectId === undefined ||
          state.objects.items.some(
            (item) =>
              item.id === source.objectId &&
              !OBJECT_DEFINITIONS[item.kind].stackable,
          )),
    ) &&
    environment.orders.every((order, index) => {
      if (
        order.id !== `surface-${index + 1}` ||
        order.jobId !== `job-${order.id}`
      )
        return false;
      const job = state.jobs.find((job) => job.id === order.jobId);
      if (order.phase === "cancelled")
        return (
          !job &&
          !order.blockedReason &&
          !reservedObject(state.objects, order.jobId)
        );
      if (!job) return false;
      if (order.phase === "completed") return job.status === "completed";
      if (job.status === "completed" && !order.blockedReason) return false;
      return (
        job.skillId ===
          (order.phase === "fitting" ? "engineering" : "logistics") &&
        (order.phase === "collecting"
          ? (() => {
              const cargo = reservedObject(state.objects, job.id);
              return (
                cargo?.location.kind === "ground" &&
                sameTile(job.workSite, cargo.location.position)
              );
            })()
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

function isPhysicalObject(value: unknown): value is PhysicalObject {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.kind) ||
    !Object.hasOwn(OBJECT_DEFINITIONS, value.kind) ||
    !isIntegerInRange(value.quantity, 0, 1000) ||
    !isNumberInRange(value.condition, 0, 100) ||
    typeof value.installed !== "boolean" ||
    !isLiteral(value.orientation, ["north", "east", "south", "west"]) ||
    !isNullableString(value.reservedBy) ||
    (value.utilityEnabled !== undefined &&
      (typeof value.utilityEnabled !== "boolean" ||
        !["generator", "cable", "light"].includes(String(value.kind)))) ||
    !isRecord(value.location)
  )
    return false;
  if (
    value.kind === "vessel"
      ? !isRecord(value.vessel) ||
        !isNonEmptyString(value.vessel.material) ||
        !Object.hasOwn(MATERIALS, value.vessel.material) ||
        typeof value.vessel.sealed !== "boolean" ||
        value.installed
      : value.vessel !== undefined
  )
    return false;
  if (value.location.kind === "consumed")
    return (
      value.quantity === 0 && !value.installed && value.reservedBy === null
    );
  if (
    value.quantity === 0 ||
    (!OBJECT_DEFINITIONS[value.kind as keyof typeof OBJECT_DEFINITIONS]
      .stackable &&
      value.quantity !== 1)
  )
    return false;
  if (value.location.kind === "contained")
    return (
      value.kind !== "vessel" &&
      !OBJECT_DEFINITIONS[value.kind as keyof typeof OBJECT_DEFINITIONS]
        .stackable &&
      !value.installed &&
      value.reservedBy === null &&
      isNonEmptyString(value.location.vesselId)
    );
  if (value.location.kind === "transit")
    return (
      value.kind === "vessel" &&
      !value.installed &&
      isNonEmptyString(value.location.orderId) &&
      value.reservedBy !== null
    );
  return value.location.kind === "ground"
    ? isTilePosition(value.location.position)
    : value.location.kind === "carried" &&
        isNonEmptyString(value.location.personId) &&
        !value.installed &&
        value.reservedBy !== null;
}

function objectsValid(state: GameState): boolean {
  const items = state.objects.items;
  if (new Set(items.map((item) => item.id)).size !== items.length) return false;
  const contents = items.filter((item) => item.location.kind === "contained");
  if (
    new Set(
      contents.map((item) =>
        item.location.kind === "contained" ? item.location.vesselId : "",
      ),
    ).size !== contents.length
  )
    return false;
  if (
    contents.some(
      (item) =>
        item.location.kind === "contained" &&
        !items.some(
          (vessel) =>
            item.location.kind === "contained" &&
            vessel.id === item.location.vesselId &&
            vessel.kind === "vessel" &&
            vessel.location.kind !== "consumed",
        ),
    )
  )
    return false;
  if (
    items.some(
      (item) =>
        /^object-\d+$/.test(item.id) &&
        Number(item.id.slice(7)) >= state.objects.nextId,
    )
  )
    return false;
  const carried = items.filter((item) => item.location.kind === "carried");
  if (
    new Set(
      carried.map((item) =>
        item.location.kind === "carried" ? item.location.personId : "",
      ),
    ).size !== carried.length
  )
    return false;
  for (const item of items) {
    if (
      item.location.kind === "transit" &&
      !state.vesselWork.orders.some(
        (order) =>
          item.location.kind === "transit" &&
          order.id === item.location.orderId &&
          order.phase === "transit" &&
          order.vesselId === item.id &&
          order.jobId === item.reservedBy,
      )
    )
      return false;
    const routineCarrier = item.reservedBy?.startsWith("routine-")
      ? item.reservedBy.slice(8)
      : null;
    if (
      routineCarrier &&
      state.routines.activities[routineCarrier]?.mealObjectId !== item.id
    )
      return false;
    if (
      item.reservedBy &&
      !routineCarrier &&
      !state.jobs.some((job) => job.id === item.reservedBy)
    )
      return false;
    if (item.location.kind === "carried") {
      const carrierId = item.location.personId;
      const job = state.jobs.find((job) => job.id === item.reservedBy);
      if (
        !state.personnel.some((person) => person.id === carrierId) ||
        (routineCarrier
          ? routineCarrier !== carrierId
          : job?.requiredWorkerId !== carrierId)
      )
        return false;
    }
    if (item.location.kind === "ground") {
      if (tileAt(state.world.map, item.location.position) === null)
        return false;
      if (
        item.installed &&
        (OBJECT_DEFINITIONS[item.kind].stackable ||
          objectFootprint(item, item.location.position).some(
            (position) =>
              !(
                item.kind === "cable"
                  ? ["grass", "floor", "door", "closed-door"]
                  : ["grass", "floor", "door"]
              ).includes(tileAt(state.world.map, position) ?? ""),
          ))
      )
        return false;
    }
  }
  if (
    JSON.stringify(objectBlocks(state.objects, state.world.map.width)) !==
    JSON.stringify(state.world.map.objectBlocks ?? [])
  )
    return false;
  const occupied = new Set<number>();
  const conduit = new Set<number>();
  for (const item of items)
    if (item.installed && item.location.kind === "ground")
      for (const position of objectFootprint(item, item.location.position)) {
        const index = position.y * state.world.map.width + position.x;
        const layer = item.kind === "cable" ? conduit : occupied;
        if (layer.has(index)) return false;
        layer.add(index);
      }
  for (const [personId, activity] of Object.entries(
    state.routines.activities,
  )) {
    const furniture = items.find((item) => item.id === activity.stationId);
    if (
      !furniture?.installed ||
      furniture.location.kind !== "ground" ||
      OBJECT_DEFINITIONS[furniture.kind].activity !== activity.kind
    )
      return false;
    if (
      activity.mealObjectId &&
      !items.some(
        (item) =>
          item.id === activity.mealObjectId &&
          item.kind === "meals" &&
          item.quantity === 1 &&
          item.location.kind === "carried" &&
          item.location.personId === personId &&
          item.reservedBy === `routine-${personId}`,
      )
    )
      return false;
  }
  for (const order of state.environment.orders)
    if (isActiveSurfaceOrder(order) && order.operation !== "remove") {
      const cargo = reservedObject(state.objects, order.jobId);
      if (
        !cargo ||
        cargo.kind !== "materials" ||
        cargo.quantity !== surfaceOrderCost(order) ||
        (order.phase === "delivering"
          ? cargo.location.kind !== "carried"
          : cargo.location.kind !== "ground")
      )
        return false;
    }
  const carriedMeals = items
    .filter(
      (item) =>
        item.kind === "meals" &&
        item.location.kind === "carried" &&
        item.reservedBy?.startsWith("routine-"),
    )
    .reduce((sum, item) => sum + item.quantity, 0);
  if (
    items
      .filter((item) => item.kind === "meals")
      .reduce((sum, item) => sum + item.quantity, 0) +
      state.routines.mealsConsumed -
      carriedMeals !==
    108
  )
    return false;
  if (
    new Set(
      state.objectOrders
        .filter((order) => !["completed", "cancelled"].includes(order.phase))
        .map((order) => order.objectId),
    ).size !==
    state.objectOrders.filter(
      (order) => !["completed", "cancelled"].includes(order.phase),
    ).length
  )
    return false;
  return state.objectOrders.every((order, index) => {
    if (
      order.id !== `object-order-${index + 1}` ||
      order.jobId !== `job-${order.id}`
    )
      return false;
    const item = items.find((item) => item.id === order.objectId);
    const job = state.jobs.find((job) => job.id === order.jobId);
    if (!item) return false;
    if (order.phase === "cancelled") return !job;
    if (!job) return false;
    if (order.phase === "completed") return job.status === "completed";
    if (
      item.reservedBy !== job.id ||
      job.skillId !== (order.phase === "install" ? "engineering" : "logistics")
    )
      return false;
    if (order.phase === "carry")
      return (
        item.location.kind === "carried" &&
        job.requiredWorkerId === item.location.personId
      );
    return item.location.kind === "ground";
  });
}

function isStorageArea(value: unknown): value is StorageArea {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    value.name.length <= 60 &&
    isTilePosition(value.origin) &&
    isIntegerInRange(value.width, 1, 8) &&
    isIntegerInRange(value.height, 1, 8) &&
    isIntegerInRange(value.capacity, 1, 1000) &&
    isIntegerInRange(value.target, 0, value.capacity as number) &&
    (value.emission === undefined ||
      isLiteral(value.emission, ["any", "none", "active"])) &&
    typeof value.enabled === "boolean" &&
    typeof value.serveMeals === "boolean" &&
    isArrayOf(
      value.accepts,
      (kind) =>
        isNonEmptyString(kind) && Object.hasOwn(OBJECT_DEFINITIONS, kind),
      Object.keys(OBJECT_DEFINITIONS).length,
    ) &&
    value.accepts.length > 0 &&
    new Set(value.accepts).size === value.accepts.length &&
    (!value.serveMeals || value.accepts.includes("meals"))
  );
}
function storageReferencesValid(state: GameState): boolean {
  const occupied = new Set<number>();
  if (
    new Set(state.storage.areas.map((area) => area.id)).size !==
    state.storage.areas.length
  )
    return false;
  for (const area of state.storage.areas) {
    if (
      !/^storage-[1-9]\d*$/.test(area.id) ||
      Number(area.id.slice(8)) >= state.storage.nextId
    )
      return false;
    if (
      storageQuantity(state, area) + incomingQuantity(state, area) >
      area.capacity
    )
      return false;
    for (const position of storageTiles(area)) {
      if (tileAt(state.world.map, position) === null) return false;
      const index = position.y * state.world.map.width + position.x;
      if (occupied.has(index)) return false;
      occupied.add(index);
    }
  }
  if (
    !Object.keys(state.storage.blockedReasons).every((id) =>
      state.storage.areas.some((area) => area.id === id),
    )
  )
    return false;
  if (state.routines.pantryMeals !== servingMealCount(state)) return false;
  return state.objectOrders.every((order) => {
    if (["completed", "cancelled"].includes(order.phase)) return true;
    const area = state.storage.areas.find((area) =>
      storageContains(area, order.destination),
    );
    const item = state.objects.items.find((item) => item.id === order.objectId);
    return (
      !area ||
      (item?.kind === "cable" && order.install) ||
      (!!item && !order.install && area.accepts.includes(item.kind))
    );
  });
}

function vesselReferencesValid(state: GameState): boolean {
  const orders = state.vesselWork.orders;
  if (
    state.vesselWork.nextId !== orders.length + 1 ||
    state.jobs.filter((job) => job.id.startsWith("job-vessel-order-"))
      .length !== orders.filter((order) => order.phase !== "cancelled").length
  )
    return false;
  const crafted = orders.filter(
    (order) => order.action === "craft" && order.phase === "completed",
  );
  if (
    state.objects.items
      .filter((item) => item.kind === "vessel")
      .some(
        (item) =>
          !crafted.some(
            (order) =>
              order.vesselId === item.id &&
              order.material === item.vessel?.material,
          ),
      )
  )
    return false;
  return orders.every((order, index) => {
    if (
      order.id !== `vessel-order-${index + 1}` ||
      order.jobId !== `job-${order.id}` ||
      (order.action === "craft" && order.vesselId !== `vessel-${index + 1}`)
    )
      return false;
    if (
      !["craft", "repair"].includes(order.action) &&
      ["collecting", "delivering"].includes(order.phase)
    )
      return false;
    if (order.phase === "transit" && order.action !== "transport") return false;
    if (order.action === "transport") {
      if (
        !order.transport ||
        !["truck", "helicopter"].includes(order.transport.mode) ||
        !isIntegerInRange(order.transport.duration, 30, 1440) ||
        !(
          order.transport.arrivesAt === null ||
          isIntegerInRange(order.transport.arrivesAt, order.transport.duration)
        )
      )
        return false;
      if (
        (order.phase === "working" || order.phase === "cancelled") !==
        (order.transport.arrivesAt === null)
      )
        return false;
    } else if (order.transport !== undefined) return false;
    const job = state.jobs.find((job) => job.id === order.jobId);
    const vessel = state.objects.items.find(
      (item) => item.id === order.vesselId,
    );
    const cargo = state.objects.items.find((item) => item.id === order.cargoId);
    if (
      order.action === "repair" &&
      (!vessel ||
        (isElectrical(vessel)
          ? order.material !== "steel"
          : vessel.kind !== "vessel" ||
            vessel.vessel?.material !== order.material))
    )
      return false;
    if (order.phase === "cancelled")
      return (
        !job &&
        !state.objects.items.some((item) => item.reservedBy === order.jobId)
      );
    if (!job) return false;
    if (order.phase === "transit")
      return (
        job.status === "completed" &&
        vessel?.location.kind === "transit" &&
        vessel.location.orderId === order.id &&
        vessel.reservedBy === job.id &&
        !!vessel.vessel?.sealed
      );
    if (
      job.status === "completed" &&
      activeVesselOrder(order) &&
      !order.blockedReason
    )
      return false;
    if (order.phase === "completed")
      return (
        job.status === "completed" &&
        !!vessel &&
        (vessel.kind === "vessel" ||
          (order.action === "repair" && isElectrical(vessel)))
      );
    if (order.action === "craft" || order.action === "repair") {
      if (
        (order.action === "craft"
          ? !!vessel
          : !vessel ||
            vessel.reservedBy !== order.jobId ||
            vessel.location.kind !== "ground" ||
            !sameTile(vessel.location.position, order.position)) ||
        !cargo ||
        cargo.kind !== "materials" ||
        cargo.reservedBy !== order.jobId ||
        cargo.quantity !== vesselOrderCost(order)
      )
        return false;
      if (
        job.skillId !==
        (order.phase === "working" ? "engineering" : "logistics")
      )
        return false;
      if (order.phase === "delivering")
        return (
          cargo.location.kind === "carried" &&
          job.requiredWorkerId === cargo.location.personId
        );
      return (
        cargo.location.kind === "ground" &&
        sameTile(cargo.location.position, job.workSite) &&
        job.requiredWorkerId === null
      );
    }
    if (
      vessel?.kind !== "vessel" ||
      vessel.reservedBy !== job.id ||
      vessel.location.kind !== "ground" ||
      job.requiredWorkerId !== null
    )
      return false;
    if (order.action === "load")
      return (
        !!cargo &&
        cargo.kind !== "vessel" &&
        !OBJECT_DEFINITIONS[cargo.kind].stackable &&
        !cargo.installed &&
        cargo.location.kind === "ground" &&
        cargo.reservedBy === job.id
      );
    if (order.action === "unload")
      return (
        cargo?.location.kind === "contained" &&
        cargo.location.vesselId === vessel.id
      );
    return (
      order.cargoId === null &&
      job.skillId ===
        (order.action === "transport" ? "logistics" : "engineering")
    );
  });
}

function expeditionsValid(state: GameState): boolean {
  const expeditions = state.expeditions;
  if (
    !isRecord(expeditions) ||
    !isIntegerInRange(expeditions.nextId, 1) ||
    !isArrayOf(
      expeditions.notices,
      (notice) =>
        isRecord(notice) &&
        isNonEmptyString(notice.id) &&
        EXPEDITION_SCENARIOS.some(
          (scenario) => scenario.noticeId === notice.id,
        ) &&
        isNonEmptyString(notice.title) &&
        isNonEmptyString(notice.report) &&
        isLiteral(notice.status, ["available", "assigned", "resolved"]),
      20,
    ) ||
    !isArrayOf(
      expeditions.history,
      (entry) =>
        isRecord(entry) &&
        isNonEmptyString(entry.id) &&
        isNonEmptyString(entry.noticeId) &&
        EXPEDITION_SCENARIOS.some(
          (scenario) => scenario.noticeId === entry.noticeId,
        ) &&
        isIntegerInRange(entry.returnedAt, 0, state.tick) &&
        isArrayOf(entry.team, isNonEmptyString, 3) &&
        isArrayOf(entry.cargo, isNonEmptyString, 20),
      20,
    )
  )
    return false;
  if (
    new Set(expeditions.notices.map((notice) => notice.id)).size !==
      expeditions.notices.length ||
    new Set(expeditions.history.map((entry) => entry.id)).size !==
      expeditions.history.length
  )
    return false;
  const active = expeditions.active;
  if (active === null)
    return !expeditions.notices.some((notice) => notice.status === "assigned");
  if (
    !isRecord(active) ||
    !isNonEmptyString(active.id) ||
    !EXPEDITION_SCENARIOS.some(
      (scenario) => scenario.noticeId === active.noticeId,
    ) ||
    !/^expedition-[1-9]\d*$/.test(active.id) ||
    Number(active.id.slice(11)) >= expeditions.nextId ||
    !isLiteral(active.phase, [
      "assembling",
      "outbound",
      "field",
      "regrouping",
      "inbound",
    ]) ||
    !isArrayOf(active.team, isNonEmptyString, 3) ||
    active.team.length < 2 ||
    new Set(active.team).size !== active.team.length ||
    active.team.some(
      (id) => !state.personnel.some((person) => person.id === id),
    ) ||
    !isArrayOf(active.previouslyDrafted, isNonEmptyString, 3) ||
    active.previouslyDrafted.some((id) => !active.team.includes(id)) ||
    !isRecord(active.returnPositions) ||
    Object.keys(active.returnPositions).length !== active.team.length ||
    !active.team.every(
      (id) =>
        isTilePosition(active.returnPositions[id]) &&
        sameTile(active.returnPositions[id]!, EXPEDITION_ASSEMBLY),
    ) ||
    !isArrayOf(active.cargo, isNonEmptyString, 20) ||
    new Set(active.cargo).size !== active.cargo.length ||
    !isArrayOf(
      active.recoveryOrders,
      (order) =>
        isRecord(order) &&
        active.team.includes(String(order.personId)) &&
        isNonEmptyString(order.objectId) &&
        isIntegerInRange(order.progress, 0, 6) &&
        isLiteral(order.phase, ["collecting", "carrying", "delivered"]) &&
        isNullableString(order.blockedReason),
      20,
    )
  )
    return false;
  if (
    expeditions.notices.filter((notice) => notice.status === "assigned")
      .length !== 1 ||
    !expeditions.notices.some(
      (notice) => notice.id === active.noticeId && notice.status === "assigned",
    )
  )
    return false;
  if (
    !isRecord(active.reserves) ||
    Object.keys(active.reserves).length !== active.team.length ||
    !active.team.every(
      (id) =>
        isRecord(active.reserves[id]) &&
        isIntegerInRange(active.reserves[id]!.ammunition, 0, 12) &&
        isIntegerInRange(active.reserves[id]!.medicalSupplies, 0, 2),
    )
  )
    return false;
  const scenario = expeditionScenario(active.noticeId);
  const travelling = active.phase === "outbound" || active.phase === "inbound";
  if (
    travelling
      ? !isIntegerInRange(
          active.arrivesAt,
          0,
          state.tick + scenario.travelMinutes,
        )
      : active.arrivesAt !== null
  )
    return false;
  if (active.phase === "assembling")
    return (
      active.site === null &&
      !active.cargo.length &&
      !active.recoveryOrders.length &&
      active.team.every(
        (id) =>
          state.combat.responders[id]?.drafted &&
          !!state.world.positions[id] &&
          active.reserves[id]!.ammunition <=
            state.combat.responders[id]!.ammunition &&
          active.reserves[id]!.medicalSupplies <=
            state.combat.responders[id]!.medicalSupplies,
      )
    );
  if (
    !isRecord(active.site) ||
    !isSiteWorld(active.site.world) ||
    !isRecord(active.site.objects) ||
    !isIntegerInRange(active.site.objects.nextId, 1) ||
    !isArrayOf(active.site.objects.items, isPhysicalObject, 20) ||
    !isObservationState(active.site.observations) ||
    !isEnvironment(active.site.environment) ||
    !isSurfaceRecord(active.site.world.map.surfaces)
  )
    return false;
  const authoredSite = scenario.createSite(active.id);
  if (
    active.site.world.map.id !== `field-${active.id}` ||
    active.site.world.map.width !== authoredSite.world.map.width ||
    active.site.world.map.height !== authoredSite.world.map.height
  )
    return false;
  if (
    active.team.some(
      (id) =>
        state.world.positions[id] ||
        state.combat.responders[id] ||
        state.personnel.find((person) => person.id === id)?.currentJobId ||
        state.routines.activities[id] ||
        state.jobs.some(
          (job) =>
            job.status === "in-progress" &&
            (job.assignedPersonId === id || job.assessment?.patientId === id),
        ),
    )
  )
    return false;
  if (
    Object.keys(active.site.world.positions).length !==
      (travelling ? 0 : active.team.length) ||
    (!travelling &&
      !active.team.every(
        (id) =>
          !!active.site!.world.positions[id] &&
          isWalkable(active.site!.world.map, active.site!.world.positions[id]!),
      ))
  )
    return false;
  const site = active.site;
  const expectedObjects = authoredSite.objects.items.map((item) => item.id);
  if (
    site.objects.items.length !== expectedObjects.length ||
    new Set(site.objects.items.map((item) => item.id)).size !==
      expectedObjects.length ||
    site.objects.items.some(
      (item) =>
        !expectedObjects.includes(item.id) ||
        state.objects.items.some((base) => base.id === item.id) ||
        item.kind !==
          authoredSite.objects.items.find((authored) => authored.id === item.id)
            ?.kind ||
        item.quantity !== 1 ||
        item.installed ||
        !["ground", "carried"].includes(item.location.kind) ||
        (item.location.kind === "ground" &&
          tileAt(site.world.map, item.location.position) === null),
    )
  )
    return false;
  if (
    new Set(active.recoveryOrders.map((order) => order.objectId)).size !==
      active.recoveryOrders.length ||
    new Set(
      active.recoveryOrders
        .filter((order) => order.phase !== "delivered")
        .map((order) => order.personId),
    ).size !==
      active.recoveryOrders.filter((order) => order.phase !== "delivered")
        .length
  )
    return false;
  for (const item of site.objects.items) {
    const order = active.recoveryOrders.find(
      (order) => order.objectId === item.id,
    );
    if (!order) {
      if (item.reservedBy !== null || item.location.kind !== "ground")
        return false;
      continue;
    }
    if (
      order.phase === "carrying"
        ? item.location.kind !== "carried" ||
          item.location.personId !== order.personId ||
          item.reservedBy !== `recovery-${order.personId}`
        : item.location.kind !== "ground" ||
          item.reservedBy !==
            (order.phase === "delivered" ? null : `recovery-${order.personId}`)
    )
      return false;
    if ((order.phase === "delivered") !== active.cargo.includes(item.id))
      return false;
  }
  if (
    active.cargo.some(
      (id) =>
        !expectedObjects.includes(id) ||
        !active.recoveryOrders.some(
          (order) => order.objectId === id && order.phase === "delivered",
        ) ||
        !site.objects.items.some(
          (item) =>
            item.id === id &&
            item.location.kind === "ground" &&
            sameTile(item.location.position, scenario.extraction),
        ),
    ) ||
    site.environment.sources.length !==
      authoredSite.environment.sources.length ||
    site.environment.sources.some(
      (source) =>
        !authoredSite.environment.sources.some(
          (authored) =>
            authored.id === source.id && authored.objectId === source.objectId,
        ),
    ) ||
    site.environment.orders.length ||
    site.observations.cameras.length
  )
    return false;
  const field = fieldState(state)!;
  if (!environmentReferencesValid(field)) return false;
  const validationField = {
    ...field,
    objects: {
      ...field.objects,
      items: field.objects.items.filter(
        (item) => item.location.kind !== "carried",
      ),
    },
  };
  if (!combatStateValid(validationField)) return false;
  if (
    Object.keys(site.combat.responders).length !== active.team.length ||
    !active.team.every((id) => !!site.combat.responders[id]?.drafted)
  )
    return false;
  if (
    active.team.some(
      (id) =>
        site.combat.responders[id]!.ammunition +
          active.reserves[id]!.ammunition >
          12 ||
        site.combat.responders[id]!.medicalSupplies +
          active.reserves[id]!.medicalSupplies >
          2,
    )
  )
    return false;
  if (
    active.phase === "outbound" &&
    (site.combat.status !== "idle" || active.recoveryOrders.length)
  )
    return false;
  if (
    active.phase === "inbound" &&
    active.recoveryOrders.some((order) => order.phase !== "delivered")
  )
    return false;
  if (
    site.observations.knownTiles.length !==
      site.world.map.width * site.world.map.height ||
    site.observations.tileLastSeen.length !==
      site.world.map.width * site.world.map.height ||
    site.observations.visibleTiles.some(
      (index) =>
        index < 0 || index >= site.world.map.width * site.world.map.height,
    ) ||
    new Set(site.observations.visibleTiles).size !==
      site.observations.visibleTiles.length ||
    site.observations.tileLastSeen.some((tick) => tick > state.tick) ||
    site.observations.visibleEntityIds.some(
      (id) =>
        !active.team.includes(id) ||
        !site.observations.entities[id] ||
        !site.observations.visibleTiles.includes(
          site.observations.entities[id]!.position.y * site.world.map.width +
            site.observations.entities[id]!.position.x,
        ),
    ) ||
    Object.entries(site.observations.entities).some(
      ([id, observation]) =>
        !active.team.includes(id) ||
        observation.observedTick > state.tick ||
        observation.sources.some((source) => !active.team.includes(source)) ||
        tileAt(site.world.map, observation.position) === null,
    ) ||
    Object.entries(site.observations.objects).some(
      ([id, observation]) =>
        !expectedObjects.includes(id) ||
        !isPhysicalObject(observation.object) ||
        !isIntegerInRange(observation.observedTick, 0, state.tick),
    )
  )
    return false;
  return true;
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
  if (
    !isRecord(value.clinicalCare) ||
    ![0, 240, 480, 1440].includes(
      value.clinicalCare.reviewInterval as number,
    ) ||
    !isArrayOf(value.clinicalCare.clinicianIds, isNonEmptyString, 100) ||
    [
      value.clinicalCare.moodReviewInterval,
      value.clinicalCare.psychiatricReviewInterval,
    ].some(
      (interval) =>
        interval !== undefined &&
        ![0, 240, 480, 1440].includes(interval as number),
    )
  )
    return false;
  if (
    !isArrayOf(value.jobs, isSiteJob) ||
    !isArrayOf(value.personnel, isPersonnelRecord) ||
    !isScp999State(value.scp999) ||
    !isSiteWorld(value.world) ||
    !isRoutineState(value.routines) ||
    !isObservationState(value.observations) ||
    !isEnvironment(value.environment) ||
    !isRecord(value.vesselWork) ||
    !isIntegerInRange(value.vesselWork.nextId, 1) ||
    !isArrayOf(
      value.vesselWork.orders,
      (order) =>
        isRecord(order) &&
        isNonEmptyString(order.id) &&
        isNonEmptyString(order.jobId) &&
        isLiteral(order.action, [
          "craft",
          "repair",
          "load",
          "unload",
          "seal",
          "open",
          "transport",
        ]) &&
        isNonEmptyString(order.vesselId) &&
        isNullableString(order.cargoId) &&
        isNonEmptyString(order.material) &&
        Object.hasOwn(MATERIALS, order.material) &&
        isTilePosition(order.position) &&
        isLiteral(order.phase, [
          "collecting",
          "delivering",
          "working",
          "transit",
          "completed",
          "cancelled",
        ]) &&
        (order.transport === undefined ||
          (isRecord(order.transport) &&
            isLiteral(order.transport.mode, ["truck", "helicopter"]) &&
            isIntegerInRange(order.transport.duration, 30, 1440) &&
            (order.transport.arrivesAt === null ||
              isIntegerInRange(order.transport.arrivesAt, 0)))) &&
        isNullableString(order.blockedReason),
      1000,
    ) ||
    !isRecord(value.storage) ||
    !isIntegerInRange(value.storage.nextId, 1) ||
    !isArrayOf(value.storage.areas, isStorageArea, 32) ||
    !isRecord(value.storage.blockedReasons) ||
    !Object.values(value.storage.blockedReasons).every(isNonEmptyString) ||
    !isRecord(value.objects) ||
    !isIntegerInRange(value.objects.nextId, 1) ||
    !isArrayOf(value.objects.items, isPhysicalObject, 10000) ||
    !isArrayOf(
      value.objectOrders,
      (order) =>
        isRecord(order) &&
        isNonEmptyString(order.id) &&
        isNonEmptyString(order.objectId) &&
        isNonEmptyString(order.jobId) &&
        isTilePosition(order.destination) &&
        isLiteral(order.orientation, ["north", "east", "south", "west"]) &&
        typeof order.install === "boolean" &&
        isLiteral(order.phase, [
          "pickup",
          "carry",
          "install",
          "completed",
          "cancelled",
        ]) &&
        isNullableString(order.blockedReason),
      1000,
    ) ||
    !isRecord(value.observations) ||
    !isRecord(value.observations.objects) ||
    !Object.values(value.observations.objects).every(
      (observation) =>
        isRecord(observation) &&
        isPhysicalObject(observation.object) &&
        isIntegerInRange(observation.observedTick, 0, value.tick as number),
    )
  )
    return false;
  const state = value as unknown as GameState;
  const personIds = state.personnel.map(({ id }) => id);
  if (!expeditionsValid(state)) return false;
  if (
    !isRecord(state.actionTimings) ||
    Object.entries(state.actionTimings).some(
      ([id, timing]) =>
        !personIds.includes(id) ||
        !isRecord(timing) ||
        !isNonEmptyString(timing.key) ||
        !isIntegerInRange(timing.startedTick, 0, state.tick) ||
        (timing.doorStep !== undefined &&
          (!isRecord(timing.doorStep) ||
            !isIntegerInRange(
              timing.doorStep.tick,
              timing.startedTick as number,
              state.tick,
            ) ||
            !isRecord(timing.doorStep.position) ||
            !isIntegerInRange(
              timing.doorStep.position.x,
              0,
              (timing.mapId === state.world.map.id
                ? state.world.map.width
                : (state.expeditions.active?.site?.world.map.width ?? 0)) - 1,
            ) ||
            !isIntegerInRange(
              timing.doorStep.position.y,
              0,
              (timing.mapId === state.world.map.id
                ? state.world.map.height
                : (state.expeditions.active?.site?.world.map.height ?? 0)) - 1,
            ))) ||
        (timing.mapId !== state.world.map.id &&
          timing.mapId !== state.expeditions.active?.site?.world.map.id),
    )
  )
    return false;
  const away = awayPersonnel(state);
  const entityIds = [
    ...personIds.filter((id) => !away.includes(id)),
    "SCP-999",
  ];
  return (
    combatStateValid(state) &&
    actionQueuesValid(state) &&
    new Set(state.clinicalCare.clinicianIds).size ===
      state.clinicalCare.clinicianIds.length &&
    state.clinicalCare.clinicianIds.every((id) =>
      state.personnel.some((person) => person.id === id),
    ) &&
    routineReferencesValid(state) &&
    observationReferencesValid(state) &&
    environmentReferencesValid(state) &&
    objectsValid(state) &&
    vesselReferencesValid(state) &&
    storageReferencesValid(state) &&
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
