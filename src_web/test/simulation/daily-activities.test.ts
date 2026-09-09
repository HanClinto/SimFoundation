import { expect, it } from "vitest";
import { Read } from "../../src/simulation/core/entity/pawn/actions/Read";
import { Bookshelf } from "../../src/simulation/catalog/entities/furniture/Bookshelf";
import { instantiateEntity } from "../../src/simulation/core/site/EntityPlacement";
import { entities, materials } from "../../src/simulation/catalog";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import trial from "../../src/simulation/catalog/sites/tests/DailyLife.json";
import {
  instantiateSite,
  type SiteTemplate,
} from "../../src/simulation/core/site/Site";
import {
  createSimulation,
  advanceSimulation,
  type Simulation,
} from "../../src/simulation/core/Simulation";
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import { chooseAction } from "../../src/simulation/core/entity/pawn/Autonomy";
import { deserialize, serialize } from "../../src/simulation/core/Snapshot";
import type { ActivityKind } from "../../src/simulation/core/entity/pawn/actions/Action";
import type { Facility } from "../../src/simulation/core/entity/Facility";

function setup() {
  const created = instantiateSite(
    createSimulation(),
    trial as SiteTemplate,
    entities,
  );
  return {
    ...created,
    actorId: `${created.siteId}:researcher`,
    id: (local: string) => `${created.siteId}:${local}`,
  };
}

function choose(state: Simulation, siteId: string, actorId: string) {
  const site = state.sites[siteId]!;
  return chooseAction({
    site,
    pawn: site.entities[actorId] as Pawn,
    materials,
    tick: state.tick,
    events: [],
  });
}

const need = (value: number) => ({ value, increasePerTick: 0 });

it("keeps Curiosity distinct, uses only Restlessness for activity variety, and leaves hygiene optional", () => {
  const { state, siteId, actorId } = setup();
  const pawn = state.sites[siteId]!.entities[actorId] as Pawn;
  expect(pawn.needs.curiosity).toBeDefined();
  expect(pawn.needs.restlessness).toBeDefined();
  expect(pawn.needs).not.toHaveProperty("boredom");
  expect(pawn.needs.hygiene).toBeDefined();
  const ordinary = instantiateEntity(
    {
      id: "ordinary",
      definitionId: "field-agent",
      location: { kind: "ground", position: { x: 0, y: 0 } },
    },
    entities,
  ) as Pawn;
  expect(ordinary.needs).not.toHaveProperty("hygiene");
});

it("reading addresses curiosity, restlessness and stress without inventing research output", () => {
  const pawn = instantiateEntity(
    {
      id: "reader",
      definitionId: "field-agent",
      location: { kind: "ground", position: { x: 0, y: 0 } },
      overrides: {
        needs: {
          curiosity: { value: 60, increasePerTick: 0 },
          restlessness: { value: 50, increasePerTick: 0 },
          stress: { value: 30, increasePerTick: 0 },
        },
      },
    },
    entities,
  ) as Pawn;
  const shelf = instantiateEntity(
    {
      id: "shelf",
      definitionId: Bookshelf.id,
      location: { kind: "ground", position: { x: 1, y: 0 } },
    },
    { [Bookshelf.id]: Bookshelf },
  );
  const context = {
    site: {
      id: "site",
      name: "Site",
      terrain: ["..."],
      entities: { reader: pawn, shelf },
    },
    pawn,
    materials,
    tick: 1,
    events: [],
  };
  expect(Read.needAction.offer(context, "curiosity")?.relief).toBe(3);
  const action = new Read({ kind: "read", targetId: "shelf", workTicks: 0 });
  for (let tick = 0; tick < 5; tick++)
    expect(action.tick(context).status).toBe("running");
  expect(action.tick(context).status).toBe("completed");
  expect(pawn.needs).toMatchObject({
    curiosity: { value: 42 },
    restlessness: { value: 26 },
    stress: { value: 24 },
  });
  expect(shelf).not.toHaveProperty("research");
});

it("curiosity and restlessness have distinct preferred activities, with reading as a shared fallback", () => {
  const { state, siteId, actorId, id } = setup();
  const pawn = state.sites[siteId]!.entities[actorId] as Pawn;
  pawn.needs = { curiosity: need(80), restlessness: need(20) };
  expect(choose(state, siteId, actorId)).toMatchObject({
    kind: "research",
    targetId: id("desk"),
  });
  pawn.needs.restlessness!.value = 90;
  expect(choose(state, siteId, actorId)).toMatchObject({
    kind: "exercise",
    targetId: id("bike"),
  });
  state.sites[siteId]!.entities[id("bike")]!.location = {
    kind: "carried",
    carrierId: actorId,
  };
  expect(choose(state, siteId, actorId)).toMatchObject({
    kind: "read",
    targetId: id("shelf"),
  });
  pawn.needs.restlessness!.value = 20;
  state.sites[siteId]!.entities[id("desk")]!.location = {
    kind: "carried",
    carrierId: actorId,
  };
  expect(choose(state, siteId, actorId)).toMatchObject({
    kind: "read",
    targetId: id("shelf"),
  });
  expect(pawn.queue).toEqual([]);
});

it("a real workout creates fatigue, hunger and hygiene pressure, then the pawn chooses to wash", () => {
  const { state: initial, siteId, actorId, id } = setup();
  const pawn = initial.sites[siteId]!.entities[actorId] as Pawn;
  pawn.location = { kind: "ground", position: { x: 3, y: 4 } };
  pawn.needs = {
    restlessness: need(40),
    stress: need(20),
    fatigue: need(0),
    hunger: need(0),
    hygiene: need(35),
  };
  expect(choose(initial, siteId, actorId)).toMatchObject({ kind: "exercise" });
  let state = initial;
  for (let tick = 0; tick < 5; tick++)
    state = advanceSimulation(state, materials).state;
  expect((state.sites[siteId]!.entities[actorId] as Pawn).queue).toEqual([]);
  expect((state.sites[siteId]!.entities[actorId] as Pawn).needs).toMatchObject({
    restlessness: { value: 10 },
    stress: { value: 10 },
    fatigue: { value: 15 },
    hunger: { value: 5 },
    hygiene: { value: 45 },
  });
  expect(choose(state, siteId, actorId)).toMatchObject({
    kind: "wash",
    targetId: id("basin"),
  });
  state = advanceSimulation(state, materials).state;
  state = executeCommand(
    state,
    { kind: "autonomy", siteId, entityId: actorId, enabled: false },
    materials,
  ).state;
  for (
    let tick = 0;
    tick < 20 && (state.sites[siteId]!.entities[actorId] as Pawn).queue.length;
    tick++
  )
    state = advanceSimulation(state, materials).state;
  expect((state.sites[siteId]!.entities[actorId] as Pawn).needs).toMatchObject({
    hygiene: { value: 15 },
    stress: { value: 7 },
    fatigue: { value: 15 },
  });
  expect(state.sites[siteId]!.entities[id("basin")]!.amount).toBe(1);
});

it.each([
  ["read", "shelf", { x: 7, y: 6 }],
  ["exercise", "bike", { x: 3, y: 4 }],
  ["wash", "basin", { x: 7, y: 4 }],
] as const)(
  "%s runs through the queue and resumes exactly from a mid-session snapshot",
  (kind, target, position) => {
    const { state: initial, siteId, actorId, id } = setup();
    const pawn = initial.sites[siteId]!.entities[actorId] as Pawn;
    pawn.autonomy = false;
    pawn.location = { kind: "ground", position: { ...position } };
    pawn.needs = {
      curiosity: need(60),
      restlessness: need(60),
      stress: need(60),
      hygiene: need(60),
      fatigue: need(10),
      hunger: need(10),
    };
    const result = executeCommand(
      initial,
      {
        kind: "enqueue",
        siteId,
        entityId: actorId,
        action: { kind, targetId: id(target), workTicks: 0 },
      },
      materials,
    );
    expect(result.code).toBe("accepted");
    let state = advanceSimulation(result.state, materials).state;
    expect(
      (state.sites[siteId]!.entities[actorId] as Pawn).queue[0]!.action,
    ).toMatchObject({ workTicks: 1 });
    let replay = deserialize(serialize(state))!;
    for (let tick = 0; tick < 8; tick++) {
      state = advanceSimulation(state, materials).state;
      replay = advanceSimulation(replay, materials).state;
      expect(replay).toEqual(state);
    }
    expect((state.sites[siteId]!.entities[actorId] as Pawn).queue).toEqual([]);
    const activity = (initial.sites[siteId]!.entities[id(target)] as Facility)
      .activities[kind]!;
    for (const [needId, delta] of Object.entries(activity.needChanges)) {
      expect(
        (state.sites[siteId]!.entities[actorId] as Pawn).needs[needId]!.value,
      ).toBe(
        Math.max(
          0,
          Math.min(100, pawn.needs[needId]!.value + delta * activity.duration),
        ),
      );
    }
  },
);

it("a longer authored autonomous run alternates study and care without a scripted schedule", () => {
  const { state: initial, siteId, actorId, id } = setup();
  const before = serialize(initial);
  let state = initial;
  const completed = new Set<string>();
  for (let tick = 0; tick < 300; tick++) {
    const current = (state.sites[siteId]!.entities[actorId] as Pawn).queue[0]
      ?.action.kind;
    const chosen = current ?? choose(state, siteId, actorId)?.kind;
    const result = advanceSimulation(state, materials);
    if (
      chosen &&
      result.events.some(
        (event) => event.entityId === actorId && event.kind === "completed",
      )
    )
      completed.add(chosen);
    state = result.state;
  }
  expect(serialize(initial)).toBe(before);
  expect([...completed]).toEqual(
    expect.arrayContaining([
      "research",
      "exercise",
      "wash",
      "sleep",
      "relax",
      "eat",
    ]),
  );
  expect(
    (state.sites[siteId]!.entities[id("desk")] as Facility).research!.progress,
  ).toBeGreaterThan(0);
  for (const value of Object.values(
    (state.sites[siteId]!.entities[actorId] as Pawn).needs,
  )) {
    expect(value.value).toBeGreaterThanOrEqual(0);
    expect(value.value).toBeLessThanOrEqual(100);
  }
});

it("activity costs do not create needs the pawn lacks", () => {
  const { state: initial, siteId, actorId, id } = setup();
  const pawn = initial.sites[siteId]!.entities[actorId] as Pawn;
  pawn.needs = { restlessness: need(40) };
  pawn.location = { kind: "ground", position: { x: 3, y: 4 } };
  pawn.autonomy = false;
  let state = executeCommand(
    initial,
    {
      kind: "enqueue",
      siteId,
      entityId: actorId,
      action: {
        kind: "exercise" as ActivityKind,
        targetId: id("bike"),
        workTicks: 0,
      },
    },
    materials,
  ).state;
  for (let tick = 0; tick < 5; tick++)
    state = advanceSimulation(state, materials).state;
  expect((state.sites[siteId]!.entities[actorId] as Pawn).needs).toEqual({
    restlessness: need(10),
  });
});
