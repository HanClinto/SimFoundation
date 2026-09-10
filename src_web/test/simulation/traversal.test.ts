import { expect, it } from "vitest";
import type { Item } from "../../src/simulation/core/entity/Item";
import type { Site } from "../../src/simulation/core/site/Site";
import { traversalAt } from "../../src/simulation/core/site/TileMap";
import {
  positionOf,
  samePosition,
} from "../../src/simulation/core/site/TileMap";
import {
  interactionRoute,
  route,
} from "../../src/simulation/core/site/Pathfinding";
import { instantiateEntity } from "../../src/simulation/core/site/EntityPlacement";
import { entities, materials } from "../../src/simulation/catalog";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import type { Door } from "../../src/simulation/core/entity/Door";
import {
  createSimulation,
  advanceSimulation,
} from "../../src/simulation/core/Simulation";
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import { Eat } from "../../src/simulation/core/entity/pawn/actions/Eat";

function actor(): Pawn {
  return instantiateEntity(
    {
      id: "actor",
      definitionId: "field-agent",
      location: { kind: "ground", position: { x: 0, y: 1 } },
      overrides: { autonomy: false },
    },
    entities,
  ) as Pawn;
}

function scene(terrain = [".....", ".....", "....."]): Site {
  return { id: "site", name: "Site", terrain, entities: { actor: actor() } };
}

function item(id: string, blocksMovement: boolean): Item {
  return {
    id,
    definitionId: "test",
    name: id,
    kind: "item",
    materialId: "steel",
    amount: 1,
    carryable: true,
    blocksMovement,
    blocksSight: false,
    location: { kind: "ground", position: { x: 1, y: 1 } },
  };
}

it("checks all ground entities, ignoring carried entities and the moving actor", () => {
  const site: Site = {
    id: "site",
    name: "Site",
    terrain: ["...", "...", "..."],
    entities: { meal: item("meal", false), crate: item("crate", true) },
  };
  expect(traversalAt(site, { x: 1, y: 1 }).kind).toBe("blocked");
  site.entities.crate!.location = { kind: "carried", carrierId: "meal" };
  expect(traversalAt(site, { x: 1, y: 1 }).kind).toBe("clear");
  site.entities.meal!.blocksMovement = true;
  expect(traversalAt(site, { x: 1, y: 1 }, "meal").kind).toBe("clear");
  expect(traversalAt(site, { x: -1, y: 1 }).kind).toBe("blocked");
});

it("uses the same obstruction rules to plan and execute a detour around an item", () => {
  const site = scene();
  site.entities.crate = item("crate", true);
  const path = route(site, { x: 0, y: 1 }, { x: 4, y: 1 }, "actor")!;
  expect(path.length).toBeGreaterThan(4);
  expect(path.some((position) => samePosition(position, { x: 1, y: 1 }))).toBe(
    false,
  );
  let state = executeCommand(
    { ...createSimulation(), sites: { site } },
    {
      kind: "enqueue",
      siteId: "site",
      entityId: "actor",
      action: { kind: "move", destination: { x: 4, y: 1 } },
    },
    materials,
  ).state;
  for (let tick = 0; tick < path.length; tick++) {
    state = advanceSimulation(state, materials).state;
    expect(positionOf(state.sites.site!, "actor")).not.toEqual({ x: 1, y: 1 });
  }
  expect(positionOf(state.sites.site!, "actor")).toEqual({ x: 4, y: 1 });
  expect((state.sites.site!.entities.actor as Pawn).queue).toEqual([]);
});

it("rechecks current obstruction and resumes when a corridor clears", () => {
  const site = scene(["#####", ".....", "#####"]);
  let state = executeCommand(
    { ...createSimulation(), sites: { site } },
    {
      kind: "enqueue",
      siteId: "site",
      entityId: "actor",
      action: { kind: "move", destination: { x: 4, y: 1 } },
    },
    materials,
  ).state;
  state = advanceSimulation(state, materials).state;
  const crate = item("crate", true);
  crate.location = { kind: "ground", position: { x: 2, y: 1 } };
  state.sites.site!.entities.crate = crate;
  expect(
    route(state.sites.site!, { x: 1, y: 1 }, { x: 4, y: 1 }, "actor"),
  ).toBeNull();
  state = advanceSimulation(state, materials).state;
  expect(positionOf(state.sites.site!, "actor")).toEqual({ x: 1, y: 1 });
  expect(
    (state.sites.site!.entities.actor as Pawn).queue[0]!.blockedReason,
  ).toContain("No route");
  state.sites.site!.entities.crate!.location = {
    kind: "carried",
    carrierId: "actor",
  };
  state = advanceSimulation(state, materials).state;
  expect(positionOf(state.sites.site!, "actor")).toEqual({ x: 2, y: 1 });
});

it("approaches a blocking target's reachable side without trying to enter its tile", () => {
  const site = scene(["#####", ".....", "#####"]);
  const crate = item("crate", true);
  crate.location = { kind: "ground", position: { x: 4, y: 1 } };
  site.entities.crate = crate;
  expect(route(site, { x: 0, y: 1 }, { x: 4, y: 1 }, "actor")).toBeNull();
  expect(interactionRoute(site, "actor", "crate")?.at(-1)).toEqual({
    x: 3,
    y: 1,
  });
  let state = executeCommand(
    { ...createSimulation(), sites: { site } },
    {
      kind: "enqueue",
      siteId: "site",
      entityId: "actor",
      action: { kind: "take", targetId: "crate" },
    },
    materials,
  ).state;
  for (let tick = 0; tick < 5; tick++)
    state = advanceSimulation(state, materials).state;
  expect(positionOf(state.sites.site!, "actor")).toEqual({ x: 3, y: 1 });
  expect(state.sites.site!.entities.crate!.location).toEqual({
    kind: "carried",
    carrierId: "actor",
  });
  expect(state.sites.site!.entities.crate!.blocksMovement).toBe(true);
  expect(traversalAt(state.sites.site!, { x: 3, y: 1 }, "actor").kind).toBe(
    "clear",
  );
});

it("food discovery and consumption use interaction reachability, not target-tile passability", () => {
  const site = scene(["#####", ".....", "#####"]);
  const meal = item("meal", true);
  meal.materialId = "plant-food";
  meal.location = { kind: "ground", position: { x: 4, y: 1 } };
  site.entities.meal = meal;
  const pawn = site.entities.actor as Pawn;
  expect(Eat.findFood({ site, pawn, materials, tick: 0, events: [] })?.id).toBe(
    "meal",
  );
  let state = executeCommand(
    { ...createSimulation(), sites: { site } },
    {
      kind: "enqueue",
      siteId: "site",
      entityId: "actor",
      action: { kind: "eat", targetId: "meal" },
    },
    materials,
  ).state;
  for (let tick = 0; tick < 5; tick++)
    state = advanceSimulation(state, materials).state;
  expect(state.sites.site!.entities.meal).toBeUndefined();
  expect(positionOf(state.sites.site!, "actor")).toEqual({ x: 3, y: 1 });
  site.entities.barrier = {
    ...item("barrier", true),
    location: { kind: "ground", position: { x: 2, y: 1 } },
  };
  expect(
    Eat.findFood({ site, pawn, materials, tick: 0, events: [] }),
  ).toBeNull();
});

it("plans through automatic doors but never lets one mask another ground obstruction", () => {
  const site = scene(["#####", ".....", "#####"]);
  const door = instantiateEntity(
    {
      id: "door",
      definitionId: "automatic-steel-door",
      location: { kind: "ground", position: { x: 1, y: 1 } },
    },
    entities,
  ) as Door;
  site.entities.door = door;
  expect(traversalAt(site, { x: 1, y: 1 }, "actor").kind).toBe("open-door");
  expect(route(site, { x: 0, y: 1 }, { x: 4, y: 1 }, "actor")).not.toBeNull();
  site.entities.crate = item("crate", true);
  for (const ordered of [
    site.entities,
    Object.fromEntries(Object.entries(site.entities).reverse()),
  ]) {
    const reordered = { ...site, entities: ordered };
    expect(traversalAt(reordered, { x: 1, y: 1 }, "actor").kind).toBe(
      "blocked",
    );
    expect(
      route(reordered, { x: 0, y: 1 }, { x: 4, y: 1 }, "actor"),
    ).toBeNull();
  }
  delete site.entities.crate;
  door.policy = "held-closed";
  expect(route(site, { x: 0, y: 1 }, { x: 4, y: 1 }, "actor")).toBeNull();
  door.open = true;
  expect(traversalAt(site, { x: 1, y: 1 }, "actor").kind).toBe("clear");
});
