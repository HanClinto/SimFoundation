import { expect, it } from "vitest";
import type { Site } from "../../src/simulation/core/site/Site";
import { floorAt, tileAt } from "../../src/simulation/core/site/TileMap";
import {
  positionOf,
  traversalAt,
} from "../../src/simulation/core/site/TileMap";
import { canSee } from "../../src/simulation/core/site/Visibility";
import { route } from "../../src/simulation/core/site/Pathfinding";
import { entities, materials } from "../../src/simulation/catalog";
import { instantiateEntity } from "../../src/simulation/core/site/EntityPlacement";
import {
  instantiateSite,
  type SiteTemplate,
} from "../../src/simulation/core/site/Site";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import {
  createSimulation,
  advanceSimulation,
} from "../../src/simulation/core/Simulation";
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import { deserialize, serialize } from "../../src/simulation/core/Snapshot";
import { chooseConcern } from "../../src/simulation/core/entity/pawn/concerns/Concerns";
import trial from "../../src/simulation/catalog/sites/tests/SightAndPassage.json";

function scene() {
  const observer = instantiateEntity(
    {
      id: "observer",
      definitionId: "soldier",
      location: { kind: "ground", position: { x: 0, y: 1 } },
    },
    entities,
  ) as Pawn;
  const target = instantiateEntity(
    {
      id: "target",
      definitionId: "hostile-guard",
      location: { kind: "ground", position: { x: 4, y: 1 } },
    },
    entities,
  ) as Pawn;
  const site: Site = {
    id: "site",
    name: "Site",
    terrain: ["#####", ".....", "#####"],
    entities: { observer, target },
  };
  return { site, observer, target };
}

it("tiles distinguish movement obstruction from sight obstruction", () => {
  const site: Site = {
    id: "site",
    name: "Site",
    terrain: [".gm#"],
    entities: {},
    tiles: {
      g: { blocksMovement: true, blocksSight: false },
      m: { blocksMovement: false, blocksSight: true },
    },
  };
  expect(floorAt(site, { x: 1, y: 0 })).toBe(false);
  expect(tileAt(site, { x: 1, y: 0 })?.blocksSight).toBe(false);
  expect(floorAt(site, { x: 2, y: 0 })).toBe(true);
  expect(tileAt(site, { x: 2, y: 0 })?.blocksSight).toBe(true);
  expect(tileAt(site, { x: 4, y: 0 })).toBeNull();
});

it("authored glass exposes a threat but blocks movement, while mist hides it without blocking movement", () => {
  const template = structuredClone(trial) as SiteTemplate;
  const created = instantiateSite(createSimulation(), template, entities);
  const site = created.state.sites[created.siteId]!;
  const id = (local: string) => `${site.id}:${local}`;
  const glass = site.entities[id("glass-observer")] as Pawn;
  const mist = site.entities[id("mist-observer")] as Pawn;
  expect(site.tiles).not.toBe(template.tiles);
  expect(canSee(site, glass, id("glass-target"))).toBe(true);
  expect(route(site, { x: 1, y: 1 }, { x: 4, y: 1 }, glass.id)).toBeNull();
  expect(
    chooseConcern({ site, pawn: glass, tick: 0, materials, events: [] }),
  ).toMatchObject({ kind: "threat" });
  expect(canSee(site, mist, id("mist-target"))).toBe(false);
  expect(
    chooseConcern({ site, pawn: mist, tick: 0, materials, events: [] }),
  ).toBeNull();
  expect(route(site, { x: 1, y: 3 }, { x: 4, y: 3 }, mist.id)).toHaveLength(3);
  const command = executeCommand(
    created.state,
    {
      kind: "enqueue",
      siteId: site.id,
      entityId: mist.id,
      action: { kind: "move", destination: { x: 4, y: 3 } },
    },
    materials,
  );
  expect(command.code).toBe("accepted");
  let state = command.state;
  let replay = deserialize(serialize(state))!;
  for (let tick = 0; tick < 3; tick++) {
    state = advanceSimulation(state, materials).state;
    replay = advanceSimulation(replay, materials).state;
    expect(replay).toEqual(state);
  }
  expect(positionOf(state.sites[site.id]!, mist.id)).toEqual({ x: 4, y: 3 });
  expect(
    canSee(
      state.sites[site.id]!,
      state.sites[site.id]!.entities[mist.id] as Pawn,
      id("mist-target"),
    ),
  ).toBe(true);
});

it.each([
  [true, false],
  [false, true],
  [true, true],
  [false, false],
])(
  "entity movement=%s and sight=%s obstruction are independent",
  (blocksMovement, blocksSight) => {
    const { site, observer, target } = scene();
    site.entities.obstacle = instantiateEntity(
      {
        id: "obstacle",
        definitionId: "packaged-meal",
        location: { kind: "ground", position: { x: 2, y: 1 } },
        overrides: { blocksMovement, blocksSight },
      },
      entities,
    );
    expect(canSee(site, observer, target.id)).toBe(!blocksSight);
    expect(
      route(site, { x: 0, y: 1 }, { x: 3, y: 1 }, observer.id) === null,
    ).toBe(blocksMovement);
    expect(traversalAt(site, { x: 2, y: 1 }, observer.id).kind).toBe(
      blocksMovement ? "blocked" : "clear",
    );
  },
);

it("sees an opaque target itself, but not through it; carried objects do not independently occlude", () => {
  const { site, observer, target } = scene();
  const obstacle = instantiateEntity(
    {
      id: "obstacle",
      definitionId: "bookshelf",
      location: { kind: "ground", position: { x: 2, y: 1 } },
    },
    entities,
  );
  site.entities.obstacle = obstacle;
  expect(canSee(site, observer, obstacle.id)).toBe(true);
  expect(canSee(site, observer, target.id)).toBe(false);
  obstacle.location = { kind: "carried", carrierId: target.id };
  expect(canSee(site, observer, target.id)).toBe(true);
  observer.blocksSight = true;
  expect(canSee(site, observer, target.id)).toBe(true);
  site.entities.mist = instantiateEntity(
    {
      id: "mist",
      definitionId: "packaged-meal",
      location: { kind: "ground", position: { x: 4, y: 1 } },
      overrides: { blocksSight: true },
    },
    entities,
  );
  expect(canSee(site, observer, target.id)).toBe(false);
});

it("closed glass doors allow sight, opaque doors require opening, and open doors do not mask other blockers", () => {
  const { site, observer, target } = scene();
  const door = instantiateEntity(
    {
      id: "door",
      definitionId: "automatic-steel-door",
      location: { kind: "ground", position: { x: 2, y: 1 } },
    },
    entities,
  );
  if (door.kind !== "door") throw new Error("Expected door");
  site.entities.door = door;
  expect(canSee(site, observer, target.id)).toBe(false);
  expect(traversalAt(site, { x: 2, y: 1 }, observer.id).kind).toBe("open-door");
  expect(
    route(site, { x: 0, y: 1 }, { x: 3, y: 1 }, observer.id),
  ).not.toBeNull();
  door.blocksSight = false;
  door.policy = "held-closed";
  expect(canSee(site, observer, target.id)).toBe(true);
  expect(route(site, { x: 0, y: 1 }, { x: 3, y: 1 }, observer.id)).toBeNull();
  door.blocksSight = true;
  door.open = true;
  expect(canSee(site, observer, target.id)).toBe(true);
  site.entities.screen = instantiateEntity(
    { id: "screen", definitionId: "bookshelf", location: door.location },
    entities,
  );
  expect(canSee(site, observer, target.id)).toBe(false);
});

it("uses sight rather than movement rules for diagonal corner checks", () => {
  const { site, observer, target } = scene();
  site.terrain = ["...", ".g.", "g.."];
  site.tiles = { g: { blocksMovement: true, blocksSight: false } };
  observer.location = { kind: "ground", position: { x: 0, y: 1 } };
  target.location = { kind: "ground", position: { x: 1, y: 2 } };
  expect(canSee(site, observer, target.id)).toBe(true);
  site.tiles = { g: { blocksMovement: false, blocksSight: true } };
  expect(canSee(site, observer, target.id)).toBe(false);
});

it("rejects undefined authored symbols and clones tile definitions between sites", () => {
  expect(() =>
    instantiateSite(
      createSimulation(),
      { name: "Bad", terrain: ["?"], entities: [] },
      entities,
    ),
  ).toThrow("defined tile symbols");
  const first = instantiateSite(
    createSimulation(),
    trial as SiteTemplate,
    entities,
  );
  const second = instantiateSite(first.state, trial as SiteTemplate, entities);
  expect(second.state.sites[first.siteId]!.tiles!.g).not.toBe(
    second.state.sites[second.siteId]!.tiles!.g,
  );
  const unknown: Site = {
    id: "unknown",
    name: "Unknown",
    terrain: ["?"],
    entities: {},
  };
  expect(floorAt(unknown, { x: 0, y: 0 })).toBe(false);
});
