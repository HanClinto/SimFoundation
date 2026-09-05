import { describe, expect, it } from "vitest";

import {
  GAME_STATE_STORAGE_KEY,
  loadGameState,
  saveGameState,
  type StoragePort,
} from "../src/adapters/browser/game-persistence";
import { createController } from "../src/application/controller";
import {
  createInitialState,
  GAME_STATE_VERSION,
} from "../src/simulation/state";

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
  it("round-trips deterministic job and incident progress", () => {
    const storage = memoryStorage();
    const controller = createController(createInitialState(42));
    controller.authorizeJob("job-calibrate-9620-sensors");
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
      scp999: { ...state.scp999, status: "escaped" },
    };
    expect(
      loadGameState(memoryStorage(JSON.stringify(brokenAnomaly))).status,
    ).toBe("invalid");

    const brokenProtocol = {
      ...state,
      scp9620: {
        ...state.scp9620,
        observations: [{ certainty: "probably" }],
      },
    };
    expect(
      loadGameState(memoryStorage(JSON.stringify(brokenProtocol))).status,
    ).toBe("invalid");
  });

  it("continues deterministically after load and another save cycle", () => {
    const storage = memoryStorage();
    let controller = createController(createInitialState(42));

    for (const [jobId, ticks] of [
      ["job-calibrate-9620-sensors", 8],
      ["job-record-9620-baseline", 6],
      ["job-run-9620-activation-trial", 5],
      ["job-stabilize-9620-feedback", 8],
    ] as const) {
      controller.authorizeJob(jobId);
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
    expect(resolved.scp9620.phase).toBe("stabilized");
  });

  it("replaces controller state with a detached loaded snapshot", () => {
    const controller = createController(createInitialState());
    const saved = createInitialState(77);
    const loaded = controller.replaceState(saved);

    expect(loaded.game.seed).toBe(77);
    expect(loaded.game).not.toBe(saved);
  });
});
