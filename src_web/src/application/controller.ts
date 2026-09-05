import { advanceSimulation } from "../simulation/tick";
import {
  analyzeAnomalousTraitEvidence,
  assessAnomalousTraits,
  assessPhysicalHealth,
  assessWorkPreferences,
} from "../simulation/personnel";
import type { GameState } from "../simulation/state";

export interface ControllerSnapshot {
  readonly game: GameState;
  readonly running: boolean;
}

export type ControllerListener = (snapshot: ControllerSnapshot) => void;

export interface GameController {
  getSnapshot(): ControllerSnapshot;
  advance(tickCount?: number): ControllerSnapshot;
  unlockAnomalousPsychometrics(): ControllerSnapshot;
  orderAnomalousAssessment(personId: string): ControllerSnapshot;
  orderWorkPreferenceAssessment(personId: string): ControllerSnapshot;
  orderPhysicalAssessment(personId: string): ControllerSnapshot;
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

    orderPhysicalAssessment(personId) {
      if (!state.personnel.some(({ id }) => id === personId)) {
        throw new Error(`Unknown person: ${personId}`);
      }
      state = {
        ...state,
        personnel: state.personnel.map((person) =>
          person.id === personId
            ? assessPhysicalHealth(person, state.tick)
            : person,
        ),
      };
      return publish();
    },

    unlockAnomalousPsychometrics() {
      if (state.capabilities.anomalousPsychometrics) return getSnapshot();
      state = {
        ...state,
        capabilities: {
          ...state.capabilities,
          anomalousPsychometrics: true,
        },
        personnel: state.personnel.map((person) =>
          analyzeAnomalousTraitEvidence(person, state.tick),
        ),
      };
      return publish();
    },

    orderAnomalousAssessment(personId) {
      if (!state.capabilities.anomalousPsychometrics) {
        throw new Error("Anomalous Psychometrics has not been unlocked");
      }
      if (!state.personnel.some(({ id }) => id === personId)) {
        throw new Error(`Unknown person: ${personId}`);
      }
      state = {
        ...state,
        personnel: state.personnel.map((person) =>
          person.id === personId
            ? assessAnomalousTraits(person, state.tick)
            : person,
        ),
      };
      return publish();
    },

    orderWorkPreferenceAssessment(personId) {
      if (!state.personnel.some(({ id }) => id === personId)) {
        throw new Error(`Unknown person: ${personId}`);
      }
      state = {
        ...state,
        personnel: state.personnel.map((person) =>
          person.id === personId
            ? assessWorkPreferences(person, state.tick)
            : person,
        ),
      };
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
