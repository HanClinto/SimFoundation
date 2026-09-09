import { expect, it } from "vitest";
import {
  createInitialState,
  type SimulationClock,
} from "../src/simulation_legacy/state";
import {
  advanceSimulation,
  advanceSiteSimulation,
} from "../src/simulation_legacy/tick";

it("uses the supplied clock without advancing it inside the local runner", () => {
  const initial = createInitialState();
  const clock: SimulationClock = Object.freeze({ tick: 1, gameMinute: 481 });
  const before = JSON.stringify(initial);
  const fromPreviousClock = advanceSiteSimulation(initial, clock);
  const fromCurrentClock = advanceSiteSimulation(
    { ...initial, ...clock },
    clock,
  );

  expect(fromPreviousClock).toEqual(fromCurrentClock);
  expect(fromPreviousClock).toMatchObject(clock);
  expect(JSON.stringify(initial)).toBe(before);
  expect(fromPreviousClock.personnel).not.toEqual(initial.personnel);
});

it("advances the campaign clock once per complete simulation step", () => {
  let state = createInitialState();
  const startingMinute = state.gameMinute;
  for (let step = 1; step <= 4; step += 1) {
    state = advanceSimulation(state);
    expect(state.tick).toBe(step);
    expect(state.gameMinute).toBe(startingMinute + step);
  }
});
