import { expect, it } from "vitest";
import {
  chooseNeedAction,
  type NeedActionProvider,
} from "../../src/simulation/core/entity/pawn/Needs";
import type { ActionContext } from "../../src/simulation/core/entity/pawn/actions/Action";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import { instantiateEntity } from "../../src/simulation/core/site/EntityPlacement";
import { entities, materials } from "../../src/simulation/catalog";

function context(needs: Pawn["needs"]): ActionContext {
  const pawn = instantiateEntity(
    {
      id: "pawn",
      definitionId: "field-agent",
      location: { kind: "ground", position: { x: 0, y: 0 } },
      overrides: { needs },
    },
    entities,
  ) as Pawn;
  return {
    pawn,
    site: { id: "site", name: "Site", terrain: ["..."], entities: { pawn } },
    materials,
    tick: 1,
    events: [],
  };
}

const need = (value: number) => ({ value, increasePerTick: 0 });

it("selects the greatest present need without knowing its name or action", () => {
  const input = context({ curiosity: need(60), fatigue: need(90) });
  const before = structuredClone(input);
  const providers: NeedActionProvider[] = [
    {
      needId: "curiosity",
      findAction: () => ({ kind: "move", destination: { x: 2, y: 0 } }),
    },
    { needId: "fatigue", findAction: () => ({ kind: "wait", ticks: 3 }) },
  ];
  expect(chooseNeedAction(input, providers)).toEqual({
    kind: "wait",
    ticks: 3,
  });
  expect(input).toEqual(before);
});

it("skips unsupported or unsatisfiable needs and tries another provider before lower needs", () => {
  const input = context({
    unsupported: need(100),
    fatigue: need(90),
    curiosity: need(60),
  });
  const fallback: NeedActionProvider = {
    needId: "curiosity",
    findAction: () => ({ kind: "wait", ticks: 1 }),
  };
  const unavailable: NeedActionProvider = {
    needId: "fatigue",
    findAction: () => null,
  };
  expect(chooseNeedAction(input, [unavailable, fallback])).toEqual({
    kind: "wait",
    ticks: 1,
  });
  expect(
    chooseNeedAction(input, [
      unavailable,
      fallback,
      { needId: "fatigue", findAction: () => ({ kind: "wait", ticks: 2 }) },
    ]),
  ).toEqual({ kind: "wait", ticks: 2 });
});

it("breaks equal urgency ties by need ID regardless of record or provider order", () => {
  const providers: NeedActionProvider[] = [
    { needId: "zeta", findAction: () => ({ kind: "wait", ticks: 2 }) },
    { needId: "alpha", findAction: () => ({ kind: "wait", ticks: 1 }) },
  ];
  expect(
    chooseNeedAction(context({ zeta: need(70), alpha: need(70) }), providers),
  ).toEqual({ kind: "wait", ticks: 1 });
  expect(
    chooseNeedAction(
      context({ alpha: need(70), zeta: need(70) }),
      [...providers].reverse(),
    ),
  ).toEqual({ kind: "wait", ticks: 1 });
});

it("does not query providers for absent or below-threshold needs", () => {
  let calls = 0;
  const provider: NeedActionProvider = {
    needId: "fatigue",
    findAction: () => {
      calls++;
      return { kind: "wait", ticks: 1 };
    },
  };
  expect(chooseNeedAction(context({}), [provider])).toBeNull();
  expect(
    chooseNeedAction(context({ fatigue: need(49) }), [provider]),
  ).toBeNull();
  expect(calls).toBe(0);
  expect(chooseNeedAction(context({ fatigue: need(50) }), [provider])).toEqual({
    kind: "wait",
    ticks: 1,
  });
  expect(calls).toBe(1);
});
