import { describe, expect, it } from "vitest";
import {
  createStartingMap,
  findRoute,
  isWalkable,
  tileAt,
  type SiteMap,
} from "../src/simulation/world";
import {
  surfaceAt,
  surfaceTile,
  type MaterialId,
} from "../src/simulation/materials";
import { createInitialState } from "../src/simulation/state";
import { loadGameState } from "../src/adapters/browser/game-persistence";

describe("physical site map", () => {
  it("demonstrates all four materials on real room floors and walls without altering topology", () => {
    const state = createInitialState();
    const map = state.world.map;
    for (const layer of ["floor", "structure"] as const) {
      const counts = new Map<MaterialId, number>();
      for (const cell of Object.values(map.surfaces)) {
        const surface = cell[layer];
        if (surface)
          counts.set(surface.material, (counts.get(surface.material) ?? 0) + 1);
      }
      for (const material of [
        "concrete",
        "steel",
        "ceramic",
        "composite",
      ] as const)
        expect(counts.get(material)).toBeGreaterThanOrEqual(16);
    }
    expect(surfaceAt(map, { x: 65, y: 50 }, "floor")?.material).toBe("ceramic");
    expect(surfaceAt(map, { x: 64, y: 50 }, "structure")?.material).toBe(
      "composite",
    );
    expect(surfaceAt(map, { x: 72, y: 65 }, "floor")?.material).toBe("steel");
    expect(surfaceAt(map, { x: 56, y: 72 }, "structure")?.material).toBe(
      "ceramic",
    );
    expect(surfaceAt(map, { x: 48, y: 50 }, "structure")?.material).toBe(
      "concrete",
    );
    for (const [index, cell] of Object.entries(map.surfaces))
      expect(map.tiles[Number(index)]).toBe(surfaceTile(cell));
    for (const cell of Object.values(map.surfaces))
      if (cell.structure?.kind === "door")
        expect(cell.structure.material).toBe("steel");
    expect(state.construction.availableMaterials).toBe(160);
    expect(state.environment.orders).toEqual([]);
    expect(state.observations.knownSurfaces).toEqual(map.surfaces);
    expect(
      loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} })
        .status,
    ).toBe("loaded");
  });
  it("routes through doors without crossing walls or taking diagonal shortcuts", () => {
    const map = createStartingMap();
    const start = { x: 54, y: 55 };
    const target = { x: 69, y: 55 };
    const route = findRoute(map, start, target);
    expect(map.tiles).toHaveLength(128 * 128);
    expect(route).not.toBeNull();
    expect(route).toEqual(findRoute(map, start, target));
    expect(route).toContainEqual({ x: 61, y: 55 });
    expect(route).toContainEqual({ x: 64, y: 55 });
    let previous = start;
    for (const step of route!) {
      expect(isWalkable(map, step)).toBe(true);
      expect(
        Math.abs(step.x - previous.x) + Math.abs(step.y - previous.y),
      ).toBe(1);
      previous = step;
    }
    expect(previous).toEqual(target);
  });

  it("rejects unreachable and out-of-map destinations", () => {
    const map: SiteMap = {
      surfaces: {},
      id: "test",
      width: 3,
      height: 3,
      rooms: [],
      tiles: [
        "floor",
        "wall",
        "floor",
        "floor",
        "wall",
        "floor",
        "floor",
        "wall",
        "floor",
      ],
    };
    expect(findRoute(map, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
    expect(findRoute(map, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
    expect(findRoute(map, { x: 0, y: 0 }, { x: -1, y: 0 })).toBeNull();
    expect(findRoute(map, { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([]);
    expect(tileAt(map, { x: 0.5, y: 0 })).toBeNull();
  });

  it("connects every starting room to the facility entrance", () => {
    const map = createStartingMap();
    for (const room of map.rooms) {
      expect(
        findRoute(map, { x: 62, y: 78 }, { x: room.x + 1, y: room.y + 1 }),
        room.name,
      ).not.toBeNull();
    }
  });
});
