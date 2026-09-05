import { describe, expect, it } from "vitest";
import { createStartingMap, isWalkable, tileAt } from "../src/simulation/world";
import {
  damageSurface,
  replaceSurface,
  surfaceAt,
} from "../src/simulation/materials";
import { createInitialState } from "../src/simulation/state";
import { observeSite } from "../src/simulation/observations";
import { observedSnapshot } from "../src/adapters/browser/observed-view";

describe("map materials", () => {
  it("does not expose unseen material damage through browser projections", () => {
    const initial = createInitialState();
    const position = { x: 56, y: 55 };
    const map = damageSurface(
      initial.world.map,
      position,
      "floor",
      "corrosion",
      30,
    );
    const hidden = { ...initial, world: { ...initial.world, map } };
    expect(
      surfaceAt(
        observedSnapshot({ game: hidden, running: false }).game.world.map,
        position,
        "floor",
      )?.integrity,
    ).toBe(100);
    const observed = observeSite(hidden);
    expect(
      surfaceAt(
        observedSnapshot({ game: observed, running: false }).game.world.map,
        position,
        "floor",
      )?.integrity,
    ).toBe(73);
  });
  it("models every installed surface and removes only the failed layer", () => {
    let map = createStartingMap();
    expect(Object.keys(map.surfaces).length).toBe(
      map.tiles.filter((tile) => tile !== "grass").length,
    );
    const position = { x: 48, y: 50 };
    map = damageSurface(map, position, "structure", "corrosion", 200);
    expect(tileAt(map, position)).toBe("floor");
    expect(isWalkable(map, position)).toBe(true);
    expect(surfaceAt(map, position, "floor")?.integrity).toBe(100);
    map = damageSurface(map, position, "floor", "impact", 1000);
    expect(tileAt(map, position)).toBe("grass");
    const wall = surfaceAt(map, position, "structure")!;
    map = replaceSurface(map, position, "structure", {
      ...wall,
      material: "steel",
      integrity: 100,
    });
    expect(tileAt(map, position)).toBe("wall");
    expect(surfaceAt(map, position, "floor")?.integrity).toBe(0);
  });
  it("uses shared material resistance and rejects invalid damage coordinates", () => {
    const map = createStartingMap();
    const position = { x: 50, y: 50 };
    const ceramic = replaceSurface(map, position, "floor", {
      kind: "floor",
      material: "ceramic",
      integrity: 100,
    });
    expect(
      surfaceAt(
        damageSurface(ceramic, position, "floor", "corrosion", 10),
        position,
        "floor",
      )?.integrity,
    ).toBe(99);
    expect(
      surfaceAt(
        damageSurface(map, position, "floor", "corrosion", 10),
        position,
        "floor",
      )?.integrity,
    ).toBe(91);
    expect(damageSurface(map, { x: -1, y: 0 }, "floor", "impact", 10)).toBe(
      map,
    );
  });
});
