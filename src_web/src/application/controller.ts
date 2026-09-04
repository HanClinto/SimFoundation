import { advanceSimulation } from "../simulation/tick";
import type { GameState } from "../simulation/state";

export interface ControllerSnapshot {
  readonly game: GameState;
  readonly running: boolean;
}

export type ControllerListener = (snapshot: ControllerSnapshot) => void;

export interface GameController {
  getSnapshot(): ControllerSnapshot;
  advance(tickCount?: number): ControllerSnapshot;
  setRunning(running: boolean): ControllerSnapshot;
  subscribe(listener: ControllerListener): () => void;
}

export function createController(initialState: GameState): GameController {
  let state = initialState;
  let running = true;
  const listeners = new Set<ControllerListener>();

  function getSnapshot(): ControllerSnapshot {
    return structuredClone({ game: state, running });
  }

  function publish(): ControllerSnapshot {
    const snapshot = getSnapshot();
    for (const listener of listeners) listener(snapshot);
    return snapshot;
  }

  return {
    getSnapshot,

    advance(tickCount = 1) {
      if (!Number.isSafeInteger(tickCount) || tickCount < 1) {
        throw new RangeError("tickCount must be a positive safe integer");
      }
      if (!running) return getSnapshot();

      for (let index = 0; index < tickCount; index += 1) {
        state = advanceSimulation(state);
      }
      return publish();
    },

    setRunning(nextRunning) {
      running = nextRunning;
      return publish();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
