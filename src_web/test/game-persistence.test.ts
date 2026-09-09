import { describe, expect, it } from "vitest";

import {
  GAME_STATE_STORAGE_KEY,
  loadGameState,
  saveGameState,
  type StoragePort,
} from "../src/adapters/browser/game-persistence";
import { createController } from "../src/application/controller";
import { createInitialState, GAME_STATE_VERSION } from "./fixtures/work-state";
import { createScp999State } from "../src/simulation/scp-999";

it("round-trips multiple resident instances and rejects duplicate live identities", () => {
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
  saveGameState(storage, { ...state, entities: [...state.entities, extra] });
  expect(loadGameState(storage).status).toBe("invalid");
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
  it("rejects malformed maps and missing, duplicate, or obstructed occupants", () => {
    const state = createInitialState();
    const positions = { ...state.world.positions };
    delete positions["person-mara-voss"];
    const brokenWorlds = [
      { ...state.world, map: { ...state.world.map, tiles: [] } },
      { ...state.world, map: { ...state.world.map, width: 10000 } },
      { ...state.world, map: { ...state.world.map, rooms: [{ id: "bad" }] } },
      { ...state.world, positions },
      {
        ...state.world,
        positions: { ...state.world.positions, stranger: { x: 62, y: 62 } },
      },
      {
        ...state.world,
        positions: {
          ...state.world.positions,
          "person-mara-voss": { x: 48, y: 48 },
        },
      },
      {
        ...state.world,
        positions: {
          ...state.world.positions,
          "person-mara-voss": { x: 128, y: 50 },
        },
      },
    ];
    for (const world of brokenWorlds)
      expect(
        loadGameState(memoryStorage(JSON.stringify({ ...state, world })))
          .status,
      ).toBe("invalid");
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

  it("rejects corrupted nested jobs, personnel, Effects, and anomalies", () => {
    const state = createInitialState();
    const brokenJob = {
      ...state,
      jobs: [{ id: "incomplete-job" }],
    };
    expect(loadGameState(memoryStorage(JSON.stringify(brokenJob))).status).toBe(
      "invalid",
    );

    const firstPerson = state.personnel[0];
    if (!firstPerson) throw new Error("starting person missing");
    const brokenPersonnel = {
      ...state,
      personnel: [{ ...firstPerson, skills: null }],
    };
    expect(
      loadGameState(memoryStorage(JSON.stringify(brokenPersonnel))).status,
    ).toBe("invalid");

    const brokenEffect = {
      ...state,
      personnel: [
        {
          ...firstPerson,
          effects: [
            {
              id: "bad-effect",
              name: "Bad effect",
              kind: "memory",
              severity: "minor",
              bodyRegions: [],
              physicalHealthPenalty: 0,
              stressRecoveryPerTick: 1,
              expiresAtTick: "later",
            },
          ],
        },
      ],
    };
    expect(
      loadGameState(memoryStorage(JSON.stringify(brokenEffect))).status,
    ).toBe("invalid");

    const brokenAnomaly = {
      ...state,
      entities: [{ ...state.entities[0]!, status: "escaped" }],
    };
    expect(
      loadGameState(memoryStorage(JSON.stringify(brokenAnomaly))).status,
    ).toBe("invalid");

    const brokenPsychology = {
      ...state,
      personnel: [
        {
          ...firstPerson,
          psychologicalAssessments: [{ moodEstimate: "certain" }],
        },
      ],
    };
    expect(
      loadGameState(memoryStorage(JSON.stringify(brokenPsychology))).status,
    ).toBe("invalid");
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
