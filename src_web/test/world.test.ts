import { describe, expect, it } from "vitest";
import {
  createStartingMap,
  findRoute,
  isWalkable,
  tileAt,
  type SiteMap,
} from "../src/simulation/world";

describe("physical site map", () => {
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
