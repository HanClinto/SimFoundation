import { expect, it } from "vitest";
import { applyNeedChanges } from "../../src/simulation/core/entity/pawn/Needs";
import trial from "../../src/simulation/catalog/sites/tests/RestAndResearch.json";
import { entities, materials } from "../../src/simulation/catalog";
import {
  instantiateSite,
  type SiteTemplate,
} from "../../src/simulation/core/site/Site";
import { instantiateEntity } from "../../src/simulation/core/site/EntityPlacement";
import {
  advanceSimulation,
  createSimulation,
  type Simulation,
} from "../../src/simulation/core/Simulation";
import {
  executeCommand,
  previewCommand,
} from "../../src/simulation/core/ControlPolicy";
import { deserialize, serialize } from "../../src/simulation/core/Snapshot";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import type { Facility } from "../../src/simulation/core/entity/Facility";
import { facilityInUse } from "../../src/simulation/core/entity/Facility";
import type {
  ActionState,
  ActivityState,
} from "../../src/simulation/core/entity/pawn/actions/Action";
import { chooseAction } from "../../src/simulation/core/entity/pawn/Autonomy";
import { depart } from "../../src/simulation/core/site/Transfer";

function setup() {
  const created = instantiateSite(
    createSimulation(),
    trial as SiteTemplate,
    entities,
  );
  return {
    ...created,
    actorId: `${created.siteId}:operator`,
    bedId: `${created.siteId}:bed`,
    chairId: `${created.siteId}:chair`,
    deskId: `${created.siteId}:desk`,
  };
}

function enqueue(
  state: Simulation,
  siteId: string,
  entityId: string,
  action: ActionState,
): Simulation {
  const result = executeCommand(
    state,
    { kind: "enqueue", siteId, entityId, action },
    materials,
  );
  expect(result.code).toBe("accepted");
  return result.state;
}

function advance(state: Simulation, count = 1): Simulation {
  for (let tick = 0; tick < count; tick++)
    state = advanceSimulation(state, materials).state;
  return state;
}

function choice(state: Simulation, siteId: string, actorId: string) {
  const site = state.sites[siteId]!;
  return chooseAction({
    site,
    pawn: site.entities[actorId] as Pawn,
    materials,
    tick: state.tick,
    events: [],
  });
}

it("applies benefits and costs together without creating absent needs", () => {
  const needs = {
    fatigue: { value: 5, increasePerTick: 0.1 },
    stress: { value: 98, increasePerTick: 0 },
  };
  applyNeedChanges(needs, { fatigue: -8, stress: 4, curiosity: -3 });
  expect(needs).toEqual({
    fatigue: { value: 0, increasePerTick: 0.1 },
    stress: { value: 100, increasePerTick: 0 },
  });
});

it("hungry with no food chooses real sleep, improves two needs, and finishes with autonomy off through reload", () => {
  const { state: initial, siteId, actorId, bedId } = setup();
  expect(choice(initial, siteId, actorId)).toEqual({
    kind: "sleep",
    targetId: bedId,
    workTicks: 0,
  });
  const before = serialize(initial);
  let state = advance(initial);
  expect(serialize(initial)).toBe(before);
  expect(
    (state.sites[siteId]!.entities[actorId] as Pawn).queue[0]!.action.kind,
  ).toBe("sleep");
  state = executeCommand(
    state,
    { kind: "autonomy", siteId, entityId: actorId, enabled: false },
    materials,
  ).state;
  state = advance(state, 4);
  const resting = state.sites[siteId]!.entities[actorId] as Pawn;
  expect((resting.queue[0]!.action as ActivityState).workTicks).toBeGreaterThan(
    0,
  );
  expect(resting.needs.fatigue!.value).toBeLessThan(20);
  expect(resting.needs.stress!.value).toBeLessThan(10);
  expect(facilityInUse(state.sites[siteId]!, bedId)).toBe(true);
  let replay = deserialize(serialize(state))!;
  for (let tick = 0; tick < 12; tick++) {
    state = advance(state);
    replay = advance(replay);
    expect(replay).toEqual(state);
  }
  const finished = state.sites[siteId]!.entities[actorId] as Pawn;
  expect(finished.queue).toEqual([]);
  expect(finished.autonomy).toBe(false);
  expect(finished.needs.hunger!.value).toBe(95);
  expect(finished.needs.stress!.value).toBe(0);
  expect(facilityInUse(state.sites[siteId]!, bedId)).toBe(false);
  expect(state.sites[siteId]!.entities[bedId]!.amount).toBe(1);
});

it("chooses different facilities for fatigue and stress, while one action can address both", () => {
  const { state, siteId, actorId, bedId, chairId } = setup();
  const pawn = state.sites[siteId]!.entities[actorId] as Pawn;
  pawn.needs = {
    fatigue: { value: 80, increasePerTick: 0 },
    stress: { value: 60, increasePerTick: 0 },
  };
  expect(choice(state, siteId, actorId)).toMatchObject({
    kind: "sleep",
    targetId: bedId,
  });
  pawn.needs.stress!.value = 90;
  expect(choice(state, siteId, actorId)).toMatchObject({
    kind: "relax",
    targetId: chairId,
  });
  delete state.sites[siteId]!.entities[chairId];
  expect(choice(state, siteId, actorId)).toMatchObject({
    kind: "sleep",
    targetId: bedId,
  });
});

it("gives an occupied bed one user, offers another bed, and releases use on cancellation", () => {
  const { state: initial, siteId, actorId, bedId } = setup();
  const site = initial.sites[siteId]!;
  const pawn = site.entities[actorId] as Pawn;
  pawn.autonomy = false;
  pawn.location = { kind: "ground", position: { x: 4, y: 1 } };
  site.entities.zeta = instantiateEntity(
    {
      id: "zeta",
      definitionId: "field-agent",
      location: { kind: "ground", position: { x: 5, y: 2 } },
      overrides: { autonomy: false },
    },
    entities,
  );
  let state = enqueue(initial, siteId, actorId, {
    kind: "sleep",
    targetId: bedId,
    workTicks: 99,
  });
  expect(
    (state.sites[siteId]!.entities[actorId] as Pawn).queue[0]!.action,
  ).toMatchObject({ workTicks: 0 });
  state = enqueue(state, siteId, "zeta", {
    kind: "sleep",
    targetId: bedId,
    workTicks: 0,
  });
  state = advance(state);
  expect(
    (state.sites[siteId]!.entities[actorId] as Pawn).queue[0]!.action,
  ).toMatchObject({ workTicks: 1 });
  expect((state.sites[siteId]!.entities.zeta as Pawn).queue[0]!).toMatchObject({
    blockedReason: "The facility is occupied.",
    action: { workTicks: 0 },
  });
  const takeover = {
    kind: "enqueue" as const,
    siteId,
    entityId: "zeta",
    action: { kind: "take" as const, targetId: bedId },
  };
  const fresh = structuredClone(state);
  (fresh.sites[siteId]!.entities.zeta as Pawn).queue = [];
  expect(executeCommand(fresh, takeover, materials).reason).toContain(
    "occupied",
  );
  fresh.sites[siteId]!.entities.spare = instantiateEntity(
    {
      id: "spare",
      definitionId: "bed",
      location: { kind: "ground", position: { x: 7, y: 4 } },
    },
    entities,
  );
  expect(choice(fresh, siteId, "zeta")).toMatchObject({
    kind: "sleep",
    targetId: "spare",
  });
  const actionId = (state.sites[siteId]!.entities[actorId] as Pawn).queue[0]!
    .id;
  const cancel = {
    kind: "cancel" as const,
    siteId,
    entityId: actorId,
    actionId,
  };
  const saved = serialize(state);
  expect(previewCommand(state, cancel, materials).code).toBe("accepted");
  expect(serialize(state)).toBe(saved);
  state = executeCommand(state, cancel, materials).state;
  expect(facilityInUse(state.sites[siteId]!, bedId)).toBe(false);
  state = advance(state);
  expect(
    (state.sites[siteId]!.entities.zeta as Pawn).queue[0]!.action,
  ).toMatchObject({ workTicks: 1 });
});

it("does research only at the desk, adds stress and fatigue, then autonomously chooses relief", () => {
  const { state: initial, siteId, actorId, deskId, chairId } = setup();
  const pawn = initial.sites[siteId]!.entities[actorId] as Pawn;
  pawn.needs = {
    stress: { value: 0, increasePerTick: 0 },
    fatigue: { value: 0, increasePerTick: 0 },
    curiosity: { value: 90, increasePerTick: 0 },
  };
  expect(choice(initial, siteId, actorId)).toMatchObject({
    kind: "research",
    targetId: deskId,
  });
  let state = enqueue(initial, siteId, actorId, {
    kind: "research",
    targetId: deskId,
    workTicks: 0,
  });
  state = advance(state);
  expect(
    (state.sites[siteId]!.entities[deskId] as Facility).research!.progress,
  ).toBe(0);
  expect(
    (state.sites[siteId]!.entities[actorId] as Pawn).needs.stress!.value,
  ).toBe(0);
  for (let tick = 0; tick < 20; tick++) {
    if (!(state.sites[siteId]!.entities[actorId] as Pawn).queue.length) break;
    state = advance(state);
  }
  const researcher = state.sites[siteId]!.entities[actorId] as Pawn;
  expect(researcher.queue).toEqual([]);
  expect(researcher.needs).toMatchObject({
    stress: { value: 18 },
    fatigue: { value: 6 },
    curiosity: { value: 66 },
  });
  expect(
    (state.sites[siteId]!.entities[deskId] as Facility).research!.progress,
  ).toBe(6);
  expect(choice(state, siteId, actorId)).toMatchObject({ kind: "research" });
  researcher.needs.stress!.value = 85;
  expect(choice(state, siteId, actorId)).toMatchObject({
    kind: "relax",
    targetId: chairId,
  });
  let relaxed = advance(state);
  const relaxId = (relaxed.sites[siteId]!.entities[actorId] as Pawn).queue[0]!
    .id;
  relaxed = executeCommand(
    relaxed,
    { kind: "autonomy", siteId, entityId: actorId, enabled: false },
    materials,
  ).state;
  for (let tick = 0; tick < 20; tick++) {
    if (
      !(relaxed.sites[siteId]!.entities[actorId] as Pawn).queue.some(
        (entry) => entry.id === relaxId,
      )
    )
      break;
    relaxed = advance(relaxed);
  }
  expect(
    (relaxed.sites[siteId]!.entities[actorId] as Pawn).needs.stress!.value,
  ).toBe(49);
  expect(
    (relaxed.sites[siteId]!.entities[actorId] as Pawn).needs.fatigue!.value,
  ).toBe(0);
  expect(
    (relaxed.sites[siteId]!.entities[deskId] as Facility).research!.progress,
  ).toBe(6);
});

it("an unreachable or removed research target produces no work or action stress", () => {
  const { state: initial, siteId, actorId, deskId } = setup();
  const site = initial.sites[siteId]!;
  const pawn = site.entities[actorId] as Pawn;
  pawn.autonomy = false;
  pawn.needs = { stress: { value: 0, increasePerTick: 0 } };
  site.terrain = [
    "#########",
    "#.......#",
    "#########",
    "#.......#",
    "#.......#",
    "#.......#",
    "#########",
  ];
  let state = enqueue(initial, siteId, actorId, {
    kind: "research",
    targetId: deskId,
    workTicks: 0,
  });
  state = advance(state, 3);
  expect(
    (state.sites[siteId]!.entities[actorId] as Pawn).queue[0]!.action,
  ).toMatchObject({ workTicks: 0 });
  expect(
    (state.sites[siteId]!.entities[deskId] as Facility).research!.progress,
  ).toBe(0);
  expect(
    (state.sites[siteId]!.entities[actorId] as Pawn).needs.stress!.value,
  ).toBe(0);
  delete state.sites[siteId]!.entities[deskId];
  state = advance(state);
  expect((state.sites[siteId]!.entities[actorId] as Pawn).queue).toEqual([]);
});

it("prevents transporting an active facility and preserves partial research on cancellation/reload", () => {
  const { state: initial, siteId, actorId, deskId } = setup();
  const pawn = initial.sites[siteId]!.entities[actorId] as Pawn;
  pawn.autonomy = false;
  pawn.location = { kind: "ground", position: { x: 1, y: 4 } };
  let state = enqueue(initial, siteId, actorId, {
    kind: "research",
    targetId: deskId,
    workTicks: 0,
  });
  state = advance(state, 2);
  const other = instantiateSite(
    state,
    { name: "Other", terrain: ["..."], entities: [] },
    entities,
  );
  expect(
    depart(other.state, {
      originId: siteId,
      destinationId: other.siteId,
      entityIds: [deskId],
      loading: { x: 1, y: 5 },
      arrival: { x: 1, y: 0 },
      duration: 1,
    }).reason,
  ).toContain("facility");
  state = deserialize(serialize(state))!;
  expect(advance(state)).toEqual(advance(deserialize(serialize(state))!));
  const current = (state.sites[siteId]!.entities[actorId] as Pawn).queue[0]!;
  state = executeCommand(
    state,
    { kind: "cancel", siteId, entityId: actorId, actionId: current.id },
    materials,
  ).state;
  state = advance(state, 3);
  expect(
    (state.sites[siteId]!.entities[deskId] as Facility).research!.progress,
  ).toBe(2);
  expect(facilityInUse(state.sites[siteId]!, deskId)).toBe(false);
});
