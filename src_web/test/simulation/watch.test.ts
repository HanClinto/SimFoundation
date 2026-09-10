import { expect, it } from "vitest";
import { entities, materials } from "../../src/simulation/catalog";
import { scp173Site } from "../../src/simulation/catalog/quests/scp173/setup";
import { instantiateSite } from "../../src/simulation/core/site/Site";
import {
  createSimulation,
  advanceSimulation,
} from "../../src/simulation/core/Simulation";
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import { directWatchers } from "../../src/simulation/core/entity/pawn/Attention";
import type { ActionState } from "../../src/simulation/core/entity/pawn/actions/Action";
import { serialize, deserialize } from "../../src/simulation/core/Snapshot";

function fixture() {
  const created = instantiateSite(
    createSimulation(),
    {
      ...scp173Site,
      entities: [
        ...scp173Site.entities,
        ...[
          { id: "a", x: 4, y: 1 },
          { id: "b", x: 4, y: 5 },
          { id: "worker", x: 4, y: 3 },
        ].map(({ id, x, y }) => ({
          id,
          definitionId: "field-agent",
          location: { kind: "ground" as const, position: { x, y } },
          overrides: { autonomy: false },
        })),
      ],
    },
    entities,
  );
  return { state: created.state, siteId: created.siteId };
}
type Fixture = ReturnType<typeof fixture>;
const id = (f: Fixture, name: string) => `${f.siteId}:${name}`;
const site = (f: Fixture) => f.state.sites[f.siteId]!;
function pawn(f: Fixture, name: string) {
  const value = site(f).entities[id(f, name)];
  if (value?.kind !== "pawn") throw new Error("Expected pawn.");
  return value;
}
function command(f: Fixture, name: string, action: ActionState) {
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
function watch(f: Fixture, name: string, ticks = 100) {
  command(f, name, {
    kind: "watch",
    targetId: id(f, "subject"),
    ticks,
    workTicks: 0,
  });
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
  );
  expect(result.code).toBe("accepted");
  f.state = result.state;
}

it("only active conscious direct watch freezes the original source, with exact replay and no saved attention registry", () => {
  const f = fixture();
  expect(directWatchers(site(f), id(f, "subject"))).toEqual([]);
  watch(f, "a");
  expect(directWatchers(site(f), id(f, "subject"))).toEqual([]);
  step(f);
  expect(directWatchers(site(f), id(f, "subject")).map((p) => p.id)).toEqual([
    id(f, "a"),
  ]);
  command(f, "worker", {
    kind: "door",
    targetId: id(f, "gate"),
    policy: "held-open",
    workTicks: 0,
  });
  step(f, 8);
  const location = pawn(f, "subject").location;
  const restored = deserialize(serialize(f.state))!;
  expect(advanceSimulation(restored, materials)).toEqual(
    advanceSimulation(f.state, materials),
  );
  expect(step(f, 10).some((event) => event.kind === "attacked")).toBe(false);
  expect(pawn(f, "subject").location).toEqual(location);
  cancel(f, "a");
  const events = step(f, 15);
  expect(events.some((event) => event.kind === "attacked")).toBe(true);
  expect(
    Object.values(site(f).entities).some(
      (entity) => entity.kind === "pawn" && entity.health?.death,
    ),
  ).toBe(true);
});

it("two distinct observers protect a third worker's supply-backed task; one still freezes but cannot authorize work", () => {
  const f = fixture();
  watch(f, "a");
  step(f);
  const work: ActionState = {
    kind: "service",
    targetId: id(f, "station"),
    workTicks: 0,
  };
  expect(
    executeCommand(
      f.state,
      {
        kind: "enqueue",
        siteId: f.siteId,
        entityId: id(f, "worker"),
        action: work,
      },
      materials,
    ).reason,
  ).toContain("2 active direct observers");
  watch(f, "b");
  step(f);
  pawn(f, "a").location = { kind: "ground", position: { x: 10, y: 3 } };
  pawn(f, "b").location = { kind: "ground", position: { x: 9, y: 4 } };
  command(f, "worker", {
    kind: "door",
    targetId: id(f, "gate"),
    policy: "held-open",
    workTicks: 0,
  });
  command(f, "worker", work);
  step(f, 25);
  expect(site(f).entities[id(f, "cleaning")]!.amount).toBe(2);
  expect(site(f).entities[id(f, "station")]).toMatchObject({
    service: { history: [{ kind: "service", actorId: id(f, "worker") }] },
  });
  command(f, "worker", {
    kind: "study",
    targetId: id(f, "station"),
    planId: "direct-watch-protocol",
    workTicks: 0,
  });
  step(f, 2);
  cancel(f, "a");
  step(f);
  expect(pawn(f, "worker").queue[0]!.blockedReason).toContain("2 active");
  expect(pawn(f, "worker").queue[0]!.action).toMatchObject({ workTicks: 0 });
  expect(directWatchers(site(f), id(f, "subject"))).toHaveLength(1);
  watch(f, "a");
  step(f, 14);
  expect(site(f).entities[id(f, "station")]).toMatchObject({
    study: {
      findings: [
        { planId: "direct-watch-protocol", sourceIds: [id(f, "subject")] },
      ],
    },
  });
});

it.each([
  "fatigue",
  "incapacity",
  "permission",
  "carried",
  "sight",
  "nonhuman",
] as const)(
  "withdraws coverage immediately on %s and preserves the other observer",
  (change) => {
    const f = fixture();
    watch(f, "a");
    watch(f, "b");
    step(f);
    const observer = pawn(f, "a");
    if (change === "fatigue") observer.needs.fatigue!.value = 85;
    if (change === "incapacity") observer.canAct = false;
    if (change === "permission") observer.playerControllable = false;
    if (change === "carried")
      observer.location = { kind: "carried", carrierId: id(f, "worker") };
    if (change === "sight") observer.response!.sight = 1;
    if (change === "nonhuman") observer.human = false;
    expect(directWatchers(site(f), id(f, "subject")).map((p) => p.id)).toEqual([
      id(f, "b"),
    ]);
    expect(step(f, 3).some((event) => event.kind === "attacked")).toBe(false);
  },
);

it("assigned maintenance runs under protected coverage rather than fleeing an immobilized source", () => {
  const f = fixture();
  watch(f, "a");
  watch(f, "b");
  step(f);
  pawn(f, "a").location = { kind: "ground", position: { x: 10, y: 3 } };
  pawn(f, "b").location = { kind: "ground", position: { x: 9, y: 4 } };
  command(f, "worker", {
    kind: "door",
    targetId: id(f, "gate"),
    policy: "held-open",
    workTicks: 0,
  });
  step(f, 3);
  const assigned = executeCommand(
    f.state,
    {
      kind: "duty",
      siteId: f.siteId,
      entityId: id(f, "worker"),
      targetId: id(f, "station"),
    },
    materials,
  );
  expect(assigned.code).toBe("accepted");
  f.state = assigned.state;
  step(f, 25);
  expect(site(f).entities[id(f, "station")]).toMatchObject({
    service: { history: [{ kind: "service", actorId: id(f, "worker") }] },
  });
  expect(site(f).entities[id(f, "cleaning")]!.amount).toBe(2);
});

it("warns before a finite watch ends, removes coverage at completion, and requires actual rest before another fatigued watch", () => {
  const f = fixture();
  watch(f, "a", 12);
  const events = step(f, 13);
  expect(
    events.filter(
      (event) => event.kind === "warning" && event.entityId === id(f, "a"),
    ),
  ).toHaveLength(2);
  expect(pawn(f, "a").queue).toEqual([]);
  expect(directWatchers(site(f), id(f, "subject"))).toEqual([]);
  pawn(f, "a").needs.fatigue!.value = 84.8;
  watch(f, "a");
  const tired = step(f);
  expect(tired.some((event) => event.kind === "interrupted")).toBe(true);
  expect(directWatchers(site(f), id(f, "subject"))).toEqual([]);
});

it("overlapping relief activates before release, and a locked door remains a separate physical fallback", () => {
  const f = fixture();
  watch(f, "a");
  step(f);
  watch(f, "b");
  step(f);
  cancel(f, "a");
  expect(directWatchers(site(f), id(f, "subject")).map((p) => p.id)).toEqual([
    id(f, "b"),
  ]);
  cancel(f, "b");
  expect(step(f, 30).some((event) => event.kind === "attacked")).toBe(false);
  expect(site(f).entities[id(f, "gate")]).toMatchObject({
    open: false,
    policy: "held-closed",
  });
});

it.each(["a", "worker"])(
  "a one-tick watch by earlier/later sorted %s holds one full subject turn",
  (name) => {
    const f = fixture();
    pawn(f, name).location = { kind: "ground", position: { x: 8, y: 2 } };
    if (name === "worker") {
      // A later-sorted observer must activate before the dangerous actor is enabled.
      pawn(f, "subject").autonomy = false;
    }
    watch(f, name, 1);
    const initial = step(f);
    expect(
      directWatchers(site(f), id(f, "subject")).map((observer) => observer.id),
    ).toEqual([id(f, name)]);
    if (name === "a")
      expect(initial.some((event) => event.kind === "attacked")).toBe(false);
    pawn(f, "subject").autonomy = true;
    const next = step(f);
    expect(directWatchers(site(f), id(f, "subject"))).toEqual([]);
    if (name === "worker") {
      expect(next.some((event) => event.kind === "attacked")).toBe(false);
      expect(step(f).some((event) => event.kind === "attacked")).toBe(true);
    } else {
      expect(next.some((event) => event.kind === "attacked")).toBe(true);
    }
  },
);
