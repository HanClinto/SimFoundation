import { describe, expect, it } from "vitest";

import { createInitialState } from "../src/simulation/state";
import { advanceSimulation } from "../src/simulation/tick";

function advance(state: ReturnType<typeof createInitialState>, ticks: number) {
  let current = state;
  for (let index = 0; index < ticks; index += 1) {
    current = advanceSimulation(current);
  }
  return current;
}

describe("SCP-999", () => {
  it("comforts the most stressed eligible person deterministically", () => {
    const first = advanceSimulation(createInitialState(42));
    const second = advanceSimulation(createInitialState(42));

    expect(first.scp999).toEqual(second.scp999);
    expect(first.scp999).toMatchObject({
      status: "comforting",
      targetPersonId: "person-emil-novak",
      interactionEndsAtTick: 5,
    });
  });

  it("applies temporary calm, rests, then selects another eligible person", () => {
    const comforted = advance(createInitialState(42), 5);
    const emil = comforted.personnel.find(
      ({ id }) => id === "person-emil-novak",
    );

    expect(comforted.scp999).toMatchObject({
      status: "resting",
      targetPersonId: null,
      nextAvailableTick: 11,
      lastInteraction: {
        personId: "person-emil-novak",
        completedTick: 5,
      },
    });
    expect(emil?.stress).toBeLessThan(27);
    expect(emil?.effects).toContainEqual(
      expect.objectContaining({
        id: "effect-comforted-by-999",
        kind: "memory",
        expiresAtTick: 17,
      }),
    );

    const resumed = advance(comforted, 6);
    expect(resumed.scp999).toMatchObject({
      status: "comforting",
      targetPersonId: "person-jon-bell",
      interactionEndsAtTick: 15,
    });
    expect(
      resumed.personnel.find(({ id }) => id === "person-emil-novak")?.stress,
    ).toBeLessThan(emil?.stress ?? 100);
  });

  it("expires the calm Effect at its authoritative tick", () => {
    const state = advance(createInitialState(42), 17);
    const emil = state.personnel.find(({ id }) => id === "person-emil-novak");

    expect(
      emil?.effects.some(({ id }) => id === "effect-comforted-by-999"),
    ).toBe(false);
  });
});
