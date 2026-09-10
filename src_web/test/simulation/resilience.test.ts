import { expect, it } from "vitest";
import { entities, materials } from "../../src/simulation/catalog";
import { instantiateEntity } from "../../src/simulation/core/site/EntityPlacement";
import {
  advanceSimulation,
  createSimulation,
} from "../../src/simulation/core/Simulation";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import { facilityInUse } from "../../src/simulation/core/entity/Facility";

function setup() {
  const pawn = instantiateEntity(
    {
      id: "pawn",
      definitionId: "field-agent",
      location: { kind: "ground", position: { x: 0, y: 1 } },
      overrides: {
        needs: {
          hunger: { value: 0, increasePerTick: 0.1 },
          fatigue: { value: 80, increasePerTick: 0 },
        },
      },
    },
    entities,
  ) as Pawn;
  const bed = instantiateEntity(
    {
      id: "bed",
      definitionId: "bed",
      location: { kind: "ground", position: { x: 1, y: 1 } },
    },
    entities,
  );
  return {
    pawn,
    state: {
      ...createSimulation(),
      sites: {
        site: {
          id: "site",
          name: "Test",
          terrain: ["...", "...", "..."],
          entities: { pawn, bed },
        },
      },
    },
  };
}

it("fails a missing target and lets autonomy address an available need next tick", () => {
  const { pawn, state } = setup();
  pawn.queue = [
    {
      id: "lost",
      source: "autonomy",
      elapsed: 0,
      blockedReason: null,
      action: { kind: "eat", targetId: "gone" },
    },
  ];
  const failed = advanceSimulation(state, materials);
  expect(failed.events).toContainEqual(
    expect.objectContaining({ kind: "failed", actionId: "lost" }),
  );
  const next = advanceSimulation(failed.state, materials).state;
  expect((next.sites.site!.entities.pawn as Pawn).queue[0]!.action.kind).toBe(
    "sleep",
  );
});

it("six tiny hunger increments consume only their nutritional equivalent", () => {
  const { pawn, state } = setup();
  delete pawn.needs.fatigue;
  const food = instantiateEntity(
    {
      id: "food",
      definitionId: "packaged-meal",
      location: { kind: "ground", position: { x: 0, y: 0 } },
      overrides: { amount: 6 },
    },
    entities,
  );
  let current = {
    ...state,
    sites: { site: { ...state.sites.site, entities: { pawn, food } } },
  };
  for (let tick = 0; tick < 6; tick++)
    current = advanceSimulation(current, materials).state as typeof current;
  expect(current.sites.site.entities.food.amount).toBeCloseTo(5.98);
  expect(current.sites.site.entities.pawn.needs.hunger!.value).toBeCloseTo(0);
});

it("incapacitation releases use and interrupts the intention without undoing health", () => {
  const { pawn, state } = setup();
  pawn.health = { bloodLoss: 100, wounds: [] };
  pawn.queue = [
    {
      id: "sleep",
      source: "autonomy",
      elapsed: 1,
      blockedReason: null,
      action: { kind: "sleep", targetId: "bed", workTicks: 1 },
    },
  ];
  const next = advanceSimulation(state, materials);
  expect(next.events).toContainEqual(
    expect.objectContaining({ kind: "interrupted", actionId: "sleep" }),
  );
  expect(facilityInUse(next.state.sites.site!, "bed")).toBe(false);
  expect((next.state.sites.site!.entities.pawn as Pawn).health!.bloodLoss).toBe(
    100,
  );
});

it("abandons blocked autonomous movement but preserves a player's temporarily blocked order", () => {
  const { pawn, state } = setup();
  pawn.queue = [
    {
      id: "move",
      source: "autonomy",
      elapsed: 0,
      blockedReason: null,
      action: { kind: "move", destination: { x: 1, y: 1 } },
    },
  ];
  let current = state;
  for (let tick = 0; tick < 8; tick++)
    current = advanceSimulation(current, materials).state as typeof current;
  expect((current.sites.site.entities.pawn as Pawn).queue).toEqual([]);
  pawn.queue[0]!.source = "player";
  let explicit = state;
  for (let tick = 0; tick < 10; tick++)
    explicit = advanceSimulation(explicit, materials).state as typeof explicit;
  expect(explicit.sites.site.entities.pawn.queue[0]!.id).toBe("move");
  explicit.sites.site.entities.bed.location = {
    kind: "carried",
    carrierId: "pawn",
  };
  const resumed = advanceSimulation(explicit, materials).state;
  expect((resumed.sites.site!.entities.pawn as Pawn).queue).toEqual([]);
});

it("satisfied autonomous rest finishes early without shortening an explicit session", () => {
  const { pawn, state } = setup();
  pawn.needs = { fatigue: { value: 0, increasePerTick: 0 } };
  pawn.queue = [
    {
      id: "rest",
      source: "autonomy",
      elapsed: 1,
      blockedReason: null,
      action: { kind: "sleep", targetId: "bed", workTicks: 1 },
    },
  ];
  const finished = advanceSimulation(state, materials).state;
  expect((finished.sites.site!.entities.pawn as Pawn).queue).toEqual([]);
  pawn.queue[0]!.source = "player";
  const explicit = advanceSimulation(state, materials).state;
  expect(
    (explicit.sites.site!.entities.pawn as Pawn).queue[0]!.action,
  ).toMatchObject({ workTicks: 2 });
});
