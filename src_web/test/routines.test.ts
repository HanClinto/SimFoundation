import { describe, expect, it } from "vitest";
import { createInitialState, type GameState } from "../src/simulation/state";
import {
  advanceRoutines,
  setPersonnelSchedule,
} from "../src/simulation/routines";
import { advanceSimulation } from "../src/simulation/tick";
import { createController } from "../src/application/controller";
import { loadGameState } from "../src/adapters/browser/game-persistence";

describe("needs-driven routines", () => {
  it("sustains two days of autonomous routines and preserves a deterministic continuation", () => {
    let state = createInitialState(828);
    const observed = new Set<string>();
    for (let tick = 0; tick < 2880; tick += 1) {
      state = advanceSimulation(state);
      for (const activity of Object.values(state.routines.activities))
        observed.add(activity.kind);
      expect(
        new Set(
          Object.values(state.routines.activities).map(
            ({ stationId }) => stationId,
          ),
        ).size,
      ).toBe(Object.keys(state.routines.activities).length);
    }
    expect(observed.has("meal")).toBe(true);
    expect(observed.has("sleep")).toBe(true);
    expect(state.routines.mealsConsumed).toBeGreaterThan(12);
    expect(
      state.personnel.every(({ needs }) => needs.satiety > 0 && needs.rest > 0),
    ).toBe(true);
    const saved = loadGameState({
      getItem: () => JSON.stringify(state),
      setItem: () => {},
    });
    expect(saved.status).toBe("loaded");
    if (saved.status !== "loaded") throw new Error("long-run save rejected");
    expect(advanceSimulation(saved.state)).toEqual(advanceSimulation(state));
  }, 20000);
  it("replenishes the pantry by physically hauling finite reserves without duplication", () => {
    const initial = createInitialState();
    const controller = createController({
      ...initial,
      routines: { ...initial.routines, pantryMeals: 4, mealsConsumed: 32 },
    });
    let sawDelivery = false;
    for (let tick = 0; tick < 100; tick += 1) {
      const state = controller.advance().game;
      const carried =
        state.routines.supplyOrder?.phase === "delivery"
          ? state.routines.supplyOrder.quantity
          : 0;
      if (carried > 0) sawDelivery = true;
      expect(
        state.routines.pantryMeals +
          state.routines.mealsConsumed +
          state.routines.reserveMeals +
          carried,
      ).toBe(108);
      expect(
        loadGameState({
          getItem: () => JSON.stringify(state),
          setItem: () => {},
        }).status,
      ).toBe("loaded");
      if (state.routines.pantryMeals > 6) break;
    }
    expect(sawDelivery).toBe(true);
    expect(controller.getSnapshot().game.routines).toMatchObject({
      pantryMeals: 16,
      reserveMeals: 60,
      mealsConsumed: 32,
      supplyOrder: null,
    });
  });
  it("continues a reserved meal identically after reload", () => {
    const initial = createInitialState();
    const controller = createController({
      ...initial,
      personnel: initial.personnel.map((person, index) =>
        index === 0
          ? { ...person, needs: { ...person.needs, satiety: 25 } }
          : person,
      ),
    });
    const saved = controller.advance(3).game;
    const result = loadGameState({
      getItem: () => JSON.stringify(saved),
      setItem: () => {},
    });
    expect(result.status).toBe("loaded");
    if (result.status !== "loaded") throw new Error("routine save rejected");
    expect(createController(result.state).advance(70).game).toEqual(
      controller.advance(70).game,
    );
    const corrupt = {
      ...saved,
      routines: { ...saved.routines, pantryMeals: 999 },
    };
    expect(
      loadGameState({
        getItem: () => JSON.stringify(corrupt),
        setItem: () => {},
      }).status,
    ).toBe("invalid");
  });
  it("critical needs interrupt work without losing its progress or duplicating a reservation", () => {
    const controller = createController(createInitialState());
    controller.authorizeJob("job-calibrate-9620-sensors");
    const working = controller.advance(4).game;
    const exhausted = {
      ...working,
      personnel: working.personnel.map((person) =>
        person.id === "person-mara-voss"
          ? { ...person, needs: { ...person.needs, rest: 10 } }
          : person,
      ),
    };
    const next = advanceSimulation(exhausted);
    expect(next.jobs[0]?.progress).toBe(working.jobs[0]?.progress);
    expect(next.jobs[0]?.assignedPersonId).not.toBe("person-mara-voss");
    expect(next.routines.activities["person-mara-voss"]?.kind).toBe("sleep");
  });
  it("requires physical travel before food restores satiety and consumes exactly one meal", () => {
    const initial = createInitialState();
    let state: GameState = {
      ...initial,
      personnel: initial.personnel.map((person, index) =>
        index === 0
          ? { ...person, needs: { ...person.needs, satiety: 25 } }
          : person,
      ),
    };
    state = advanceRoutines(state);
    expect(state.personnel[0]?.needs.satiety).toBe(25);
    expect(state.routines.pantryMeals).toBe(36);
    for (
      let tick = 0;
      tick < 100 && state.personnel[0]!.needs.satiety < 70;
      tick += 1
    )
      state = advanceSimulation(state);
    expect(state.personnel[0]!.needs.satiety).toBeGreaterThan(70);
    expect(state.routines.pantryMeals).toBe(35);
    expect(state.routines.mealsConsumed).toBe(1);
  });
  it("reserves distinct beds and restores rest only after arrival", () => {
    const initial = createInitialState();
    let state: GameState = {
      ...initial,
      personnel: initial.personnel.map((person) => ({
        ...person,
        needs: { ...person.needs, rest: 10 },
      })),
    };
    state = advanceRoutines(state);
    expect(state.personnel.every(({ needs }) => needs.rest === 10)).toBe(true);
    expect(
      new Set(
        Object.values(state.routines.activities).map(
          ({ stationId }) => stationId,
        ),
      ).size,
    ).toBe(6);
    for (let tick = 0; tick < 120; tick += 1) state = advanceSimulation(state);
    expect(state.personnel.every(({ needs }) => needs.rest > 20)).toBe(true);
  });
  it("exposes food shortages without inventing a meal or recovering hunger", () => {
    const initial = createInitialState();
    const state = advanceRoutines({
      ...initial,
      routines: { ...initial.routines, pantryMeals: 0, mealsConsumed: 36 },
      personnel: initial.personnel.map((person) => ({
        ...person,
        needs: { ...person.needs, satiety: 10 },
      })),
    });
    expect(Object.values(state.routines.blockedReasons)).toHaveLength(6);
    expect(state.personnel.every(({ needs }) => needs.satiety === 10)).toBe(
      true,
    );
  });
  it("holds new routine work outside scheduled work hours", () => {
    const initial = createInitialState();
    const state = setPersonnelSchedule(
      initial,
      "person-mara-voss",
      Array.from({ length: 24 }, () => "sleep"),
    );
    expect(() => setPersonnelSchedule(state, "person-mara-voss", [])).toThrow(
      "Schedule requires 24 valid hourly blocks",
    );
    expect(
      state.routines.schedules["person-mara-voss"]?.every(
        (block) => block === "sleep",
      ),
    ).toBe(true);
  });
});
