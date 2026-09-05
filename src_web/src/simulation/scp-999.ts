import type { PersonnelEffect, PersonnelRecord } from "./personnel";
import { findRoute, type SiteWorld } from "./world";

const INTERACTION_DURATION = 4;
const CALM_DURATION = 12;
const COOLDOWN_DURATION = 6;
const MINIMUM_TARGET_STRESS = 25;
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
): PersonnelRecord | null {
  return (
    [...personnel]
      .filter(
        (person) =>
          person.stress >= MINIMUM_TARGET_STRESS &&
          !hasCalmEffect(person) &&
          person.currentJobId === null,
      )
      .sort(
        (left, right) =>
          right.stress - left.stress || left.id.localeCompare(right.id),
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
    (!nearby || previousTarget?.currentJobId !== null)
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
    !hasCalmEffect(previousTarget)
      ? previousTarget
      : selectTarget(personnel, world);
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
      world: step
        ? { ...world, positions: { ...world.positions, "SCP-999": step } }
        : world,
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
      world: {
        ...world,
        positions: { ...world.positions, "SCP-999": route[0]! },
      },
    };
  }
  return {
    anomaly: {
      ...anomaly,
      status: "comforting",
      targetPersonId: target.id,
      interactionEndsAtTick: currentTick + INTERACTION_DURATION,
    },
    personnel,
    world,
  };
}
