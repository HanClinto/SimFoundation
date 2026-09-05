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

function contactState() {
  const state = createInitialState(42);
  return {
    ...state,
    world: {
      ...state.world,
      positions: {
        ...state.world.positions,
        "SCP-999": { x: 54, y: 58 },
        "person-jon-bell": { x: 55, y: 58 },
      },
    },
  };
}

describe("SCP-999", () => {
  it("travels before contact and cannot deliver Calm remotely", () => {
    const base = contactState();
    const initial = {
      ...base,
      world: {
        ...base.world,
        positions: { ...base.world.positions, "SCP-999": { x: 54, y: 59 } },
      },
    };
    const approaching = advanceSimulation(initial);
    expect(approaching.scp999).toMatchObject({
      status: "approaching",
      targetPersonId: "person-emil-novak",
      interactionEndsAtTick: null,
    });
    expect(approaching.world.positions["SCP-999"]).not.toEqual(
      initial.world.positions["SCP-999"],
    );
    expect(
      advance(initial, 1)
        .personnel.flatMap(({ effects }) => effects)
        .some(({ id }) => id === "effect-comforted-by-999"),
    ).toBe(false);
    let state = approaching;
    for (
      let tick = 0;
      tick < 100 && state.scp999.lastInteraction === null;
      tick += 1
    )
      state = advanceSimulation(state);
    expect(state.scp999.lastInteraction?.personId).toBe("person-emil-novak");
    const target = state.world.positions["person-emil-novak"]!;
    const origin = state.world.positions["SCP-999"]!;
    expect(
      Math.abs(target.x - origin.x) + Math.abs(target.y - origin.y),
    ).toBeLessThanOrEqual(1);
  });

  it("interrupts contact if the person moves away", () => {
    const contact = advanceSimulation(contactState());
    const separated = {
      ...contact,
      world: {
        ...contact.world,
        positions: {
          ...contact.world.positions,
          "person-emil-novak": { x: 67, y: 72 },
        },
      },
    };
    const interrupted = advanceSimulation(separated);
    expect(interrupted.scp999).toMatchObject({
      status: "wandering",
      targetPersonId: null,
      interactionEndsAtTick: null,
    });
    expect(advance(interrupted, 3).scp999.lastInteraction).toBeNull();
  });

  it("responds to nearby observable distress deterministically", () => {
    const first = advanceSimulation(contactState());
    const second = advanceSimulation(contactState());

    expect(first.scp999).toEqual(second.scp999);
    expect(first.scp999).toMatchObject({
      status: "comforting",
      targetPersonId: "person-emil-novak",
      interactionEndsAtTick: 5,
    });
  });

  it("applies temporary calm, rests, then selects another eligible person", () => {
    const comforted = advance(contactState(), 5);
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
    expect(emil?.stress).toBeCloseTo(24.74);
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
    const state = advance(contactState(), 17);
    const emil = state.personnel.find(({ id }) => id === "person-emil-novak");

    expect(
      emil?.effects.some(({ id }) => id === "effect-comforted-by-999"),
    ).toBe(false);
  });
});
