import { advanceSimulation } from "../simulation/tick";
import {
  analyzeAnomalousTraitEvidence,
  assessAnomalousTraits,
  assessPhysicalHealth,
  assessPsychologicalState,
  assessWorkPreferences,
} from "../simulation/personnel";
import type { GameState } from "../simulation/state";
import {
  authorizeSiteWork,
  cancelLaboratory,
  placeLaboratory,
  validateLaboratoryPlacement,
  setResearchLaboratory,
  type ConstructionCode,
} from "../simulation/construction";
import type { TilePosition } from "../simulation/world";

export interface ConstructionCommandResult {
  readonly code: ConstructionCode;
  readonly snapshot: ControllerSnapshot;
}

export interface ControllerSnapshot {
  readonly game: GameState;
  readonly running: boolean;
}

export type ControllerListener = (snapshot: ControllerSnapshot) => void;

export interface GameController {
  getSnapshot(): ControllerSnapshot;
  advance(tickCount?: number): ControllerSnapshot;
  replaceState(nextState: GameState): ControllerSnapshot;
  authorizeJob(jobId: string): ControllerSnapshot;
  previewLaboratory(origin: TilePosition): ConstructionCode | null;
  placeLaboratory(origin: TilePosition): ConstructionCommandResult;
  cancelLaboratory(blueprintId: string): ConstructionCommandResult;
  setResearchLaboratory(roomId: string): ConstructionCommandResult;
  unlockAnomalousPsychometrics(): ControllerSnapshot;
  orderAnomalousAssessment(personId: string): ControllerSnapshot;
  orderWorkPreferenceAssessment(personId: string): ControllerSnapshot;
  orderPhysicalAssessment(personId: string): ControllerSnapshot;
  orderPsychologicalAssessment(personId: string): ControllerSnapshot;
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

    previewLaboratory(origin) {
      return validateLaboratoryPlacement(state, origin);
    },

    setResearchLaboratory(roomId) {
      const result = setResearchLaboratory(state, roomId);
      if (result.state === state)
        return { code: result.code, snapshot: getSnapshot() };
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },

    placeLaboratory(origin) {
      const result = placeLaboratory(state, origin);
      if (result.state === state)
        return { code: result.code, snapshot: getSnapshot() };
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },

    cancelLaboratory(blueprintId) {
      const result = cancelLaboratory(state, blueprintId);
      if (result.state === state)
        return { code: result.code, snapshot: getSnapshot() };
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },

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

    replaceState(nextState) {
      state = structuredClone(nextState);
      return publish();
    },

    authorizeJob(jobId) {
      state = authorizeSiteWork(state, jobId);
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

    orderPsychologicalAssessment(personId) {
      if (!state.personnel.some(({ id }) => id === personId)) {
        throw new Error(`Unknown person: ${personId}`);
      }
      state = {
        ...state,
        personnel: state.personnel.map((person) =>
          person.id === personId
            ? assessPsychologicalState(person, state.tick)
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
