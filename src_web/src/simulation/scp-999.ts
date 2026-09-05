import {
  projectPsychology,
  type PersonnelEffect,
  type PersonnelRecord,
} from "./personnel";
import { findRoute, stepWorld, type SiteWorld } from "./world";
import { canObserve } from "./observations";

const INTERACTION_DURATION = 4;
const CALM_DURATION = 12;
const COOLDOWN_DURATION = 6;
const SOCIAL_PERCEPTION_RANGE = 6;
const IMMEDIATE_STRESS_RELIEF = 4;
const CALM_EFFECT_ID = "effect-comforted-by-999";

export interface Scp999State {
  readonly id: "SCP-999";
  readonly status: "wandering" | "approaching" | "comforting" | "resting";
  readonly targetPersonId: string | null;
  readonly interactionEndsAtTick: number | null;
  readonly nextAvailableTick: number;
  readonly lastInteraction: {
    readonly personId: string;
    readonly completedTick: number;
  } | null;
}

export interface Scp999AdvanceResult {
  readonly anomaly: Scp999State;
  readonly personnel: readonly PersonnelRecord[];
  readonly world: SiteWorld;
}

export function createScp999State(): Scp999State {
  return {
    id: "SCP-999",
    status: "wandering",
    targetPersonId: null,
    interactionEndsAtTick: null,
    nextAvailableTick: 0,
    lastInteraction: null,
  };
}

function hasCalmEffect(person: PersonnelRecord): boolean {
  return person.effects.some(({ id }) => id === CALM_EFFECT_ID);
}

function selectTarget(
  personnel: readonly PersonnelRecord[],
  world: SiteWorld,
  unavailableIds: readonly string[],
  currentTick: number,
): PersonnelRecord | null {
  const origin = world.positions["SCP-999"];
  if (!origin) return null;
  const observableDistress = (person: PersonnelRecord) =>
    /distressed|unhappy|tense/.test(projectPsychology(person).moodAppearance) ||
    person.physicalObservations.some(
      (observation) => currentTick - observation.observedTick < 30,
    );
  const distance = (person: PersonnelRecord) => {
    const position = world.positions[person.id]!;
    return Math.abs(position.x - origin.x) + Math.abs(position.y - origin.y);
  };
  return (
    [...personnel]
      .filter(
        (person) =>
          !unavailableIds.includes(person.id) &&
          !hasCalmEffect(person) &&
          person.currentJobId === null &&
          world.positions[person.id] !== undefined &&
          canObserve(
            world.map,
            origin,
            world.positions[person.id]!,
            SOCIAL_PERCEPTION_RANGE,
          ),
      )
      .sort(
        (left, right) =>
          Number(observableDistress(right)) -
            Number(observableDistress(left)) ||
          distance(left) - distance(right) ||
          left.id.localeCompare(right.id),
      )
      .find((person) => {
        const position = world.positions[person.id];
        const origin = world.positions["SCP-999"];
        return (
          position !== undefined &&
          origin !== undefined &&
          findRoute(world.map, origin, position) !== null
        );
      }) ?? null
  );
}

function calmEffect(currentTick: number): PersonnelEffect {
  return {
    id: CALM_EFFECT_ID,
    name: "Comforted by SCP-999",
    kind: "memory",
    severity: "minor",
    bodyRegions: [],
    physicalHealthPenalty: 0,
    stressRecoveryPerTick: 0.45,
    expiresAtTick: currentTick + CALM_DURATION,
  };
}

export function advanceScp999(
  anomaly: Scp999State,
  personnel: readonly PersonnelRecord[],
  currentTick: number,
  world: SiteWorld,
  unavailableIds: readonly string[] = [],
): Scp999AdvanceResult {
  const previousTarget = personnel.find(
    ({ id }) => id === anomaly.targetPersonId,
  );
  const origin = world.positions["SCP-999"];
  const previousPosition = previousTarget
    ? world.positions[previousTarget.id]
    : undefined;
  const nearby =
    origin &&
    previousPosition &&
    Math.abs(origin.x - previousPosition.x) +
      Math.abs(origin.y - previousPosition.y) <=
      1;
  if (
    anomaly.status === "comforting" &&
    (!nearby ||
      previousTarget?.currentJobId !== null ||
      unavailableIds.includes(previousTarget?.id ?? ""))
  ) {
    return {
      anomaly: {
        ...anomaly,
        status: "wandering",
        targetPersonId: null,
        interactionEndsAtTick: null,
      },
      personnel,
      world,
    };
  }
  if (
    anomaly.status === "comforting" &&
    anomaly.targetPersonId !== null &&
    anomaly.interactionEndsAtTick !== null &&
    currentTick >= anomaly.interactionEndsAtTick
  ) {
    const targetPersonId = anomaly.targetPersonId;
    return {
      anomaly: {
        ...anomaly,
        status: "resting",
        targetPersonId: null,
        interactionEndsAtTick: null,
        nextAvailableTick: currentTick + COOLDOWN_DURATION,
        lastInteraction: {
          personId: targetPersonId,
          completedTick: currentTick,
        },
      },
      personnel: personnel.map((person) =>
        person.id === targetPersonId
          ? {
              ...person,
              stress: Math.max(0, person.stress - IMMEDIATE_STRESS_RELIEF),
              effects: [
                ...person.effects.filter(({ id }) => id !== CALM_EFFECT_ID),
                calmEffect(currentTick),
              ],
            }
          : person,
      ),
      world,
    };
  }

  if (anomaly.status === "comforting") {
    return { anomaly, personnel, world };
  }

  if (anomaly.status === "resting" && currentTick < anomaly.nextAvailableTick) {
    return { anomaly, personnel, world };
  }

  const target =
    anomaly.status === "approaching" &&
    previousTarget?.currentJobId === null &&
    !hasCalmEffect(previousTarget) &&
    !unavailableIds.includes(previousTarget.id) &&
    origin &&
    previousPosition &&
    canObserve(world.map, origin, previousPosition, SOCIAL_PERCEPTION_RANGE)
      ? previousTarget
      : selectTarget(personnel, world, unavailableIds, currentTick);
  const targetPosition = target ? world.positions[target.id] : undefined;
  const route =
    origin && targetPosition
      ? findRoute(world.map, origin, targetPosition)
      : null;
  if (!target || route === null) {
    const commonRoom = world.map.rooms.find(({ kind }) => kind === "mess");
    const destination = commonRoom
      ? {
          x:
            commonRoom.x +
            1 +
            (Math.floor(currentTick / 8) % Math.max(1, commonRoom.width - 2)),
          y: commonRoom.y + 2,
        }
      : null;
    const roamingRoute =
      origin && destination ? findRoute(world.map, origin, destination) : null;
    const step = roamingRoute?.[0];
    return {
      anomaly: {
        ...anomaly,
        status: "wandering",
        targetPersonId: null,
        interactionEndsAtTick: null,
      },
      personnel,
      world: step ? stepWorld(world, "SCP-999", step) : world,
    };
  }

  if (route.length > 1) {
    return {
      anomaly: {
        ...anomaly,
        status: "approaching",
        targetPersonId: target.id,
        interactionEndsAtTick: null,
      },
      personnel,
      world: stepWorld(world, "SCP-999", route[0]!),
    };
  }
  return {
    anomaly: {
      ...anomaly,
      status: "comforting",
      targetPersonId: target.id,
      interactionEndsAtTick: currentTick + INTERACTION_DURATION,
    },
    personnel: personnel.map((person) =>
      person.id === target.id
        ? {
            ...person,
            stress: Math.max(0, person.stress - 0.5),
            effects: [
              ...person.effects.filter(({ id }) => id !== CALM_EFFECT_ID),
              calmEffect(currentTick),
            ],
          }
        : person,
    ),
    world,
  };
}
