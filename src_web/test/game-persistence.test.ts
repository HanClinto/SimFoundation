import { describe, expect, it } from "vitest";

import {
  GAME_STATE_STORAGE_KEY,
  loadGameState,
  saveGameState,
  type StoragePort,
} from "../src/adapters/browser/game-persistence";
import { createController } from "../src/application/controller";
import { createInitialState, GAME_STATE_VERSION } from "./fixtures/work-state";
import { createScp999State } from "../src/simulation_legacy/scp-999";

it("round-trips multiple resident instances", () => {
  const initial = createInitialState();
  const extra = createScp999State("resident-extra");
  const state = {
    ...initial,
    entities: [...initial.entities, extra],
    world: {
      ...initial.world,
      positions: { ...initial.world.positions, [extra.id]: { x: 54, y: 58 } },
    },
  };
  const storage = memoryStorage();
  expect(saveGameState(storage, state)).toBe(true);
  const loaded = loadGameState(storage);
  expect(loaded.status).toBe("loaded");
  if (loaded.status !== "loaded")
    throw new Error("Resident collection rejected");
  expect(loaded.state.entities).toEqual(state.entities);
  expect(loaded.state).not.toHaveProperty("scp999");
  expect(createController(loaded.state).advance(6)).toEqual(
    createController(state).advance(6),
  );
});

function memoryStorage(initialValue: string | null = null): StoragePort {
  let value = initialValue;
  return {
    getItem(key) {
      return key === GAME_STATE_STORAGE_KEY ? value : null;
    },
    setItem(key, nextValue) {
      if (key === GAME_STATE_STORAGE_KEY) value = nextValue;
    },
  };
}

describe("game persistence", () => {
  it.each(["null", "[]", "true", "42", '"text"'])(
    "rejects non-object roots: %s",
    (value) => {
      expect(loadGameState(memoryStorage(value))).toEqual({
        status: "invalid",
        state: null,
      });
    },
  );

  it("loads current-version contents without validating gameplay", () => {
    const value = {
      version: GAME_STATE_VERSION,
      customScenario: { anything: [1, 2, 3] },
    };
    expect(loadGameState(memoryStorage(JSON.stringify(value)))).toEqual({
      status: "loaded",
      state: value,
    });
    expect(loadGameState(memoryStorage("{}"))).toEqual({
      status: "incompatible",
      state: null,
    });
  });

  it("continues a worker's journey identically after save and reload", () => {
    const original = createController(createInitialState());
    original.authorizeJob("job-test-survey");
    const storage = memoryStorage();
    saveGameState(storage, original.advance().game);
    const loaded = loadGameState(storage);
    if (loaded.status !== "loaded") throw new Error("save did not load");
    const resumed = createController(loaded.state);
    expect(loaded.state.entities).toEqual(original.getSnapshot().game.entities);
    expect(resumed.advance(20).game).toEqual(original.advance(20).game);
  });

  it("round-trips deterministic job and incident progress", () => {
    const storage = memoryStorage();
    const controller = createController(createInitialState(42));
    controller.authorizeJob("job-test-survey");
    const saved = controller.advance(8).game;
    saveGameState(storage, saved);

    expect(loadGameState(storage)).toEqual({ status: "loaded", state: saved });
  });

  it("distinguishes empty, malformed, and incompatible saves", () => {
    expect(loadGameState(memoryStorage())).toEqual({
      status: "empty",
      state: null,
    });
    expect(loadGameState(memoryStorage("not json"))).toEqual({
      status: "invalid",
      state: null,
    });
    expect(
      loadGameState(
        memoryStorage(JSON.stringify({ version: GAME_STATE_VERSION + 1 })),
      ),
    ).toEqual({ status: "incompatible", state: null });
    const oldSave = {
      ...createInitialState(),
      version: GAME_STATE_VERSION - 1,
      construction: {
        availableMaterials: 120,
        stockpile: { x: 67, y: 68 },
        nextBlueprintNumber: 2,
        blueprints: [{ id: "retired-annex" }],
      },
    };
    expect(loadGameState(memoryStorage(JSON.stringify(oldSave)))).toEqual({
      status: "incompatible",
      state: null,
    });
  });

  it("fails safely when browser storage is unavailable", () => {
    const unavailable: StoragePort = {
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("denied");
      },
    };

    expect(loadGameState(unavailable)).toEqual({
      status: "unavailable",
      state: null,
    });
    expect(saveGameState(unavailable, createInitialState())).toBe(false);
  });

  it("leaves the previous save intact when serialization fails", () => {
    const storage = memoryStorage();
    const state = createInitialState();
    expect(saveGameState(storage, state)).toBe(true);
    const circular = { ...state, extra: {} as { self?: unknown } };
    circular.extra.self = circular;
    expect(saveGameState(storage, circular)).toBe(false);
    expect(loadGameState(storage)).toEqual({ status: "loaded", state });
  });

  it("continues deterministically after load and another save cycle", () => {
    const storage = memoryStorage();
    let controller = createController(createInitialState(42));

    controller.authorizeJob("job-test-survey");
    for (const ticks of [3, 3, 3, 3]) {
      saveGameState(storage, controller.advance(ticks).game);
      const loaded = loadGameState(storage);
      if (loaded.status !== "loaded") throw new Error("save did not load");
      controller = createController(loaded.state);
    }

    const resolved = controller.getSnapshot().game;
    saveGameState(storage, resolved);

    const reloaded = loadGameState(storage);
    expect(reloaded).toEqual({ status: "loaded", state: resolved });
    expect(resolved.incident.level).toBe("green");
    expect(resolved.jobs[0]?.status).toBe("completed");
  });

  it("replaces controller state with a detached loaded snapshot", () => {
    const controller = createController(createInitialState());
    const saved = createInitialState(77);
    const loaded = controller.replaceState(saved);

    expect(loaded.game.seed).toBe(77);
    expect(loaded.game).not.toBe(saved);
  });
});
