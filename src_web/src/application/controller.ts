import {
  cameraPlacementIssue,
  installCamera,
  setCameraEnabled,
  type CameraPlacementCode,
} from "../simulation/observations";
import { advanceSimulation } from "../simulation/tick";
import {
  orderObjectMove,
  cancelObjectMove,
  objectPlacementIssue,
  type ObjectCommandCode,
} from "../simulation/object-work";
import type { ObjectOrientation } from "../simulation/objects";
import {
  orderSurfaceWork,
  type SurfaceOrderCode,
} from "../simulation/environment";
import {
  replaceSurface,
  surfaceAt,
  type MaterialId,
  type SurfaceLayer,
} from "../simulation/materials";
import { observeSite } from "../simulation/observations";
import type { GameState } from "../simulation/state";
import {
  authorizeSiteWork,
  cancelLaboratory,
  placeLaboratory,
  validateLaboratoryPlacement,
  type ConstructionCode,
} from "../simulation/construction";
import type { TilePosition } from "../simulation/world";
import {
  requestAssessment,
  setClinicalCarePolicy,
  type ClinicalCarePolicy,
} from "../simulation/clinical";
import {
  setPersonnelSchedule,
  type ScheduleBlock,
} from "../simulation/routines";

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
  previewObjectMove(
    objectId: string,
    destination: TilePosition,
    orientation: ObjectOrientation,
    install: boolean,
  ): ObjectCommandCode | null;
  orderObjectMove(
    objectId: string,
    destination: TilePosition,
    orientation: ObjectOrientation,
    install: boolean,
    quantity?: number,
  ): { code: ObjectCommandCode; snapshot: ControllerSnapshot };
  cancelObjectMove(orderId: string): ControllerSnapshot;
  orderSurfaceWork(
    position: TilePosition,
    layer: SurfaceLayer,
    material: MaterialId,
  ): { code: SurfaceOrderCode; snapshot: ControllerSnapshot };
  setAutomaticRepairs(enabled: boolean): ControllerSnapshot;
  setDoorOpen(position: TilePosition, open: boolean): ControllerSnapshot;
  getSnapshot(): ControllerSnapshot;
  advance(tickCount?: number): ControllerSnapshot;
  replaceState(nextState: GameState): ControllerSnapshot;
  authorizeJob(jobId: string): ControllerSnapshot;
  previewLaboratory(origin: TilePosition): ConstructionCode | null;
  placeLaboratory(origin: TilePosition): ConstructionCommandResult;
  cancelLaboratory(blueprintId: string): ConstructionCommandResult;
  orderAnomalousAssessment(personId: string): ControllerSnapshot;
  orderWorkPreferenceAssessment(personId: string): ControllerSnapshot;
  orderPhysicalAssessment(personId: string): ControllerSnapshot;
  orderPsychologicalAssessment(personId: string): ControllerSnapshot;
  orderMoodScreening(personId: string): ControllerSnapshot;
  setClinicalCarePolicy(policy: ClinicalCarePolicy): ControllerSnapshot;
  setPersonnelSchedule(
    personId: string,
    schedule: readonly ScheduleBlock[],
  ): ControllerSnapshot;
  setRunning(running: boolean): ControllerSnapshot;
  subscribe(listener: ControllerListener): () => void;
  previewCamera(position: TilePosition): CameraPlacementCode | null;
  installCamera(position: TilePosition): {
    readonly code: CameraPlacementCode;
    readonly snapshot: ControllerSnapshot;
  };
  setCameraEnabled(cameraId: string, enabled: boolean): ControllerSnapshot;
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
    previewObjectMove(objectId, destination, orientation, install) {
      return objectPlacementIssue(
        state,
        objectId,
        destination,
        orientation,
        install,
      );
    },
    orderObjectMove(objectId, destination, orientation, install, quantity) {
      const result = orderObjectMove(
        state,
        objectId,
        destination,
        orientation,
        install,
        quantity,
      );
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    cancelObjectMove(orderId) {
      state = cancelObjectMove(state, orderId);
      return publish();
    },

    orderSurfaceWork(position, layer, material) {
      const result = orderSurfaceWork(state, position, layer, material);
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    setAutomaticRepairs(enabled) {
      if (typeof enabled === "boolean")
        state = {
          ...state,
          environment: { ...state.environment, automaticRepairs: enabled },
        };
      return publish();
    },
    setDoorOpen(position, open) {
      const door = surfaceAt(state.world.map, position, "structure");
      if (
        typeof open === "boolean" &&
        door &&
        door.integrity > 0 &&
        ["door", "closed-door"].includes(door.kind) &&
        (open ||
          !Object.values(state.world.positions).some(
            (occupant) =>
              occupant.x === position.x && occupant.y === position.y,
          ))
      )
        state = observeSite({
          ...state,
          world: {
            ...state.world,
            map: replaceSurface(state.world.map, position, "structure", {
              ...door,
              kind: open ? "door" : "closed-door",
            }),
          },
        });
      return publish();
    },

    previewCamera(position) {
      return cameraPlacementIssue(state, position);
    },
    installCamera(position) {
      const result = installCamera(state, position);
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    setCameraEnabled(cameraId, enabled) {
      state = setCameraEnabled(state, cameraId, enabled);
      return publish();
    },

    setPersonnelSchedule(personId, schedule) {
      state = setPersonnelSchedule(state, personId, schedule);
      return publish();
    },

    setClinicalCarePolicy(policy) {
      state = setClinicalCarePolicy(state, policy);
      return publish();
    },

    previewLaboratory(origin) {
      return validateLaboratoryPlacement(state, origin);
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
      state = requestAssessment(state, personId, "physical");
      return publish();
    },

    orderPsychologicalAssessment(personId) {
      state = requestAssessment(state, personId, "psychological");
      return publish();
    },

    orderMoodScreening(personId) {
      state = requestAssessment(state, personId, "mood");
      return publish();
    },

    orderAnomalousAssessment(personId) {
      state = requestAssessment(state, personId, "anomalous");
      return publish();
    },

    orderWorkPreferenceAssessment(personId) {
      state = requestAssessment(state, personId, "preferences");
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
