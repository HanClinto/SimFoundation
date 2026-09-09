import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation_legacy/state";
import {
  draftResponder,
  startEncounter,
  observeCombat,
} from "../src/simulation_legacy/combat";
import { tacticalRange } from "../src/adapters/browser/combat-art";
import { observedSnapshot } from "../src/adapters/browser/observed-view";
import { mapObjects } from "../src/adapters/browser/map-objects";
import { setSurface } from "../src/simulation_legacy/materials";

it("limits response range to drafted staff and distinguishes visible from obstructed tiles", () => {
  const initial = createInitialState();
  const id = initial.personnel[0]!.id;
  expect(tacticalRange(initial, id)).toEqual([]);
  const drafted = draftResponder(initial, id, true).state;
  const origin = drafted.world.positions[id]!;
  const state = {
    ...drafted,
    world: {
      ...drafted.world,
      map: setSurface(
        drafted.world.map,
        { x: origin.x + 1, y: origin.y },
        "structure",
        { kind: "wall", material: "steel", integrity: 100 },
      ),
    },
  };
  const tiles = tacticalRange(state, id);
  expect(tiles.some((tile) => tile.clear)).toBe(true);
  expect(tiles.some((tile) => !tile.clear)).toBe(true);
  for (const tile of tiles)
    expect(
      Math.hypot(
        tile.position.x - state.world.positions[id]!.x,
        tile.position.y - state.world.positions[id]!.y,
      ),
    ).toBeLessThanOrEqual(5);
});

it("projects only last-observed adversary state and no hidden tactical responder details", () => {
  let state = createInitialState();
  state = draftResponder(
    draftResponder(state, state.personnel[0]!.id, true).state,
    state.personnel[1]!.id,
    true,
  ).state;
  state = startEncounter(state, { x: 72, y: 55 }).state;
  expect(
    mapObjects(state, "recorded").some((item) => item.id === "SCP-049-2"),
  ).toBe(false);
  state = observeCombat({
    ...state,
    observations: { ...state.observations, visibleTiles: [55 * 128 + 72] },
  });
  const hidden = {
    ...state,
    tick: 2,
    observations: { ...state.observations, visibleTiles: [] },
    combat: {
      ...state.combat,
      adversary: {
        ...state.combat.adversary!,
        position: { x: 73, y: 55 },
        health: 0,
      },
    },
  };
  const projection = observedSnapshot({ game: hidden, running: false }).game;
  expect(projection.combat.responders).toEqual({});
  expect(projection.combat.events).toEqual([]);
  expect(projection.combat.adversary).toMatchObject({
    position: { x: 72, y: 55 },
    health: 120,
  });
  expect(
    mapObjects(projection, "recorded").find((item) => item.id === "SCP-049-2")!
      .position,
  ).toEqual({ x: 72, y: 55 });
});
