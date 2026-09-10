import { expect, it } from "vitest";
import {
  advanceHealth,
  incapacitated,
  type Health,
} from "../../src/simulation/core/entity/pawn/Health";
import trial from "../../src/simulation/catalog/sites/tests/ThreatAndCasualty.json";
import { entities, materials } from "../../src/simulation/catalog";
import {
  instantiateSite,
  type SiteTemplate,
} from "../../src/simulation/core/site/Site";
import {
  advanceSimulation,
  createSimulation,
  type Simulation,
  type TickEvent,
} from "../../src/simulation/core/Simulation";
import { positionOf, distance } from "../../src/simulation/core/site/TileMap";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import { deserialize, serialize } from "../../src/simulation/core/Snapshot";
import { chooseConcern } from "../../src/simulation/core/entity/pawn/concerns/Concerns";
import { instantiateEntity } from "../../src/simulation/core/site/EntityPlacement";
import { canSee } from "../../src/simulation/core/site/Visibility";
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import { facilityInUse } from "../../src/simulation/core/entity/Facility";
import { depart } from "../../src/simulation/core/site/Transfer";

function setup() {
  const result = instantiateSite(
    createSimulation(),
    trial as SiteTemplate,
    entities,
  );
  return { ...result, id: (local: string) => `${result.siteId}:${local}` };
}

function concern(state: Simulation, siteId: string, actorId: string) {
  const site = state.sites[siteId]!;
  return chooseConcern({
    site,
    pawn: site.entities[actorId] as Pawn,
    materials,
    tick: state.tick,
    events: [],
  });
}

it("bleeding progresses independently of needs and stopping it does not erase injury", () => {
  const health: Health = {
    bloodLoss: 0,
    wounds: [{ id: "wound", severity: 20, bleeding: 2 }],
  };
  advanceHealth(health);
  expect(health.bloodLoss).toBe(2);
  health.wounds[0]!.bleeding = 0;
  advanceHealth(health);
  expect(health.wounds[0]!.severity).toBe(20);
  expect(health.bloodLoss).toBe(2);
  expect(incapacitated(health)).toBe(false);
});

it("an authored encounter produces attack, withdrawal and medical care within 40 ticks without orders", () => {
  const { state: initial, siteId, id } = setup();
  const before = serialize(initial);
  expect(concern(initial, siteId, id("soldier"))).toMatchObject({
    kind: "threat",
    causeId: id("threat"),
    action: { kind: "attack" },
  });
  expect(concern(initial, siteId, id("researcher"))).toMatchObject({
    kind: "threat",
    causeId: id("threat"),
    action: { kind: "flee" },
  });
  expect(concern(initial, siteId, id("medic"))).toMatchObject({
    kind: "injury",
    causeId: id("patient"),
    action: { kind: "treat" },
  });
  const originalDistance = distance(
    positionOf(initial.sites[siteId]!, id("researcher"))!,
    positionOf(initial.sites[siteId]!, id("threat"))!,
  );
  let state = initial;
  let replay = deserialize(before)!;
  const reordered = structuredClone(initial);
  reordered.sites[siteId]!.entities = Object.fromEntries(
    Object.entries(reordered.sites[siteId]!.entities).reverse(),
  );
  expect(advanceSimulation(reordered, materials)).toEqual(
    advanceSimulation(initial, materials),
  );
  const events: TickEvent[] = [];
  for (let tick = 0; tick < 40; tick++) {
    const next = advanceSimulation(state, materials);
    events.push(...next.events);
    state = next.state;
    replay = advanceSimulation(replay, materials).state;
    expect(replay).toEqual(state);
    if (tick === 9) replay = deserialize(serialize(replay))!;
  }
  expect(serialize(initial)).toBe(before);
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        entityId: id("soldier"),
        targetId: id("threat"),
        kind: "attacked",
      }),
      expect.objectContaining({
        entityId: id("researcher"),
        targetId: id("threat"),
        kind: "fled",
      }),
      expect.objectContaining({
        entityId: id("medic"),
        targetId: id("patient"),
        kind: "treated",
      }),
    ]),
  );
  const site = state.sites[siteId]!;
  expect(
    distance(
      positionOf(site, id("researcher"))!,
      positionOf(site, id("threat"))!,
    ),
  ).toBeGreaterThan(originalDistance);
  expect(
    (site.entities[id("threat")] as Pawn).health!.wounds.length,
  ).toBeGreaterThan(0);
  const patient = site.entities[id("patient")] as Pawn;
  expect(patient.health!.wounds[0]).toMatchObject({
    severity: 25,
    bleeding: 0,
    stabilization: {
      actorId: id("medic"),
      sourceId: id("medic"),
      tick: expect.any(Number),
    },
  });
  expect(patient.health!.bloodLoss).toBeGreaterThan(0);
  expect(patient.health!.bloodLoss).toBeLessThan(80);
  expect(
    (site.entities[id("medic")] as Pawn).response!.medicine!.supplies,
  ).toBe(1);
});

it("walls and closed doors hide causes until visible, including diagonal corners", () => {
  const { state, siteId, id } = setup();
  const site = state.sites[siteId]!;
  const soldier = site.entities[id("soldier")] as Pawn;
  soldier.location = { kind: "ground", position: { x: 1, y: 1 } };
  site.entities[id("threat")]!.location = {
    kind: "ground",
    position: { x: 3, y: 1 },
  };
  site.terrain = ["#####", "..#..", "....."];
  expect(canSee(site, soldier, id("threat"))).toBe(false);
  expect(concern(state, siteId, soldier.id)).toBeNull();
  site.terrain = ["#####", ".....", "....."];
  const door = instantiateEntity(
    {
      id: "door",
      definitionId: "automatic-steel-door",
      location: { kind: "ground", position: { x: 2, y: 1 } },
    },
    entities,
  );
  site.entities.door = door;
  expect(concern(state, siteId, soldier.id)).toBeNull();
  if (door.kind === "door") door.open = true;
  expect(concern(state, siteId, soldier.id)).toMatchObject({
    causeId: id("threat"),
  });
  delete site.entities.door;
  site.terrain = [".....", "..#..", ".#..."];
  site.entities[id("threat")]!.location = {
    kind: "ground",
    position: { x: 2, y: 2 },
  };
  expect(canSee(site, soldier, id("threat"))).toBe(false);
});

it("visible danger interrupts self-chosen reading and releases furniture, not explicit orders or autonomy-off", () => {
  const { state: initial, siteId, id } = setup();
  const site = initial.sites[siteId]!;
  const researcher = site.entities[id("researcher")] as Pawn;
  site.entities.shelf = instantiateEntity(
    {
      id: "shelf",
      definitionId: "bookshelf",
      location: { kind: "ground", position: { x: 8, y: 6 } },
    },
    entities,
  );
  researcher.queue = [
    {
      id: "reading",
      source: "autonomy",
      elapsed: 1,
      blockedReason: null,
      action: { kind: "read", targetId: "shelf", workTicks: 1 },
    },
  ];
  expect(facilityInUse(site, "shelf")).toBe(true);
  const explicit = structuredClone(initial);
  (explicit.sites[siteId]!.entities[researcher.id] as Pawn).queue[0]!.source =
    "player";
  const disabled = structuredClone(initial);
  (disabled.sites[siteId]!.entities[researcher.id] as Pawn).autonomy = false;
  const result = advanceSimulation(initial, materials).state;
  expect(
    (result.sites[siteId]!.entities[researcher.id] as Pawn).queue[0]!.action
      .kind,
  ).toBe("flee");
  expect(facilityInUse(result.sites[siteId]!, "shelf")).toBe(false);
  for (const state of [explicit, disabled]) {
    expect(
      (
        advanceSimulation(state, materials).state.sites[siteId]!.entities[
          researcher.id
        ] as Pawn
      ).queue[0]!.action,
    ).toMatchObject({ kind: "read", workTicks: 2 });
  }
});

it("two medics do not spend two supplies on one wound and treatment retains health history", () => {
  const { state: initial, siteId, id } = setup();
  const site = initial.sites[siteId]!;
  delete site.entities[id("threat")];
  const first = site.entities[id("medic")] as Pawn;
  first.autonomy = false;
  first.location = { kind: "ground", position: { x: 3, y: 2 } };
  const second = instantiateEntity(
    {
      id: "second",
      definitionId: "medic",
      location: { kind: "ground", position: { x: 4, y: 3 } },
      overrides: { autonomy: false },
    },
    entities,
  ) as Pawn;
  site.entities.second = second;
  let state = initial;
  for (const actor of [first, second]) {
    const result = executeCommand(
      state,
      {
        kind: "enqueue",
        siteId,
        entityId: actor.id,
        action: { kind: "treat", targetId: id("patient"), workTicks: 999 },
      },
      materials,
    );
    expect(result.code).toBe("accepted");
    state = result.state;
  }
  const events: TickEvent[] = [];
  for (let tick = 0; tick < 8; tick++) {
    const next = advanceSimulation(state, materials);
    state = next.state;
    events.push(...next.events);
  }
  expect(events.filter((event) => event.kind === "treated")).toHaveLength(1);
  const remaining = [first.id, second.id].reduce(
    (total, actorId) =>
      total +
      (state.sites[siteId]!.entities[actorId] as Pawn).response!.medicine!
        .supplies,
    0,
  );
  expect(remaining).toBe(3);
  expect(
    (state.sites[siteId]!.entities[id("patient")] as Pawn).health!.wounds[0],
  ).toMatchObject({ severity: 25, bleeding: 0 });
});

it("a medic abandons autonomous treatment when danger becomes immediate without spending the charge", () => {
  const { state: initial, siteId, id } = setup();
  const site = initial.sites[siteId]!;
  const medic = site.entities[id("medic")] as Pawn;
  medic.location = { kind: "ground", position: { x: 3, y: 2 } };
  medic.queue = [
    {
      id: "care",
      source: "autonomy",
      elapsed: 2,
      blockedReason: null,
      action: { kind: "treat", targetId: id("patient"), workTicks: 2 },
    },
  ];
  site.entities[id("threat")]!.location = {
    kind: "ground",
    position: { x: 3, y: 3 },
  };
  const state = advanceSimulation(initial, materials).state;
  expect(
    (state.sites[siteId]!.entities[medic.id] as Pawn).queue[0]!.action.kind,
  ).toBe("flee");
  expect(
    (state.sites[siteId]!.entities[medic.id] as Pawn).response!.medicine!
      .supplies,
  ).toBe(2);
  expect(
    (state.sites[siteId]!.entities[id("patient")] as Pawn).health!.wounds[0]!
      .bleeding,
  ).toBe(2);
});

it("attack requires capability and physical contact, and a guard can injure an adjacent soldier", () => {
  const { state: initial, siteId, id } = setup();
  expect(
    executeCommand(
      initial,
      {
        kind: "enqueue",
        siteId,
        entityId: id("researcher"),
        action: { kind: "attack", targetId: id("threat"), workTicks: 0 },
      },
      materials,
    ).code,
  ).toBe("rejected");
  const site = initial.sites[siteId]!;
  const soldier = site.entities[id("soldier")] as Pawn;
  soldier.autonomy = false;
  soldier.location = { kind: "ground", position: { x: 9, y: 4 } };
  let state = initial;
  for (let tick = 0; tick < 10; tick++)
    state = advanceSimulation(state, materials).state;
  expect(
    (state.sites[siteId]!.entities[soldier.id] as Pawn).health!.wounds.length,
  ).toBeGreaterThan(0);
});

it("bleeding advances once in transit and continues after arrival without duplicating its first site tick", () => {
  const { state: initial, siteId, id } = setup();
  const other = instantiateSite(
    initial,
    { name: "Other", terrain: ["..."], entities: [] },
    entities,
  );
  const sent = depart(other.state, {
    originId: siteId,
    destinationId: other.siteId,
    entityIds: [id("patient")],
    loading: { x: 4, y: 2 },
    arrival: { x: 1, y: 0 },
    duration: 3,
  });
  expect(sent.reason).toBeNull();
  let state = sent.state;
  for (let tick = 0; tick < 3; tick++)
    state = advanceSimulation(state, materials).state;
  expect(
    (state.sites[other.siteId]!.entities[id("patient")] as Pawn).health!
      .bloodLoss,
  ).toBe(6);
  state = advanceSimulation(state, materials).state;
  expect(
    (state.sites[other.siteId]!.entities[id("patient")] as Pawn).health!
      .bloodLoss,
  ).toBe(8);
});
