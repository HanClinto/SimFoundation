import type { PersonnelEffect, PersonnelRecord } from "./personnel";

const INTERACTION_DURATION = 4;
const CALM_DURATION = 12;
const COOLDOWN_DURATION = 6;
const MINIMUM_TARGET_STRESS = 25;
const IMMEDIATE_STRESS_RELIEF = 4;
const CALM_EFFECT_ID = "effect-comforted-by-999";

export interface Scp999State {
  readonly id: "SCP-999";
  readonly status: "wandering" | "comforting" | "resting";
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
): PersonnelRecord | null {
  return (
    [...personnel]
      .filter(
        (person) =>
          person.stress >= MINIMUM_TARGET_STRESS && !hasCalmEffect(person),
      )
      .sort(
        (left, right) =>
          right.stress - left.stress || left.id.localeCompare(right.id),
      )[0] ?? null
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
): Scp999AdvanceResult {
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
    };
  }

  if (anomaly.status === "comforting") {
    return { anomaly, personnel };
  }

  if (anomaly.status === "resting" && currentTick < anomaly.nextAvailableTick) {
    return { anomaly, personnel };
  }

  const target = selectTarget(personnel);
  if (!target) {
    return {
      anomaly: {
        ...anomaly,
        status: "wandering",
        targetPersonId: null,
        interactionEndsAtTick: null,
      },
      personnel,
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
  };
}
