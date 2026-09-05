import type { GameState } from "./state";
import type { PersonnelRecord } from "./personnel";
import type { SiteJob } from "./jobs";
import { findRoute, sameTile, type TilePosition } from "./world";

export type ScheduleBlock = "work" | "free" | "sleep";
export type RoutineKind = "meal" | "sleep" | "break";
export interface RoutineStation {
  readonly id: string;
  readonly kind: RoutineKind;
  readonly position: TilePosition;
}
export interface RoutineActivity {
  readonly kind: RoutineKind;
  readonly stationId: string;
  readonly progress: number;
  readonly startedTick: number;
  readonly mealConsumed: boolean;
}
export interface RoutineState {
  readonly pantryMeals: number;
  readonly mealsConsumed: number;
  readonly reserveMeals: number;
  readonly nextSupplyNumber: number;
  readonly supplyOrder: {
    readonly jobId: string;
    readonly quantity: number;
    readonly phase: "collection" | "delivery";
  } | null;
  readonly stations: readonly RoutineStation[];
  readonly schedules: Readonly<Record<string, readonly ScheduleBlock[]>>;
  readonly activities: Readonly<Record<string, RoutineActivity>>;
  readonly blockedReasons: Readonly<Record<string, string>>;
}

export function createRoutineState(
  personnel: readonly PersonnelRecord[],
): RoutineState {
  const schedule = Array.from(
    { length: 24 },
    (_, hour): ScheduleBlock =>
      hour < 6 || hour >= 22
        ? "sleep"
        : hour >= 8 && hour < 18
          ? "work"
          : "free",
  );
  return {
    pantryMeals: 36,
    mealsConsumed: 0,
    reserveMeals: 72,
    nextSupplyNumber: 1,
    supplyOrder: null,
    schedules: Object.fromEntries(
      personnel.map(({ id }) => [id, [...schedule]]),
    ),
    activities: {},
    blockedReasons: {},
    stations: [
      ...Array.from(
        { length: 6 },
        (_, index): RoutineStation => ({
          id: `bed-${index + 1}`,
          kind: "sleep",
          position: {
            x: 50 + (index % 2) * 2,
            y: 67 + Math.floor(index / 2) * 3,
          },
        }),
      ),
      { id: "meal-seat-1", kind: "meal", position: { x: 57, y: 66 } },
      { id: "meal-seat-2", kind: "meal", position: { x: 60, y: 66 } },
      { id: "break-seat-1", kind: "break", position: { x: 57, y: 68 } },
      { id: "break-seat-2", kind: "break", position: { x: 60, y: 68 } },
    ],
  };
}

export function scheduleAt(state: GameState, personId: string): ScheduleBlock {
  return (
    state.routines.schedules[personId]?.[
      Math.floor(state.gameMinute / 60) % 24
    ] ?? "work"
  );
}

export function setPersonnelSchedule(
  state: GameState,
  personId: string,
  schedule: readonly ScheduleBlock[],
): GameState {
  if (!state.personnel.some(({ id }) => id === personId))
    throw new Error(`Unknown person: ${personId}`);
  if (
    schedule.length !== 24 ||
    !schedule.every((block) => ["work", "free", "sleep"].includes(block))
  )
    throw new Error("Schedule requires 24 valid hourly blocks");
  return {
    ...state,
    routines: {
      ...state.routines,
      schedules: { ...state.routines.schedules, [personId]: [...schedule] },
    },
  };
}

function urgentNeed(person: PersonnelRecord): boolean {
  return person.needs.satiety < 20 || person.needs.rest < 15;
}

export function routineUnavailableIds(state: GameState): readonly string[] {
  return state.personnel
    .filter(
      (person) =>
        state.routines.activities[person.id] ||
        (person.currentJobId === null &&
          (scheduleAt(state, person.id) !== "work" ||
            person.needs.rest < 15 ||
            (person.needs.satiety < 20 && state.routines.pantryMeals > 0))),
    )
    .map(({ id }) => id);
}

export function advanceRoutines(state: GameState): GameState {
  const people = new Map(state.personnel.map((person) => [person.id, person]));
  const positions = { ...state.world.positions };
  const activities = { ...state.routines.activities };
  const blockedReasons: Record<string, string> = {};
  let pantryMeals = state.routines.pantryMeals;
  let mealsConsumed = state.routines.mealsConsumed;
  let jobs = [...state.jobs];
  const reserved = new Set(
    Object.values(activities).map(({ stationId }) => stationId),
  );

  for (const id of [...people.keys()].sort()) {
    let person = people.get(id)!;
    const schedule = scheduleAt(state, id);
    let activity = activities[id];
    if (
      person.currentJobId !== null &&
      urgentNeed(person) &&
      (person.needs.rest < 15 || pantryMeals > 0) &&
      person.currentJobId !== state.routines.supplyOrder?.jobId
    ) {
      const interrupted = jobs.find(
        (job) => job.id === person.currentJobId && job.status === "in-progress",
      );
      if (interrupted) {
        for (const participantId of [
          interrupted.assignedPersonId,
          interrupted.assessment?.patientId,
        ]) {
          const participant = participantId ? people.get(participantId) : null;
          if (participant)
            people.set(participant.id, {
              ...participant,
              currentJobId: null,
              activity: "Work interrupted for urgent personal needs",
            });
        }
        jobs = jobs.map((job) =>
          job.id === interrupted.id
            ? {
                ...job,
                status: "available",
                assignedPersonId: null,
                assignmentReason: "Work interrupted for urgent personal needs.",
              }
            : job,
        );
        person = people.get(id)!;
      }
    }
    if (person.currentJobId !== null) continue;

    if (
      activity &&
      ((activity.kind === "sleep" &&
        schedule !== "sleep" &&
        person.needs.rest >= 70) ||
        (activity.kind === "break" &&
          schedule === "work" &&
          person.stress < 55))
    ) {
      reserved.delete(activity.stationId);
      delete activities[id];
      activity = undefined;
    }
    if (!activity) {
      const kind: RoutineKind | null =
        person.needs.satiety < 40
          ? "meal"
          : person.needs.rest < 30 ||
              (schedule === "sleep" && person.needs.rest < 90)
            ? "sleep"
            : person.stress > 55 || (schedule === "free" && person.stress > 20)
              ? "break"
              : null;
      if (!kind) {
        people.set(id, {
          ...person,
          activity:
            schedule === "work"
              ? "Available for scheduled work"
              : schedule === "sleep"
                ? "Resting off duty"
                : "Free time",
        });
        continue;
      }
      if (kind === "meal" && pantryMeals === 0) {
        blockedReasons[id] = "No meals available in the pantry.";
        people.set(id, { ...person, activity: "Seeking a meal; pantry empty" });
        continue;
      }
      const origin = positions[id];
      const candidates = state.routines.stations
        .filter((station) => station.kind === kind && !reserved.has(station.id))
        .map((station) => ({
          station,
          route: origin
            ? findRoute(state.world.map, origin, station.position)
            : null,
        }))
        .filter((entry) => entry.route !== null)
        .sort(
          (first, second) =>
            first.route!.length - second.route!.length ||
            first.station.id.localeCompare(second.station.id),
        );
      const chosen = candidates[0];
      if (!chosen) {
        blockedReasons[id] =
          `No available reachable ${kind === "meal" ? "meal seat" : kind === "sleep" ? "bed" : "break seat"}.`;
        people.set(id, { ...person, activity: blockedReasons[id]! });
        continue;
      }
      activity = {
        kind,
        stationId: chosen.station.id,
        progress: 0,
        startedTick: state.tick,
        mealConsumed: false,
      };
      activities[id] = activity;
      reserved.add(chosen.station.id);
    }
    const stationId = activity.stationId;
    const station = state.routines.stations.find(({ id }) => id === stationId);
    const origin = positions[id];
    const route =
      station && origin
        ? findRoute(state.world.map, origin, station.position)
        : null;
    if (!station || route === null) {
      blockedReasons[id] = "Routine destination is no longer reachable.";
      reserved.delete(activity.stationId);
      delete activities[id];
      people.set(id, { ...person, activity: blockedReasons[id] });
      continue;
    }
    if (!sameTile(origin!, station.position)) {
      positions[id] = route[0]!;
      people.set(id, {
        ...person,
        activity: `Travelling: ${activity.kind === "meal" ? "Meal break" : activity.kind === "sleep" ? "Rest" : "Restorative break"}`,
      });
      continue;
    }
    if (activity.kind === "meal" && !activity.mealConsumed) {
      if (pantryMeals === 0) {
        blockedReasons[id] = "No meals available in the pantry.";
        reserved.delete(activity.stationId);
        delete activities[id];
        people.set(id, { ...person, activity: "Waiting for pantry supplies" });
        continue;
      }
      pantryMeals -= 1;
      mealsConsumed += 1;
      activity = { ...activity, mealConsumed: true };
    }
    const progress = activity.progress + 1;
    const needs = {
      satiety: Math.min(
        100,
        person.needs.satiety + (activity.kind === "meal" ? 5 : 0),
      ),
      rest: Math.min(
        100,
        person.needs.rest + (activity.kind === "sleep" ? 0.35 : 0),
      ),
    };
    const stress = Math.max(
      0,
      person.stress -
        (activity.kind === "break"
          ? 0.6
          : activity.kind === "sleep"
            ? 0.04
            : 0.08),
    );
    const finished =
      activity.kind === "meal"
        ? progress >= 12
        : activity.kind === "break"
          ? progress >= 30
          : needs.rest >= 95;
    people.set(id, {
      ...person,
      needs,
      stress,
      activity: finished
        ? "Completed: Personal routine"
        : activity.kind === "meal"
          ? "Eating a meal"
          : activity.kind === "sleep"
            ? "Sleeping"
            : "Taking a restorative break",
    });
    if (finished) {
      reserved.delete(activity.stationId);
      delete activities[id];
    } else activities[id] = { ...activity, progress };
  }
  return {
    ...state,
    jobs,
    personnel: [...people.values()],
    world: { ...state.world, positions },
    routines: {
      ...state.routines,
      pantryMeals,
      mealsConsumed,
      activities,
      blockedReasons,
    },
  };
}

export function advancePantrySupply(state: GameState): GameState {
  const supply = state.routines.supplyOrder;
  if (supply) {
    const job = state.jobs.find(({ id }) => id === supply.jobId);
    if (job?.status !== "completed") return state;
    if (supply.phase === "delivery")
      return {
        ...state,
        routines: {
          ...state.routines,
          pantryMeals: state.routines.pantryMeals + supply.quantity,
          supplyOrder: null,
        },
      };
    const mess = state.world.map.rooms.find(({ kind }) => kind === "mess");
    if (!mess || state.routines.reserveMeals < supply.quantity) return state;
    return {
      ...state,
      routines: {
        ...state.routines,
        reserveMeals: state.routines.reserveMeals - supply.quantity,
        supplyOrder: { ...supply, phase: "delivery" },
      },
      jobs: state.jobs.map((entry) =>
        entry.id === job.id
          ? {
              ...entry,
              title: "Deliver pantry meals",
              status: "in-progress",
              progress: 0,
              completedTick: null,
              requiredWorkerId: job.assignedPersonId,
              workSite: { x: mess.x + 2, y: mess.y + 3 },
            }
          : entry,
      ),
      personnel: state.personnel.map((person) =>
        person.id === job.assignedPersonId
          ? {
              ...person,
              currentJobId: job.id,
              activity: "Carrying pantry supplies",
            }
          : person,
      ),
    };
  }
  if (state.routines.pantryMeals > 6 || state.routines.reserveMeals === 0)
    return state;
  const storage = state.world.map.rooms.find(({ kind }) => kind === "storage");
  if (!storage) return state;
  const jobId = `job-pantry-${state.routines.nextSupplyNumber}`;
  const job: SiteJob = {
    id: jobId,
    title: "Collect pantry meals",
    description:
      "Move a counted batch of stored meals to the common-room pantry.",
    skillId: "logistics",
    priority: 90,
    xpPerTick: 0,
    preferredBiases: { mindMight: 1, receptiveResolute: 1 },
    status: "available",
    progress: 0,
    requiredProgress: 1,
    assignedPersonId: null,
    assignmentReason: null,
    authorizedTick: state.tick,
    completedTick: null,
    workSite: { x: storage.x + 3, y: storage.y + 4 },
    requiredWorkerId: null,
  };
  return {
    ...state,
    jobs: [...state.jobs, job],
    routines: {
      ...state.routines,
      nextSupplyNumber: state.routines.nextSupplyNumber + 1,
      supplyOrder: {
        jobId,
        quantity: Math.min(12, state.routines.reserveMeals),
        phase: "collection",
      },
    },
  };
}
