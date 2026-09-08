import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import { routineProgress } from "../src/simulation/routines";
import { submitAction } from "../src/simulation/action-queue";
import { advanceSimulation } from "../src/simulation/tick";

it.each([
  ["sleep", "bed-1"],
  ["eat", "meal-seat-1"],
  ["relax", "break-seat-1"],
] as const)(
  "estimates active %s against real completion without counting travel",
  (action, objectId) => {
    let state = createInitialState();
    const actorId = state.personnel[0]!.id;
    state = {
      ...state,
      personnel: state.personnel.map((person) => ({
        ...person,
        stress: 0,
        needs: { rest: 90, satiety: 100 },
      })),
    };
    state = submitAction(state, {
      mapId: state.world.map.id,
      actorId,
      action,
      targetId: `object:${objectId}`,
    }).state;
    expect(routineProgress(state, actorId)).toBeNull();
    for (
      let step = 0;
      step < 100 && !routineProgress(state, actorId);
      step += 1
    )
      state = advanceSimulation(state);
    const before = structuredClone(state);
    const estimate = routineProgress(state, actorId)!;
    expect(estimate.fraction).toBeGreaterThan(0);
    expect(estimate.fraction).toBeLessThan(1);
    expect(state).toEqual(before);
    const reloaded = JSON.parse(JSON.stringify(state));
    expect(routineProgress(reloaded, actorId)).toEqual(estimate);
    for (let minute = 1; minute < estimate.remainingMinutes; minute += 1)
      state = advanceSimulation(state);
    expect(state.routines.activities[actorId]).toBeDefined();
    expect(routineProgress(state, actorId)!.remainingMinutes).toBe(1);
    state = advanceSimulation(state);
    expect(state.routines.activities[actorId]).toBeUndefined();
    expect(routineProgress(state, actorId)).toBeNull();
  },
);

it("does not invent progress for Idle or unsupported actions", () => {
  const state = createInitialState();
  expect(routineProgress(state, state.personnel[0]!.id)).toBeNull();
  expect(routineProgress(state, "absent")).toBeNull();
});

it("measures automatic sleep and withholds progress when blocked, displaced or incapacitated", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const bed = initial.routines.stations.find(
    (station) => station.kind === "sleep",
  )!;
  const state = {
    ...initial,
    personnel: initial.personnel.map((person) =>
      person.id === actorId
        ? { ...person, needs: { ...person.needs, rest: 80 } }
        : person,
    ),
    world: {
      ...initial.world,
      positions: { ...initial.world.positions, [actorId]: bed.position },
    },
    routines: {
      ...initial.routines,
      activities: {
        [actorId]: {
          kind: "sleep" as const,
          source: "schedule" as const,
          stationId: bed.id,
          progress: 10,
          startedTick: 0,
          mealConsumed: false,
        },
      },
    },
  };
  expect(routineProgress(state, actorId)).toMatchObject({
    remainingMinutes: 50,
    fraction: 10 / 60,
    label: "Sleep",
  });
  expect(
    routineProgress(
      {
        ...state,
        routines: {
          ...state.routines,
          blockedReasons: { [actorId]: "No route." },
        },
      },
      actorId,
    ),
  ).toBeNull();
  expect(
    routineProgress({ ...state, world: initial.world }, actorId),
  ).toBeNull();
  expect(
    routineProgress(
      {
        ...state,
        combat: {
          ...state.combat,
          responders: {
            [actorId]: {
              ...state.combat.responders[actorId]!,
              incapacitated: true,
            },
          },
        },
      },
      actorId,
    ),
  ).toBeNull();
});
