import { expect, it } from "vitest";
import {
  createSimulation,
  type Entity,
  type Pawn,
  type Simulation,
  type Site,
} from "../../src/simulation/model";
import { advanceSimulation, collectProposals } from "../../src/simulation/tick";
import { resolveTick } from "../../src/simulation/actions/resolve";
import {
  executeCommand,
  previewCommand,
  type Command,
} from "../../src/simulation/actions/commands";
import { deserialize, serialize } from "../../src/simulation/snapshot";
import { positionOf } from "../../src/simulation/world/spatial";

function pawn(
  id: string,
  x: number,
  y: number,
  options: Partial<Pawn> = {},
): Pawn {
  return {
    id,
    kind: "pawn",
    definitionId: "staff",
    name: id,
    location: { kind: "ground", position: { x, y } },
    carryable: true,
    mobile: true,
    canAct: true,
    autonomy: true,
    playerControllable: true,
    needs: { hunger: { value: 10, increasePerTick: 1 } },
    queue: [],
    patrol: [],
    ...options,
  };
}

function simulation(
  entities: readonly Entity[],
  terrain = [".......", ".......", ".......", ".......", "......."],
): Simulation {
  const site: Site = {
    id: "site-a",
    name: "Test",
    terrain,
    entities: Object.fromEntries(entities.map((entity) => [entity.id, entity])),
  };
  return { ...createSimulation(), sites: { [site.id]: site } };
}

function enqueue(
  state: Simulation,
  entityId: string,
  action: Extract<Command, { kind: "enqueue" }>["action"],
): Simulation {
  const result = executeCommand(state, {
    kind: "enqueue",
    siteId: "site-a",
    entityId,
    action,
  });
  expect(result.code).toBe("accepted");
  return result.state;
}

function freeze(value: unknown): void {
  if (typeof value !== "object" || !value || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
}

it("uses one movement executor for player staff and autonomous pawns without combat state", () => {
  let state = simulation([
    pawn("staff", 0, 0),
    pawn("npc", 0, 3, {
      definitionId: "wanderer",
      playerControllable: false,
      needs: {},
      patrol: [{ x: 3, y: 3 }],
    }),
  ]);
  state = enqueue(state, "staff", {
    kind: "move",
    destination: { x: 3, y: 0 },
  });
  const before = serialize(state);
  freeze(state);
  for (let tick = 0; tick < 3; tick++) state = advanceSimulation(state).state;
  expect(positionOf(state.sites["site-a"]!, "staff")).toEqual({ x: 3, y: 0 });
  expect(positionOf(state.sites["site-a"]!, "npc")).toEqual({ x: 3, y: 3 });
  expect((state.sites["site-a"]!.entities.npc as Pawn).needs).toEqual({});
  expect(state).not.toHaveProperty("combat");
  expect(deserialize(before)!.tick).toBe(0);
});

it("resolves contested movement by stable ID independent of entity and proposal order", () => {
  let state = simulation([pawn("b", 2, 1), pawn("a", 0, 1)]);
  for (const id of ["b", "a"])
    state = enqueue(state, id, { kind: "move", destination: { x: 1, y: 1 } });
  const site = state.sites["site-a"]!;
  freeze(site);
  const proposals = collectProposals(site, 1);
  const result = resolveTick(site, proposals);
  expect(resolveTick(site, [...proposals].reverse())).toEqual(result);
  const reversed = {
    ...site,
    entities: Object.fromEntries(Object.entries(site.entities).reverse()),
  };
  expect(resolveTick(reversed, collectProposals(reversed, 1))).toEqual(result);
  expect(positionOf(result.site, "a")).toEqual({ x: 1, y: 1 });
  expect(positionOf(result.site, "b")).toEqual({ x: 2, y: 1 });
  expect((result.site.entities.b as Pawn).queue[0]!.blockedReason).toContain(
    "claimed",
  );
});

it("opens doors on one tick and moves on the next; unused automatic doors close through their behavior", () => {
  const door: Entity = {
    kind: "door",
    id: "door",
    name: "Door",
    definitionId: "automatic-door",
    carryable: false,
    location: { kind: "ground", position: { x: 2, y: 1 } },
    open: false,
    policy: "automatic",
  };
  let state = enqueue(
    simulation([pawn("staff", 1, 1), door], ["#######", ".......", "#######"]),
    "staff",
    { kind: "move", destination: { x: 5, y: 1 } },
  );
  state = advanceSimulation(state).state;
  expect(positionOf(state.sites["site-a"]!, "staff")).toEqual({ x: 1, y: 1 });
  expect(state.sites["site-a"]!.entities.door).toMatchObject({ open: true });
  state = advanceSimulation(state).state;
  expect(positionOf(state.sites["site-a"]!, "staff")).toEqual({ x: 2, y: 1 });
  for (let tick = 0; tick < 4; tick++) state = advanceSimulation(state).state;
  expect(state.sites["site-a"]!.entities.door).toMatchObject({ open: false });
});

it("has one winner when two pawns consume the same resource", () => {
  let state = simulation([
    pawn("b", 2, 1),
    pawn("a", 0, 1),
    {
      kind: "item",
      definitionId: "item",
      id: "food",
      name: "Food",
      carryable: true,
      nutrition: 10,
      location: { kind: "ground", position: { x: 1, y: 1 } },
    },
  ]);
  for (const id of ["b", "a"])
    state = enqueue(state, id, { kind: "eat", targetId: "food" });
  state = advanceSimulation(state).state;
  const entities = state.sites["site-a"]!.entities;
  expect(entities.food).toBeUndefined();
  expect((entities.a as Pawn).needs.hunger!.value).toBe(1);
  expect((entities.b as Pawn).needs.hunger!.value).toBe(11);
  expect((entities.b as Pawn).queue[0]!.blockedReason).toContain("claimed");
});

it("separates permission, autonomy, and debug policy without mutating previews", () => {
  let state = simulation([
    pawn("npc", 0, 0, {
      playerControllable: false,
      definitionId: "wanderer",
      patrol: [{ x: 3, y: 0 }],
    }),
  ]);
  const command: Command = {
    kind: "enqueue",
    siteId: "site-a",
    entityId: "npc",
    action: { kind: "move", destination: { x: 4, y: 0 } },
  };
  expect(executeCommand(state, command).code).toBe("rejected");
  expect(executeCommand(state, command, { source: "debug" }).code).toBe(
    "rejected",
  );
  const before = serialize(state);
  const context = { source: "debug" as const, debugEnabled: true };
  expect(previewCommand(state, command, context)).toMatchObject({
    code: "accepted",
  });
  expect(serialize(state)).toBe(before);
  state = executeCommand(state, command, context).state;
  state = executeCommand(
    state,
    { kind: "autonomy", siteId: "site-a", entityId: "npc", enabled: false },
    context,
  ).state;
  for (let tick = 0; tick < 6; tick++) state = advanceSimulation(state).state;
  expect(positionOf(state.sites["site-a"]!, "npc")).toEqual({ x: 4, y: 0 });
  expect(
    (state.sites["site-a"]!.entities.npc as Pawn).needs.hunger!.value,
  ).toBe(16);
  expect((state.sites["site-a"]!.entities.npc as Pawn).queue).toEqual([]);
});

it("carries an inactive pawn without replacing identity or ticking its needs twice", () => {
  let state = simulation([
    pawn("carrier", 0, 1),
    pawn("patient", 1, 1, { canAct: false }),
  ]);
  state = enqueue(state, "carrier", { kind: "take", targetId: "patient" });
  state = enqueue(state, "carrier", {
    kind: "move",
    destination: { x: 3, y: 1 },
  });
  state = enqueue(state, "carrier", { kind: "drop", targetId: "patient" });
  for (let tick = 0; tick < 5; tick++) state = advanceSimulation(state).state;
  expect(Object.keys(state.sites["site-a"]!.entities).sort()).toEqual([
    "carrier",
    "patient",
  ]);
  expect(positionOf(state.sites["site-a"]!, "patient")).toEqual({ x: 3, y: 1 });
  expect(
    (state.sites["site-a"]!.entities.patient as Pawn).needs.hunger!.value,
  ).toBe(15);
  expect(state.sites["site-a"]!.entities.patient!.location.kind).toBe("ground");
});

it("restores exact queued state through plain JSON and rejects incompatible roots", () => {
  let state = enqueue(simulation([pawn("staff", 0, 0)]), "staff", {
    kind: "move",
    destination: { x: 4, y: 0 },
  });
  state = advanceSimulation(state).state;
  const restored = deserialize(serialize(state))!;
  expect(advanceSimulation(restored)).toEqual(advanceSimulation(state));
  for (const text of ["bad", "null", "[]", "{}", '{"version":999}'])
    expect(deserialize(text)).toBeNull();
});

it.each([
  ["a", "z"],
  ["z", "a"],
])(
  "preserves carried-pawn updates for carrier %s and patient %s",
  (carrierId, patientId) => {
    let state = simulation([
      pawn(carrierId, 0, 1),
      pawn(patientId, 1, 1, { canAct: false }),
    ]);
    state = enqueue(state, carrierId, { kind: "take", targetId: patientId });
    state = enqueue(state, carrierId, {
      kind: "move",
      destination: { x: 3, y: 1 },
    });
    state = enqueue(state, carrierId, { kind: "drop", targetId: patientId });
    for (let tick = 0; tick < 5; tick++) {
      const site = state.sites["site-a"]!;
      const proposals = collectProposals(site, state.tick + 1);
      expect(resolveTick(site, [...proposals].reverse())).toEqual(
        resolveTick(site, proposals),
      );
      state = advanceSimulation(state).state;
    }
    expect(
      (state.sites["site-a"]!.entities[patientId] as Pawn).needs.hunger!.value,
    ).toBe(15);
    expect(positionOf(state.sites["site-a"]!, patientId)).toEqual({
      x: 3,
      y: 1,
    });
  },
);

it("rechecks player permission before queued execution without changing autonomy or stopping physiology", () => {
  let state = enqueue(simulation([pawn("staff", 0, 0)]), "staff", {
    kind: "move",
    destination: { x: 4, y: 0 },
  });
  const site = state.sites["site-a"]!;
  const actor = site.entities.staff as Pawn;
  state = {
    ...state,
    sites: {
      ...state.sites,
      [site.id]: {
        ...site,
        entities: {
          ...site.entities,
          staff: { ...actor, playerControllable: false },
        },
      },
    },
  };
  state = advanceSimulation(state).state;
  const blocked = state.sites[site.id]!.entities.staff as Pawn;
  expect(blocked.location).toEqual(actor.location);
  expect(blocked.autonomy).toBe(true);
  expect(blocked.needs.hunger!.value).toBe(11);
  expect(blocked.queue[0]!.blockedReason).toContain("control");
});
