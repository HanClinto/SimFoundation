import { expect, it } from "vitest";
import { entities, materials } from "../../src/simulation/catalog";
import { clockworkSite } from "../../src/simulation/catalog/quests/scp914/setup";
import {
  createSimulation,
  advanceSimulation,
} from "../../src/simulation/core/Simulation";
import { instantiateSite } from "../../src/simulation/core/site/Site";
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import { serialize, deserialize } from "../../src/simulation/core/Snapshot";
import { facilityInUse } from "../../src/simulation/core/entity/Facility";
import { depart } from "../../src/simulation/core/site/Transfer";
import type { ActionState } from "../../src/simulation/core/entity/pawn/actions/Action";

function fixture(condition = 80) {
  const created = instantiateSite(
    createSimulation(),
    {
      ...clockworkSite,
      entities: [
        ...clockworkSite.entities,
        {
          id: "a",
          definitionId: "field-agent",
          location: { kind: "ground", position: { x: 5, y: 3 } },
          overrides: { autonomy: false },
        },
        {
          id: "b",
          definitionId: "field-agent",
          location: { kind: "ground", position: { x: 5, y: 2 } },
          overrides: { autonomy: false },
        },
        {
          id: "vest",
          definitionId: "protective-vest",
          location: { kind: "ground", position: { x: 4, y: 3 } },
          overrides: { integrity: condition },
        },
      ],
    },
    entities,
  );
  return { state: created.state, siteId: created.siteId };
}
type Fixture = ReturnType<typeof fixture>;
const id = (f: Fixture, name: string) => `${f.siteId}:${name}`;
const site = (f: Fixture) => f.state.sites[f.siteId]!;
const outputId = (f: Fixture) => `${id(f, "machine")}:process-1:output`;
function machine(f: Fixture) {
  const entity = site(f).entities[id(f, "machine")];
  if (entity?.kind !== "facility" || !entity.processor)
    throw new Error("Expected processor.");
  return entity;
}
function actor(f: Fixture, name = "a") {
  const entity = site(f).entities[id(f, name)];
  if (entity?.kind !== "pawn") throw new Error("Expected actor.");
  return entity;
}
function order(f: Fixture, action: ActionState, name = "a") {
  const result = executeCommand(
    f.state,
    { kind: "enqueue", siteId: f.siteId, entityId: id(f, name), action },
    materials,
  );
  expect(result.reason).toBeNull();
  f.state = result.state;
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
function process(f: Fixture, recipeId = "very-fine") {
  order(f, {
    kind: "process",
    targetId: id(f, "machine"),
    inputId: id(f, "vest"),
    recipeId,
    workTicks: 0,
  });
}
function started(condition = 80, recipe = "very-fine") {
  const f = fixture(condition);
  process(f, recipe);
  step(f, 2);
  return f;
}

it("owns a real input after activation and completes exactly once independently of its dead operator", () => {
  const f = started();
  const run = structuredClone(machine(f).processor!.current!);
  expect(run).toMatchObject({
    startedTick: 2,
    completesAt: 62,
    inputCondition: 80,
    actorId: id(f, "a"),
  });
  expect(actor(f).queue).toEqual([]);
  expect(site(f).entities[id(f, "vest")]).toMatchObject({
    amount: 1,
    location: { kind: "carried", carrierId: machine(f).id },
  });
  expect(facilityInUse(site(f), machine(f).id)).toBe(true);
  actor(f).health = {
    wounds: [{ id: "critical", severity: 150, bleeding: 0 }],
    bloodLoss: 0,
    mortality: { criticalTicks: 0, fatalAfterTicks: 1 },
  };
  step(f, 59);
  expect(actor(f).health!.death).toBeDefined();
  expect(site(f).entities[outputId(f)]).toBeUndefined();
  const saved = deserialize(serialize(f.state))!;
  expect(advanceSimulation(saved, materials)).toEqual(
    advanceSimulation(f.state, materials),
  );
  expect(step(f).some((event) => event.kind === "processed")).toBe(true);
  expect(site(f).entities[id(f, "vest")]!.amount).toBe(0);
  expect(machine(f).processor!.current).toBeNull();
  expect(site(f).entities[outputId(f)]).toMatchObject({
    definitionId: "clockwork-lattice-shell",
    processed: {
      inputId: id(f, "vest"),
      inputCondition: 80,
      actorId: id(f, "a"),
      startedTick: 2,
      tick: 62,
    },
  });
  const output = structuredClone(site(f).entities[outputId(f)]);
  expect(step(f, 80).some((event) => event.kind === "processed")).toBe(false);
  expect(site(f).entities[outputId(f)]).toEqual(output);
});

it("cancellation before winding completes leaves the actual input and spends no process identity", () => {
  const f = fixture();
  process(f);
  step(f);
  expect(machine(f).processor!.current).toBeNull();
  const cancelled = executeCommand(
    f.state,
    {
      kind: "cancel",
      siteId: f.siteId,
      entityId: id(f, "a"),
      actionId: actor(f).queue[0]!.id,
    },
    materials,
  );
  expect(cancelled.code).toBe("accepted");
  f.state = cancelled.state;
  expect(machine(f).processor!.nextRunId).toBe(1);
  expect(site(f).entities[id(f, "vest")]).toMatchObject({
    amount: 1,
    location: { kind: "ground", position: { x: 4, y: 3 } },
  });
  order(f, {
    kind: "process",
    targetId: machine(f).id,
    inputId: id(f, "vest"),
    recipeId: "coarse",
    workTicks: 100,
  });
  step(f);
  expect(machine(f).processor!.current).toBeNull();
  step(f);
  expect(machine(f).processor!.current!.recipeId).toBe("coarse");
});

it("coarse processing recovers components from broken gear, but produced objects cannot feed a conversion loop", () => {
  const f = started(0, "coarse");
  step(f, 60);
  expect(site(f).entities[outputId(f)]).toMatchObject({
    definitionId: "maintenance-parts",
    amount: 2,
    processed: { inputCondition: 0 },
  });
  const before = JSON.stringify(f.state);
  const rejected = executeCommand(
    f.state,
    {
      kind: "enqueue",
      siteId: f.siteId,
      entityId: id(f, "a"),
      action: {
        kind: "process",
        targetId: machine(f).id,
        inputId: outputId(f),
        recipeId: "very-fine",
        workTicks: 0,
      },
    },
    materials,
  );
  expect(rejected.reason).toContain("one actual protective-vest");
  expect(JSON.stringify(f.state)).toBe(before);
});

it("blocks a completed cycle at an occupied output without consuming early or spamming warnings", () => {
  const f = started();
  order(f, { kind: "move", destination: { x: 8, y: 3 } }, "b");
  expect(
    step(f, 60).filter(
      (event) => event.kind === "warning" && event.entityId === machine(f).id,
    ),
  ).toHaveLength(1);
  expect(site(f).entities[id(f, "vest")]!.amount).toBe(1);
  expect(site(f).entities[outputId(f)]).toBeUndefined();
  expect(machine(f).processor!.current!.blockedReason).toContain("output port");
  expect(
    step(f, 5).filter(
      (event) => event.kind === "warning" && event.entityId === machine(f).id,
    ),
  ).toHaveLength(0);
  const restored = deserialize(serialize(f.state))!;
  expect(advanceSimulation(restored, materials)).toEqual(
    advanceSimulation(f.state, materials),
  );
  order(f, { kind: "move", destination: { x: 9, y: 3 } }, "b");
  step(f);
  expect(machine(f).processor!.current).toBeNull();
  expect(site(f).entities[id(f, "vest")]!.amount).toBe(0);
  expect(site(f).entities[outputId(f)]).toBeDefined();
});

it("keeps active input and apparatus out of ordinary pickup, consumption and transfer", () => {
  const f = started();
  for (const action of [
    { kind: "take", targetId: id(f, "vest") },
    { kind: "eat", targetId: id(f, "machine") },
  ] as const) {
    const result = executeCommand(
      f.state,
      { kind: "enqueue", siteId: f.siteId, entityId: id(f, "a"), action },
      materials,
    );
    expect(result.code).toBe("rejected");
  }
  const destination = instantiateSite(
    f.state,
    { name: "Other", terrain: ["####", "#..#", "#..#", "####"], entities: [] },
    entities,
  );
  f.state = destination.state;
  const result = depart(f.state, {
    originId: f.siteId,
    destinationId: destination.siteId,
    entityIds: [machine(f).id],
    loading: { x: 6, y: 3 },
    arrival: { x: 1, y: 1 },
    duration: 1,
  });
  expect(result.reason).toContain("active processing apparatus");
  expect(result.state).toBe(f.state);
});

it("rejects unsupported settings, living input, worn input and occupied intake before changing state", () => {
  const f = fixture();
  const request = (inputId: string, recipeId: string) =>
    executeCommand(
      f.state,
      {
        kind: "enqueue",
        siteId: f.siteId,
        entityId: id(f, "a"),
        action: {
          kind: "process",
          targetId: machine(f).id,
          inputId,
          recipeId,
          workTicks: 0,
        },
      },
      materials,
    );
  const before = JSON.stringify(f.state);
  expect(request(id(f, "vest"), "rough").reason).toContain(
    "approved processing",
  );
  expect(request(id(f, "b"), "coarse").reason).toContain("not another item");
  expect(JSON.stringify(f.state)).toBe(before);
  const input = site(f).entities[id(f, "vest")];
  if (input?.kind !== "item") throw new Error("Expected input.");
  input.location = { kind: "carried", carrierId: id(f, "a") };
  input.equipment!.worn = true;
  expect(request(input.id, "coarse").reason).toContain("unequip");
  input.equipment!.worn = false;
  input.location = { kind: "ground", position: { x: 4, y: 3 } };
  actor(f, "b").location = { kind: "ground", position: { x: 4, y: 3 } };
  expect(request(input.id, "coarse").reason).toContain("intake port");
});

it("two queued operators cannot activate the same input twice", () => {
  const f = fixture();
  process(f);
  order(
    f,
    {
      kind: "process",
      targetId: machine(f).id,
      inputId: id(f, "vest"),
      recipeId: "coarse",
      workTicks: 0,
    },
    "b",
  );
  step(f, 2);
  expect(machine(f).processor!.nextRunId).toBe(2);
  expect(machine(f).processor!.current).toMatchObject({
    recipeId: "very-fine",
    actorId: id(f, "a"),
  });
  expect(actor(f, "b").queue[0]!.blockedReason).toContain("active processing");
  step(f, 60);
  expect(
    Object.values(site(f).entities).filter(
      (entity) => entity.kind === "item" && entity.processed,
    ),
  ).toHaveLength(1);
});

it("does not invent output if its committed input is missing or its output identity collides", () => {
  const missing = started();
  site(missing).entities[id(missing, "vest")]!.location = {
    kind: "ground",
    position: { x: 3, y: 4 },
  };
  step(missing, 60);
  expect(machine(missing).processor!.current!.blockedReason).toContain(
    "machine custody",
  );
  expect(site(missing).entities[outputId(missing)]).toBeUndefined();
  const conflict = started();
  const existing = {
    ...structuredClone(site(conflict).entities[id(conflict, "vest")]!),
    id: outputId(conflict),
    location: { kind: "ground" as const, position: { x: 9, y: 4 } },
  };
  site(conflict).entities[outputId(conflict)] = existing;
  step(conflict, 60);
  expect(machine(conflict).processor!.current!.blockedReason).toContain(
    "identity",
  );
  expect(site(conflict).entities[outputId(conflict)]).toEqual(existing);
  expect(site(conflict).entities[id(conflict, "vest")]!.amount).toBe(1);
});
