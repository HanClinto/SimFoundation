import { expect, it } from "vitest";
import {
  createSimulation,
  type Simulation,
  advanceSimulation as advance,
} from "../../src/simulation/core/Simulation";
import type { Entity } from "../../src/simulation/core/entity/Entity";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import type { Site } from "../../src/simulation/core/site/Site";
import {
  executeCommand as execute,
  previewCommand as preview,
  type Command,
  type CommandContext,
} from "../../src/simulation/core/ControlPolicy";
import { deserialize, serialize } from "../../src/simulation/core/Snapshot";
import { positionOf } from "../../src/simulation/core/site/TileMap";
import { materials } from "../../src/simulation/catalog";

const advanceSimulation = (state: Simulation) => advance(state, materials);
const executeCommand = (
  state: Simulation,
  command: Command,
  context?: CommandContext,
) => execute(state, command, materials, context);
const previewCommand = (
  state: Simulation,
  command: Command,
  context?: CommandContext,
) => preview(state, command, materials, context);

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
    materialId: "animal-tissue",
    amount: 1,
    diet: [{ accepts: "edible-plant", nourishment: 10 }],
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

it("resolves contested movement by stable ID independent of insertion order", () => {
  let state = simulation([pawn("b", 2, 1), pawn("a", 0, 1)]);
  for (const id of ["b", "a"])
    state = enqueue(state, id, { kind: "move", destination: { x: 1, y: 1 } });
  const site = state.sites["site-a"]!;
  freeze(site);
  const result = advanceSimulation(state);
  const reversed = {
    ...site,
    entities: Object.fromEntries(Object.entries(site.entities).reverse()),
  };
  expect(
    advanceSimulation({ ...state, sites: { [site.id]: reversed } }),
  ).toEqual(result);
  const updated = result.state.sites[site.id]!;
  expect(positionOf(updated, "a")).toEqual({ x: 1, y: 1 });
  expect(positionOf(updated, "b")).toEqual({ x: 2, y: 1 });
  expect((updated.entities.b as Pawn).queue[0]!.blockedReason).toContain(
    "occupied",
  );
});

it("opens doors on one tick and moves on the next; unused automatic doors close through their behavior", () => {
  const door: Entity = {
    kind: "door",
    id: "door",
    name: "Door",
    definitionId: "automatic-door",
    materialId: "steel",
    amount: 1,
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
      materialId: "plant-food",
      amount: 1,
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
  expect((entities.b as Pawn).queue[0]!.blockedReason).toContain(
    "no longer present",
  );
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
  for (const text of [
    "bad",
    "null",
    "[]",
    "{}",
    '{"version":1}',
    '{"version":999}',
  ])
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

it("lets a later mover enter a tile vacated earlier in the same tick", () => {
  let state = simulation([pawn("b", 0, 1), pawn("a", 1, 1)]);
  state = enqueue(state, "a", { kind: "move", destination: { x: 2, y: 1 } });
  state = enqueue(state, "b", { kind: "move", destination: { x: 1, y: 1 } });
  const before = serialize(state);
  freeze(state);
  const result = advanceSimulation(state);
  expect(positionOf(result.state.sites["site-a"]!, "a")).toEqual({
    x: 2,
    y: 1,
  });
  expect(positionOf(result.state.sites["site-a"]!, "b")).toEqual({
    x: 1,
    y: 1,
  });
  expect(serialize(state)).toBe(before);
});

it("makes an earlier door opening visible to later movers immediately", () => {
  let state = simulation(
    [
      pawn("a", 0, 1),
      pawn("b", 1, 0),
      {
        id: "door",
        kind: "door",
        definitionId: "test-door",
        name: "Door",
        materialId: "steel",
        amount: 1,
        carryable: false,
        open: false,
        policy: "automatic",
        location: { kind: "ground", position: { x: 1, y: 1 } },
      },
    ],
    ["#.#", "...", "#.#"],
  );
  state = enqueue(state, "a", { kind: "move", destination: { x: 2, y: 1 } });
  state = enqueue(state, "b", { kind: "move", destination: { x: 1, y: 2 } });
  const result = advanceSimulation(state);
  expect(positionOf(result.state.sites["site-a"]!, "a")).toEqual({
    x: 0,
    y: 1,
  });
  expect(positionOf(result.state.sites["site-a"]!, "b")).toEqual({
    x: 1,
    y: 1,
  });
  expect(result.events.filter((event) => event.kind === "opened")).toHaveLength(
    1,
  );
});

it.each(["metal", "plastic"])(
  "consumes %s through the same action with partial amounts and exact replay",
  (tag) => {
    let state = simulation([
      pawn("consumer", 0, 1, {
        autonomy: false,
        needs: { hunger: { value: 80, increasePerTick: 0 } },
        diet: [{ accepts: tag, nourishment: 20 }],
      }),
      {
        id: "stock",
        name: "Stock",
        definitionId: "test-stock",
        kind: "item",
        carryable: true,
        materialId: tag === "metal" ? "steel" : "plastic",
        amount: 1.5,
        location: { kind: "ground", position: { x: 1, y: 1 } },
      },
    ]);
    state = enqueue(state, "consumer", { kind: "eat", targetId: "stock" });
    state = enqueue(state, "consumer", { kind: "eat", targetId: "stock" });
    state = advanceSimulation(state).state;
    expect(state.sites["site-a"]!.entities.stock!.amount).toBe(0.5);
    expect(
      (state.sites["site-a"]!.entities.consumer as Pawn).needs.hunger!.value,
    ).toBe(60);
    const restored = deserialize(serialize(state))!;
    const result = advanceSimulation(state);
    expect(advanceSimulation(restored)).toEqual(result);
    expect(result.state.sites["site-a"]!.entities.stock).toBeUndefined();
    expect(
      (result.state.sites["site-a"]!.entities.consumer as Pawn).needs.hunger!
        .value,
    ).toBe(50);
  },
);

it("autonomy selects reachable acceptable material but an explicit eat order never retargets", () => {
  const food = (
    id: string,
    x: number,
    y: number,
    materialId = "plant-food",
  ): Entity => ({
    id,
    kind: "item",
    definitionId: "test-food",
    name: id,
    materialId,
    amount: 1,
    carryable: true,
    location: { kind: "ground", position: { x, y } },
  });
  let state = simulation(
    [
      pawn("consumer", 0, 0, {
        needs: { hunger: { value: 80, increasePerTick: 0 } },
      }),
      food("wood", 0, 0, "wood"),
      food("inaccessible", 0, 2),
      food("meal", 4, 0),
    ],
    [".....", "#####", "....."],
  );
  state = advanceSimulation(state).state;
  expect(
    (state.sites["site-a"]!.entities.consumer as Pawn).queue[0]!.action,
  ).toEqual({ kind: "eat", targetId: "meal" });
  for (let tick = 0; tick < 5; tick++) state = advanceSimulation(state).state;
  expect(state.sites["site-a"]!.entities.meal).toBeUndefined();
  expect(state.sites["site-a"]!.entities.wood).toBeDefined();
  expect(state.sites["site-a"]!.entities.inaccessible).toBeDefined();

  let explicit = simulation([
    pawn("consumer", 0, 0),
    food("chosen", 4, 0),
    food("other", 0, 1),
  ]);
  explicit = enqueue(explicit, "consumer", { kind: "eat", targetId: "chosen" });
  delete explicit.sites["site-a"]!.entities.chosen;
  explicit = advanceSimulation(explicit).state;
  expect(explicit.sites["site-a"]!.entities.other).toBeDefined();
  expect(
    (explicit.sites["site-a"]!.entities.consumer as Pawn).queue[0],
  ).toMatchObject({
    action: { kind: "eat", targetId: "chosen" },
    blockedReason: "The target is no longer present.",
  });
});

it("cancels an intention without dropping cargo or changing autonomous policy", () => {
  let state = simulation([
    pawn("carrier", 0, 1, { autonomy: false }),
    pawn("patient", 1, 1, { canAct: false }),
  ]);
  state = enqueue(state, "carrier", { kind: "take", targetId: "patient" });
  state = enqueue(state, "carrier", {
    kind: "move",
    destination: { x: 4, y: 1 },
  });
  state = advanceSimulation(state).state;
  const actionId = (state.sites["site-a"]!.entities.carrier as Pawn).queue[0]!
    .id;
  const command: Command = {
    kind: "cancel",
    siteId: "site-a",
    entityId: "carrier",
    actionId,
  };
  expect(previewCommand(state, command).code).toBe("accepted");
  state = executeCommand(state, command).state;
  expect(state.sites["site-a"]!.entities.patient!.location).toEqual({
    kind: "carried",
    carrierId: "carrier",
  });
  expect(state.sites["site-a"]!.entities.carrier).toMatchObject({
    autonomy: false,
    queue: [],
  });
});
