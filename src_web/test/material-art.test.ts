import { afterEach, expect, it, vi } from "vitest";
import { renderSite } from "../src/adapters/browser/renderer";
import {
  MATERIAL_ART,
  visibleSurface,
} from "../src/adapters/browser/material-art";
import { createInitialState } from "../src/simulation/state";
import { replaceSurface, type MaterialId } from "../src/simulation/materials";
import { DEFAULT_MAP_OVERLAYS } from "../src/adapters/browser/map-settings";

afterEach(() => vi.unstubAllGlobals());

it("draws distinct installed materials in Site view and retains recorded appearance until observed", () => {
  vi.stubGlobal("window", { devicePixelRatio: 1 });
  vi.stubGlobal(
    "Image",
    class {
      complete = false;
      src = "";
    },
  );
  const commands: unknown[][] = [];
  const context = new Proxy(
    {},
    {
      get:
        (_, property) =>
        (...args: unknown[]) =>
          commands.push([property, ...args]),
      set: (_, property, value) => {
        commands.push([property, value]);
        return true;
      },
    },
  ) as CanvasRenderingContext2D;
  const canvas = {
    clientWidth: 160,
    clientHeight: 120,
    width: 160,
    height: 120,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
  const initial = createInitialState();
  const position = { x: 48, y: 50 };
  const draw = (
    material: MaterialId,
    perspective: "world" | "recorded",
    zoom = 1,
  ) => {
    commands.length = 0;
    const map = replaceSurface(initial.world.map, position, "structure", {
      kind: "wall",
      material,
      integrity: 100,
    });
    renderSite(
      canvas,
      {
        game: { ...initial, world: { ...initial.world, map } },
        running: false,
      },
      {
        center: position,
        zoom,
        selectedId: null,
        base: "site",
        perspective,
        overlays: { ...DEFAULT_MAP_OVERLAYS, rooms: false, objects: false },
      },
    );
    return structuredClone(commands);
  };
  const concrete = draw("concrete", "world");
  for (const material of ["steel", "ceramic", "composite"] as const) {
    const rendered = draw(material, "world");
    expect(rendered).not.toEqual(concrete);
    expect(rendered).toContainEqual(["fillStyle", MATERIAL_ART[material].top]);
    expect(rendered).toContainEqual(["fillStyle", MATERIAL_ART[material].side]);
  }
  expect(draw("steel", "recorded")).toEqual(draw("concrete", "recorded"));
  expect(draw("steel", "world", 0.4)).toContainEqual([
    "fillStyle",
    MATERIAL_ART.steel.top,
  ]);
});

it("shows the floor's material below failed structures instead of painting soil or floor with the old wall", () => {
  const cell = {
    floor: {
      kind: "floor" as const,
      material: "ceramic" as const,
      integrity: 100,
    },
    structure: {
      kind: "wall" as const,
      material: "steel" as const,
      integrity: 0,
    },
  };
  expect(visibleSurface(cell, "floor")?.material).toBe("ceramic");
  expect(visibleSurface(cell, "grass")).toBeNull();
  expect(visibleSurface(cell, "wall")).toBeNull();
});

it("uses flat material details for floors and keeps raised sides exclusive to structures", () => {
  vi.stubGlobal("window", { devicePixelRatio: 1 });
  vi.stubGlobal(
    "Image",
    class {
      complete = false;
      src = "";
    },
  );
  const commands: unknown[][] = [];
  const context = new Proxy(
    {},
    {
      get:
        (_, property) =>
        (...args: unknown[]) =>
          commands.push([property, ...args]),
      set: (_, property, value) => {
        commands.push([property, value]);
        return true;
      },
    },
  ) as CanvasRenderingContext2D;
  const canvas = {
    clientWidth: 160,
    clientHeight: 120,
    width: 160,
    height: 120,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
  const state = createInitialState();
  const position = { x: 54, y: 55 };
  const map = replaceSurface(state.world.map, position, "floor", {
    kind: "floor",
    material: "steel",
    integrity: 100,
  });
  renderSite(
    canvas,
    { game: { ...state, world: { ...state.world, map } }, running: false },
    {
      center: position,
      zoom: 1,
      selectedId: null,
      base: "site",
      surfaceLayer: "floor",
      perspective: "world",
      overlays: { ...DEFAULT_MAP_OVERLAYS, rooms: false, objects: false },
    },
  );
  expect(commands).toContainEqual(["fillStyle", MATERIAL_ART.steel.top]);
  expect(commands).not.toContainEqual(["fillStyle", MATERIAL_ART.steel.side]);
});
