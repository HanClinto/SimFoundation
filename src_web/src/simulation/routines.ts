import type { GameState } from "./state";
import { recordDoorOpening } from "./action-progress";
import { manualActionWaiting } from "./person-actions";
import {
  tacticallyUnavailable,
  draftResponder,
  orderResponder,
} from "./combat";
import type { PersonnelRecord } from "./personnel";
import { REST_DECAY_PER_TICK } from "./personnel";
import { mealCollectionPoint, refreshMealSummary } from "./storage";
import { findRoute, sameTile, stepWorld, type TilePosition } from "./world";
import {
  consumeObject,
  reserveSupply,
  pickUpObject,
  putDownObject,
  releaseObject,
} from "./objects";

export type ScheduleBlock = "work" | "free" | "sleep";
export type RoutineKind = "meal" | "sleep" | "break";
export const SLEEP_REST_GAIN = 0.35;
export const SLEEP_REST_TARGET = 95;
export const MEAL_DURATION = 12;
export const RELAX_DURATION = 30;

export interface RoutineProgress {
  readonly fraction: number;
  readonly remainingMinutes: number;
  readonly label: string;
}

export function routineProgress(
  state: GameState,
  actorId: string,
): RoutineProgress | null {
  const activity = state.routines.activities[actorId];
  const person = state.personnel.find((entry) => entry.id === actorId);
  const station = state.routines.stations.find(
    (entry) => entry.id === activity?.stationId,
  );
  const position = state.world.positions[actorId];
  if (
    !activity ||
    !person ||
    !station ||
    !position ||
    activity.progress <= 0 ||
    !sameTile(position, station.position) ||
    state.combat.responders[actorId]?.incapacitated ||
    state.routines.blockedReasons[actorId]
  )
    return null;
  const remainingMinutes =
    activity.kind === "sleep"
      ? Math.max(
          0,
          Math.ceil(
            (SLEEP_REST_TARGET - person.needs.rest) /
              (SLEEP_REST_GAIN - REST_DECAY_PER_TICK) -
              1e-8,
          ),
        )
      : Math.max(
          0,
          (activity.kind === "meal" ? MEAL_DURATION : RELAX_DURATION) -
            activity.progress,
        );
  const total = activity.progress + remainingMinutes;
  return {
    fraction: total > 0 ? Math.min(1, activity.progress / total) : 1,
    remainingMinutes,
    label:
      activity.kind === "sleep"
        ? "Sleep"
        : activity.kind === "meal"
          ? "Eat"
          : "Relax",
  };
}
export const PERSONAL_ROUTINE_KINDS = {
  eat: "meal",
  sleep: "sleep",
  relax: "break",
} as const;
export type PersonalRoutineAction = keyof typeof PERSONAL_ROUTINE_KINDS;
export function isPersonalRoutineAction(
  action: string,
): action is PersonalRoutineAction {
  return Object.hasOwn(PERSONAL_ROUTINE_KINDS, action);
}
export interface RoutineStation {
  readonly id: string;
  readonly kind: RoutineKind;
  readonly position: TilePosition;
}
export interface RoutineActivity {
  readonly source?: "schedule" | "need" | "autonomy" | "player";
  readonly kind: RoutineKind;
  readonly stationId: string;
  readonly progress: number;
  readonly startedTick: number;
  readonly mealConsumed: boolean;
  readonly mealObjectId?: string | null;
}
export interface RoutineState {
  readonly pantryMeals: number;
  readonly mealsConsumed: number;
  readonly reserveMeals: number;
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

function recreationDue(state: GameState, personId: string): boolean {
  const roster = state.personnel.map(({ id }) => id).sort();
  const offset = Math.floor((roster.indexOf(personId) * 120) / roster.length);
  return (
    (state.gameMinute + 120 - offset) % 120 < 10 &&
    !state.objects.items.some(
      (object) =>
        object.location.kind === "carried" &&
        object.location.personId === personId,
    )
  );
}

export function routineUnavailableIds(state: GameState): readonly string[] {
  return state.personnel
    .filter(
      (person) =>
        tacticallyUnavailable(state, person.id) ||
        (manualActionWaiting(state, person.id) &&
          person.currentJobId === null &&
          !state.objects.items.some(
            (item) =>
              item.location.kind === "carried" &&
              item.location.personId === person.id,
          )) ||
        state.routines.activities[person.id] ||
        (person.currentJobId === null &&
          (scheduleAt(state, person.id) !== "work" ||
            person.needs.rest < 15 ||
            (person.needs.satiety < 20 && state.routines.pantryMeals > 0))),
    )
    .map(({ id }) => id);
}

export function advanceRoutines(state: GameState): GameState {
  let actionTimings = state.actionTimings;
  let objects = state.objects;
  const people = new Map(state.personnel.map((person) => [person.id, person]));
  const positions = { ...state.world.positions };
  let map = state.world.map;
  const move = (id: string, destination: TilePosition) => {
    const next = stepWorld({ map, positions }, id, destination, (position) => {
      actionTimings = recordDoorOpening(
        {
          ...state,
          actionTimings,
          routines: { ...state.routines, activities },
        },
        id,
        position,
      ).actionTimings;
    });
    const opened = next.map !== map;
    map = next.map;
    positions[id] = next.positions[id]!;
    return opened;
  };
  const activities = { ...state.routines.activities };
  const blockedReasons: Record<string, string> = {};
  let pantryMeals = state.routines.pantryMeals;
  let mealsConsumed = state.routines.mealsConsumed;
  let jobs = [...state.jobs];
  const reserved = new Set(
    Object.values(activities).map(({ stationId }) => stationId),
  );

  for (const id of [...people.keys()].sort()) {
    const playerRoutine = activities[id]?.source === "player";
    if (
      state.combat.responders[id]?.incapacitated ||
      (tacticallyUnavailable(state, id) && !playerRoutine)
    )
      continue;
    let person = people.get(id)!;
    const schedule = scheduleAt(state, id);
    let activity = activities[id];
    if (
      person.currentJobId !== null &&
      urgentNeed(person) &&
      (person.needs.rest < 15 || pantryMeals > 0)
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
      !playerRoutine &&
      ((activity.kind === "sleep" &&
        schedule !== "sleep" &&
        person.needs.rest >= 70) ||
        (activity.kind === "break" &&
          ((schedule !== "free" && person.stress < 55) ||
            person.needs.satiety < 40 ||
            person.needs.rest < 30)))
    ) {
      reserved.delete(activity.stationId);
      delete activities[id];
      activity = undefined;
    }
    if (!activity) {
      if (manualActionWaiting(state, id)) continue;
      const kind: RoutineKind | null =
        person.needs.satiety < 40
          ? "meal"
          : person.needs.rest < 30 ||
              (schedule === "sleep" && person.needs.rest < 90)
            ? "sleep"
            : person.stress > 55 ||
                (schedule === "free" &&
                  (person.stress > 20 || recreationDue(state, id)))
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
        .filter((station) => {
          const object = state.objects.items.find(
            (item) => item.id === station.id,
          );
          return (
            station.kind === kind &&
            !reserved.has(station.id) &&
            (!object ||
              (object.installed && object.condition > 0 && !object.reservedBy))
          );
        })
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
        source:
          kind === "meal" || person.needs.rest < 30 || person.stress > 55
            ? "need"
            : schedule === "sleep"
              ? "schedule"
              : "autonomy",
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
    const furniture = state.objects.items.find((item) => item.id === stationId);
    const station =
      furniture &&
      (!furniture.installed ||
        furniture.condition === 0 ||
        furniture.location.kind !== "ground")
        ? undefined
        : state.routines.stations.find(({ id }) => id === stationId);
    const origin = positions[id];
    if (activity.kind === "meal" && !activity.mealConsumed) {
      const pantry = origin
        ? mealCollectionPoint({ ...state, objects }, origin)
        : null;
      const pantryRoute =
        origin && pantry ? findRoute(state.world.map, origin, pantry) : null;
      if (!pantryRoute || !pantry) {
        blockedReasons[id] = "Pantry supplies are unreachable.";
        reserved.delete(activity.stationId);
        delete activities[id];
        people.set(id, { ...person, activity: blockedReasons[id] });
        continue;
      }
      if (!sameTile(origin!, pantry)) {
        const opening = move(id, pantryRoute[0]!);
        people.set(id, {
          ...person,
          activity: opening
            ? "Opening door"
            : "Collecting a meal from the pantry",
        });
        continue;
      }
      const owner = `routine-${id}`;
      const portion = reserveSupply(objects, "meals", 1, pantry, owner);
      if (!portion.objectId) {
        blockedReasons[id] = "No physical meal supplies at the pantry.";
        reserved.delete(activity.stationId);
        delete activities[id];
        people.set(id, { ...person, activity: blockedReasons[id] });
        continue;
      }
      const picked = pickUpObject(
        portion.store,
        portion.objectId,
        owner,
        id,
        pantry,
      );
      if (picked === portion.store) {
        objects = releaseObject(portion.store, portion.objectId, owner);
        blockedReasons[id] = "Set down carried cargo before collecting a meal.";
        reserved.delete(activity.stationId);
        delete activities[id];
        people.set(id, { ...person, activity: blockedReasons[id] });
        continue;
      }
      objects = picked;
      pantryMeals -= 1;
      mealsConsumed += 1;
      activity = {
        ...activity,
        mealConsumed: true,
        mealObjectId: portion.objectId,
      };
      activities[id] = activity;
    }
    const route =
      station && origin
        ? findRoute(state.world.map, origin, station.position)
        : null;
    if (!station || route === null) {
      if (activity.mealObjectId && origin) {
        objects = releaseObject(
          putDownObject(
            objects,
            activity.mealObjectId,
            `routine-${id}`,
            id,
            origin,
            origin,
          ),
          activity.mealObjectId,
          `routine-${id}`,
        );
        mealsConsumed -= 1;
      }
      blockedReasons[id] = "Routine destination is no longer reachable.";
      reserved.delete(activity.stationId);
      delete activities[id];
      people.set(id, { ...person, activity: blockedReasons[id] });
      continue;
    }
    if (!sameTile(origin!, station.position)) {
      const opening = move(id, route[0]!);
      people.set(id, {
        ...person,
        activity: opening
          ? "Opening door"
          : `Travelling: ${activity.kind === "meal" ? "Meal break" : activity.kind === "sleep" ? "Rest" : "Restorative break"}`,
      });
      continue;
    }
    if (activity.mealObjectId) {
      const owner = `routine-${id}`;
      objects = putDownObject(
        objects,
        activity.mealObjectId,
        owner,
        id,
        station.position,
        origin!,
      );
      const consumed = consumeObject(
        objects,
        activity.mealObjectId,
        owner,
        station.position,
      );
      if (consumed === objects) continue;
      objects = consumed;
      activity = { ...activity, mealObjectId: null };
    }
    const progress = activity.progress + 1;
    const needs = {
      satiety: Math.min(
        100,
        person.needs.satiety + (activity.kind === "meal" ? 5 : 0),
      ),
      rest: Math.min(
        100,
        person.needs.rest + (activity.kind === "sleep" ? SLEEP_REST_GAIN : 0),
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
        ? progress >= MEAL_DURATION
        : activity.kind === "break"
          ? progress >= RELAX_DURATION
          : needs.rest >= SLEEP_REST_TARGET;
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
  return refreshMealSummary({
    ...state,
    actionTimings,
    objects,
    jobs,
    personnel: [...people.values()],
    world: { ...state.world, map, positions },
    routines: {
      ...state.routines,
      pantryMeals,
      mealsConsumed,
      reserveMeals:
        state.routines.reserveMeals +
        (state.routines.mealsConsumed - mealsConsumed > 0
          ? state.routines.mealsConsumed - mealsConsumed
          : 0),
      activities,
      blockedReasons,
    },
  });
}

export function orderPersonalRoutine(
  state: GameState,
  actorId: string,
  kind: RoutineKind,
  stationId: string,
): { state: GameState; reason: string | null } {
  const fail = (reason: string) => ({ state, reason });
  const station = state.routines.stations.find(
    (entry) => entry.id === stationId && entry.kind === kind,
  );
  const item = state.objects.items.find((entry) => entry.id === stationId);
  const origin = state.world.positions[actorId];
  if (!origin || !state.personnel.some((person) => person.id === actorId))
    return fail("This person is not present.");
  if (
    !station ||
    !item ||
    !item.installed ||
    item.condition <= 0 ||
    item.location.kind !== "ground"
  )
    return fail("Choose an installed, serviceable bed or seat.");
  if (
    item.reservedBy ||
    Object.entries(state.routines.activities).some(
      ([id, activity]) => id !== actorId && activity.stationId === stationId,
    )
  )
    return fail("This bed or seat is already in use or reserved.");
  if (findRoute(state.world.map, origin, station.position) === null)
    return fail("No reachable route to this bed or seat.");
  if (kind === "meal" && !mealCollectionPoint(state, origin))
    return fail("No reachable meal supply is available.");
  if (state.combat.responders[actorId]?.phase === "recovering")
    return fail("Wait for action recovery before starting a personal routine.");
  if (
    state.combat.status === "active" &&
    state.combat.participants.includes(actorId)
  )
    return fail("Finish or withdraw from the active encounter first.");
  if (
    state.objects.items.some(
      (entry) =>
        entry.location.kind === "carried" &&
        entry.location.personId === actorId,
    )
  )
    return fail("Finish the current cargo delivery first.");
  const drafted = draftResponder(state, actorId, true);
  if (drafted.code !== "accepted")
    return fail("This person cannot leave their current commitment.");
  const held = orderResponder(drafted.state, actorId, "hold");
  if (held.code !== "accepted")
    return fail("This person cannot start a personal routine.");
  return {
    reason: null,
    state: {
      ...held.state,
      personnel: held.state.personnel.map((person) =>
        person.id === actorId
          ? {
              ...person,
              activity:
                kind === "meal"
                  ? "Preparing to eat"
                  : kind === "sleep"
                    ? "Going to sleep"
                    : "Going to relax",
            }
          : person,
      ),
      routines: {
        ...held.state.routines,
        activities: {
          ...held.state.routines.activities,
          [actorId]: {
            source: "player",
            kind,
            stationId,
            progress: 0,
            startedTick: state.tick,
            mealConsumed: false,
          },
        },
      },
    },
  };
}

export function cancelPersonalRoutine(
  state: GameState,
  actorId: string,
): { state: GameState; reason: string | null } {
  const activity = state.routines.activities[actorId];
  if (activity?.source !== "player")
    return { state, reason: "No player routine is active." };
  if (
    state.objects.items.some(
      (item) =>
        item.location.kind === "carried" && item.location.personId === actorId,
    )
  )
    return {
      state,
      reason: "Finish carrying the meal to its seat before cancelling.",
    };
  const activities = { ...state.routines.activities };
  delete activities[actorId];
  return {
    reason: null,
    state: { ...state, routines: { ...state.routines, activities } },
  };
}
