import { expect, it } from "vitest";
import { entities, materials } from "../../src/simulation/catalog";
import {
  advanceSimulation,
  createSimulation,
  type Simulation,
} from "../../src/simulation/core/Simulation";
import { instantiateSite } from "../../src/simulation/core/site/Site";
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import type { ActionState } from "../../src/simulation/core/entity/pawn/actions/Action";
import { canSee } from "../../src/simulation/core/site/Visibility";
import { serialize, deserialize } from "../../src/simulation/core/Snapshot";

interface Fixture {
  state: Simulation;
  siteId: string;
}
const id = (f: Fixture, name: string) => `${f.siteId}:${name}`;
const site = (f: Fixture) => f.state.sites[f.siteId]!;
function pawn(f: Fixture, name: string) {
  const entity = site(f).entities[id(f, name)];
  if (entity?.kind !== "pawn") throw new Error("Expected pawn.");
  return entity;
}
function recorder(f: Fixture) {
  const entity = site(f).entities[id(f, "recorder")];
  if (entity?.kind !== "item" || !entity.impactRecorder)
    throw new Error("Expected recorder.");
  return entity;
}
function fixture(attackerDefinitionId = "kinetic-specimen"): Fixture {
  const created = instantiateSite(
    createSimulation(),
    {
      name: "Recording eligibility",
      terrain: [
        "##########",
        "#........#",
        "#........#",
        "#........#",
        "#........#",
        "##########",
      ],
      entities: [
        {
          id: "observer",
          definitionId: "field-agent",
          location: { kind: "ground", position: { x: 2, y: 2 } },
          overrides: { autonomy: false },
        },
        {
          id: "attacker",
          definitionId: attackerDefinitionId,
          location: { kind: "ground", position: { x: 5, y: 2 } },
          overrides: { autonomy: false },
        },
        {
          id: "victim",
          definitionId: "field-agent",
          location: { kind: "ground", position: { x: 6, y: 2 } },
          overrides: { autonomy: false },
        },
        {
          id: "recorder",
          definitionId: "survey-kit",
          location: { kind: "carried", carrierId: "observer" },
        },
        {
          id: "armor",
          definitionId: "protective-vest",
          location: { kind: "carried", carrierId: "victim" },
          overrides: {
            equipment: {
              slot: "armor",
              worn: true,
              armor: { reduction: 10, wear: 20 },
            },
          },
        },
        {
          id: "bench",
          definitionId: "equipment-bench",
          location: { kind: "ground", position: { x: 2, y: 3 } },
        },
        {
          id: "empty-recorder",
          definitionId: "survey-kit",
          location: { kind: "ground", position: { x: 3, y: 3 } },
        },
      ],
    },
    entities,
  );
  const f = { state: created.state, siteId: created.siteId };
  const attack = pawn(f, "attacker").response?.attack;
  if (!attack)
    throw new Error("Expected an actor with an actual attack capability.");
  attack.windup = 1;
  if (attackerDefinitionId === "scp-3008-employee")
    site(f).cycle = { dayTicks: 1, nightTicks: 20, startedTick: 0 };
  return f;
}
function enqueue(
  f: Fixture,
  name: string,
  action: ActionState,
  source: "player" | "script" = "player",
) {
  const result = executeCommand(
    f.state,
    { kind: "enqueue", siteId: f.siteId, entityId: id(f, name), action },
    materials,
    { source },
  );
  expect(result.reason).toBeNull();
  f.state = result.state;
  return result.actionId!;
}
function step(f: Fixture, count = 1) {
  const events = [];
  for (let i = 0; i < count; i++) {
    const next = advanceSimulation(f.state, materials);
    f.state = next.state;
    events.push(...next.events);
  }
  return events;
}
function watch(f: Fixture) {
  enqueue(f, "observer", {
    kind: "observe",
    targetId: id(f, "attacker"),
    recorderId: id(f, "recorder"),
    workTicks: 0,
  });
  step(f);
}
function attack(f: Fixture, target = "victim") {
  enqueue(
    f,
    "attacker",
    { kind: "attack", targetId: id(f, target), workTicks: 0 },
    "script",
  );
  return step(f);
}
function cancel(f: Fixture, name: string) {
  const result = executeCommand(
    f.state,
    {
      kind: "cancel",
      siteId: f.siteId,
      entityId: id(f, name),
      actionId: pawn(f, name).queue[0]!.id,
    },
    materials,
    { source: "script" },
  );
  expect(result.code).toBe("accepted");
  f.state = result.state;
}

it("captures one actual visible impact and completes even when that record fills the device", () => {
  const f = fixture();
  recorder(f).impactRecorder!.capacity = 1;
  watch(f);
  expect(recorder(f).impactRecorder!.records).toEqual([]);
  const prior = f.state;
  const before = JSON.stringify(prior);
  const events = attack(f);
  expect(JSON.stringify(prior)).toBe(before);
  expect(recorder(f).impactRecorder!.records).toEqual([
    {
      id: `${id(f, "recorder")}:impact-2`,
      actionId: "action-1",
      observerId: id(f, "observer"),
      attackerId: id(f, "attacker"),
      attackerDefinitionId: "kinetic-specimen",
      targetId: id(f, "victim"),
      tick: 2,
      severity: 30,
      damage: 20,
      armorId: id(f, "armor"),
    },
  ]);
  expect(events).toContainEqual(
    expect.objectContaining({ kind: "recorded", tick: 2 }),
  );
  expect(pawn(f, "observer").queue).toEqual([]);
  expect(site(f).entities[id(f, "empty-recorder")]).toMatchObject({
    impactRecorder: { records: [] },
  });
  step(f, 2);
  expect(recorder(f).impactRecorder!.records).toHaveLength(1);
  const rejected = executeCommand(
    f.state,
    {
      kind: "enqueue",
      siteId: f.siteId,
      entityId: id(f, "observer"),
      action: {
        kind: "observe",
        targetId: id(f, "attacker"),
        recorderId: id(f, "recorder"),
        workTicks: 99,
      },
    },
    materials,
  );
  expect(rejected.reason).toContain("full");
});

it("does not turn mere possession, earlier events or quiet observation into evidence", () => {
  const f = fixture();
  expect(attack(f).some((event) => event.kind === "attacked")).toBe(true);
  cancel(f, "attacker");
  watch(f);
  step(f, 12);
  expect(recorder(f).impactRecorder!.records).toEqual([]);
  expect(pawn(f, "observer").queue[0]!.action).toMatchObject({
    kind: "observe",
  });
  cancel(f, "observer");
  enqueue(f, "observer", {
    kind: "study",
    targetId: id(f, "bench"),
    planId: "kinetic-impact",
    workTicks: 0,
  });
  step(f);
  expect(pawn(f, "observer").queue[0]!.blockedReason).toContain(
    "actual recorded kinetic-specimen impact",
  );
});

it("requires its normal activation turn before an earlier-sorted attack can be recorded", () => {
  const f = fixture();
  enqueue(f, "observer", {
    kind: "observe",
    targetId: id(f, "attacker"),
    recorderId: id(f, "recorder"),
    workTicks: 500,
  });
  attack(f);
  expect(recorder(f).impactRecorder!.records).toEqual([]);
  step(f);
  expect(recorder(f).impactRecorder!.records[0]!.tick).toBe(2);
});

it.each([
  "cancelled",
  "incapable",
  "revoked",
  "broken",
  "another-holder",
] as const)("records nothing after a watch becomes %s", (change) => {
  const f = fixture();
  watch(f);
  if (change === "cancelled") cancel(f, "observer");
  if (change === "incapable") pawn(f, "observer").canAct = false;
  if (change === "revoked") pawn(f, "observer").playerControllable = false;
  if (change === "broken") recorder(f).integrity = 0;
  if (change === "another-holder")
    recorder(f).location = { kind: "carried", carrierId: id(f, "victim") };
  attack(f);
  expect(recorder(f).impactRecorder!.records).toEqual([]);
});

it("checks sight of both the attacker and victim at impact time, not just when the watch starts", () => {
  const f = fixture();
  watch(f);
  pawn(f, "victim").location = { kind: "ground", position: { x: 5, y: 3 } };
  f.state.sites[f.siteId] = {
    ...site(f),
    terrain: site(f).terrain.map((row, index) =>
      index === 3 ? "#...#....#" : row,
    ),
  };
  expect(canSee(site(f), pawn(f, "observer"), id(f, "attacker"))).toBe(true);
  expect(canSee(site(f), pawn(f, "observer"), id(f, "victim"))).toBe(false);
  expect(attack(f).some((event) => event.kind === "attacked")).toBe(true);
  expect(recorder(f).impactRecorder!.records).toEqual([]);
});

it("does not record outside current sight range or before a permission-paused watch resumes on its own turn", () => {
  const distant = fixture();
  watch(distant);
  pawn(distant, "observer").response!.sight = 2;
  attack(distant);
  expect(recorder(distant).impactRecorder!.records).toEqual([]);
  const f = fixture();
  watch(f);
  pawn(f, "observer").playerControllable = false;
  step(f);
  expect(pawn(f, "observer").queue[0]!.blockedReason).toContain(
    "Player control",
  );
  pawn(f, "observer").playerControllable = true;
  attack(f);
  expect(recorder(f).impactRecorder!.records).toEqual([]);
  step(f);
  expect(recorder(f).impactRecorder!.records[0]!.tick).toBe(4);
});

it("records fully absorbed actual impacts but no zero-severity attempt", () => {
  const f = fixture();
  const armor = site(f).entities[id(f, "armor")];
  if (armor?.kind !== "item") throw new Error("Expected armor.");
  armor.equipment!.armor!.reduction = 30;
  watch(f);
  attack(f);
  expect(recorder(f).impactRecorder!.records[0]).toMatchObject({
    severity: 30,
    damage: 0,
  });
  expect(pawn(f, "victim").health!.wounds).toEqual([]);
  const quiet = fixture();
  pawn(quiet, "attacker").response!.attack!.damage = 0;
  watch(quiet);
  attack(quiet);
  expect(recorder(quiet).impactRecorder!.records).toEqual([]);
});

it("preserves a record of the impact that incapacitates an already active observer", () => {
  const f = fixture();
  pawn(f, "observer").location = { kind: "ground", position: { x: 4, y: 2 } };
  pawn(f, "observer").health!.wounds.push({
    id: "earlier",
    severity: 90,
    bleeding: 0,
  });
  watch(f);
  const events = attack(f, "observer");
  expect(pawn(f, "observer").canAct).toBe(false);
  expect(pawn(f, "observer").queue).toEqual([]);
  expect(recorder(f).impactRecorder!.records[0]).toMatchObject({
    observerId: id(f, "observer"),
    targetId: id(f, "observer"),
    damage: 30,
  });
  expect(events.some((event) => event.kind === "recorded")).toBe(true);
});

it("physical analysis selects a qualifying recorded kit rather than an earlier empty one", () => {
  const f = fixture();
  watch(f);
  attack(f);
  cancel(f, "attacker");
  enqueue(f, "observer", {
    kind: "study",
    targetId: id(f, "bench"),
    planId: "kinetic-impact",
    workTicks: 0,
  });
  step(f, 12);
  expect(site(f).entities[id(f, "bench")]).toMatchObject({
    study: {
      findings: [
        {
          planId: "kinetic-impact",
          sourceIds: [id(f, "recorder")],
          observationIds: [recorder(f).impactRecorder!.records[0]!.id],
        },
      ],
    },
  });
  const other = fixture("scp-3008-employee");
  watch(other);
  attack(other);
  cancel(other, "attacker");
  expect(recorder(other).impactRecorder!.records).toHaveLength(1);
  enqueue(other, "observer", {
    kind: "study",
    targetId: id(other, "bench"),
    planId: "kinetic-impact",
    workTicks: 0,
  });
  step(other);
  expect(pawn(other, "observer").queue[0]!.blockedReason).toContain(
    "actual recorded kinetic-specimen impact",
  );
});

it("replays an armed watch and pending attack exactly and refuses a record-based plan with no physical source", () => {
  const f = fixture();
  watch(f);
  enqueue(
    f,
    "attacker",
    { kind: "attack", targetId: id(f, "victim"), workTicks: 0 },
    "script",
  );
  const restored = deserialize(serialize(f.state))!;
  expect(advanceSimulation(restored, materials)).toEqual(
    advanceSimulation(f.state, materials),
  );
  const bench = site(f).entities[id(f, "bench")];
  if (bench?.kind !== "facility") throw new Error("Expected bench.");
  bench.study!.plans = [{ ...bench.study!.plans[0]!, requires: [] }];
  cancel(f, "observer");
  const rejected = executeCommand(
    f.state,
    {
      kind: "enqueue",
      siteId: f.siteId,
      entityId: id(f, "observer"),
      action: {
        kind: "study",
        targetId: bench.id,
        planId: "kinetic-impact",
        workTicks: 0,
      },
    },
    materials,
  );
  expect(rejected.reason).toContain("physical recorder source");
});
