import { expect, it } from "vitest";
import { deriveSpaces, spaceBoundary } from "../src/simulation/spaces";
import type { TileKind } from "../src/simulation/world";
import { createInitialState } from "../src/simulation/state";
import { advanceExposure, exposureTiles } from "../src/simulation/environment";
import { engineeringRecord } from "../src/adapters/browser/map-objects";
import { surfacesForTile } from "../src/simulation/materials";
import { spaceProjection } from "../src/adapters/browser/space-projection";

it("reuses immutable render topology without caching across dimensions or changed tiles", () => {
  const tiles = enclosure();
  const first = spaceProjection(5, 5, tiles);
  expect(spaceProjection(5, 5, tiles)).toBe(first);
  expect(spaceProjection(25, 1, tiles)).not.toBe(first);
  const opened = [...tiles];
  opened[7] = "door";
  expect(spaceProjection(5, 5, opened).spaceByTile[12]).toBe(0);
  expect(first.spaceByTile[12]).not.toBe(0);
});

function enclosure(): TileKind[] {
  return [
    "grass",
    "grass",
    "grass",
    "grass",
    "grass",
    "grass",
    "wall",
    "closed-door",
    "wall",
    "grass",
    "grass",
    "wall",
    "floor",
    "wall",
    "grass",
    "grass",
    "wall",
    "wall",
    "wall",
    "grass",
    "grass",
    "grass",
    "grass",
    "grass",
    "grass",
  ];
}

it("derives enclosure from physical boundaries and merges it with outside when a door opens", () => {
  const tiles = enclosure();
  const closed = deriveSpaces(5, 5, tiles);
  const inside = closed.spaces[closed.spaceByTile[12]!]!;
  expect(spaceBoundary(inside)).toBe("Enclosed");
  expect(inside.tiles).toEqual([12]);
  expect(closed.spaceByTile[7]).toBeNull();
  tiles[7] = "door";
  const opened = deriveSpaces(5, 5, tiles);
  expect(opened.spaceByTile[12]).toBe(opened.spaceByTile[0]);
  expect(spaceBoundary(opened.spaces[opened.spaceByTile[12]!]!)).toBe(
    "Open to map edge",
  );
  expect(opened.spaces[0]!.floorTiles).toBe(2);
  tiles[7] = "floor";
  expect(deriveSpaces(5, 5, tiles).spaceByTile).toEqual(opened.spaceByTile);
});

it("does not infer enclosure across unknown recorded terrain or connect diagonally", () => {
  const tiles: (TileKind | null)[] = enclosure();
  tiles[7] = null;
  const uncertain = deriveSpaces(5, 5, tiles);
  expect(spaceBoundary(uncertain.spaces[uncertain.spaceByTile[12]!]!)).toBe(
    "Boundary unknown",
  );
  tiles[7] = "closed-door";
  tiles[6] = "grass";
  const diagonal = deriveSpaces(5, 5, tiles);
  expect(spaceBoundary(diagonal.spaces[diagonal.spaceByTile[12]!]!)).toBe(
    "Enclosed",
  );
  expect(deriveSpaces(5, 5, Array(25).fill(null)).spaces).toEqual([]);
});

it("does not let furniture movement blockers shield floors from environmental exposure", () => {
  const initial = createInitialState();
  const tiles: TileKind[] = ["floor", "floor", "floor", "closed-door", "floor"];
  const source = {
    id: "source",
    name: "Test",
    position: { x: 0, y: 0 },
    radius: 4,
    kind: "corrosion" as const,
    dose: 10,
  };
  const state = {
    ...initial,
    world: {
      ...initial.world,
      map: {
        ...initial.world.map,
        width: 5,
        height: 1,
        tiles,
        surfaces: Object.fromEntries(
          tiles.map((tile, index) => [index, surfacesForTile(tile)]),
        ),
        objectBlocks: [1],
      },
    },
    environment: { ...initial.environment, sources: [source] },
  };
  expect(exposureTiles(state, source)).toEqual([
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ]);
  const damaged = advanceExposure(state);
  expect(damaged.world.map.surfaces[1]!.floor!.integrity).toBeLessThan(100);
  expect(damaged.world.map.surfaces[2]!.floor!.integrity).toBeLessThan(100);
  expect(damaged.world.map.surfaces[4]!.floor!.integrity).toBe(100);
});

it("keeps recorded space boundaries independent of hidden physical openings", () => {
  const initial = createInitialState();
  const tiles = enclosure();
  const knownTiles = [...tiles];
  tiles[7] = "door";
  const state = {
    ...initial,
    world: {
      ...initial.world,
      map: { ...initial.world.map, width: 5, height: 5, tiles },
    },
    observations: { ...initial.observations, knownTiles },
  };
  expect(
    engineeringRecord(state, { x: 2, y: 2 }, "floor", "world"),
  ).toContainEqual([
    "Physical space",
    "Open to map edge / 18 connected tiles / 2 floored",
  ]);
  expect(
    engineeringRecord(state, { x: 2, y: 2 }, "floor", "recorded"),
  ).toContainEqual([
    "Recorded space",
    "Enclosed / 1 connected tiles / 1 floored",
  ]);
});
