import {
  cameraPlacementIssue,
  installCamera,
  setCameraEnabled,
  type CameraPlacementCode,
} from "../simulation/observations";
import { isElectrical, setUtilityEnabled } from "../simulation/power";
import { goHere } from "../simulation/direct-control";
import {
  enlistExpedition,
  cancelExpedition,
  dispatchExpedition,
  recallExpedition,
  recoverExpeditionObject,
  cancelRecovery,
  fieldState,
  storeFieldState,
  expeditionMember,
  type ExpeditionCode,
} from "../simulation/expeditions";
import {
  draftResponder,
  orderResponder,
  startEncounter,
  observeCombat,
  type TacticalCode,
  type TacticalOrder,
} from "../simulation/combat";
import { advanceSimulation } from "../simulation/tick";
import { setWorkPriority, type WorkPriority } from "../simulation/jobs";
import {
  craftVessel,
  orderVesselAction,
  cancelVesselWork,
  type VesselAction,
  type VesselCommandCode,
} from "../simulation/vessel-work";
import {
  setStorageArea,
  removeStorageArea,
  storagePlacementIssue,
  type StoragePolicy,
  type StorageCommandCode,
} from "../simulation/storage";
import {
  orderObjectMove,
  cancelObjectMove,
  objectPlacementIssue,
  type ObjectCommandCode,
} from "../simulation/object-work";
import { objectFootprint, type ObjectOrientation } from "../simulation/objects";
import {
  orderSurfaceWork,
  cancelSurfaceWork,
  setExposureSource,
  removeExposureSource,
  exposureSourceIssue,
  type ExposureSourcePolicy,
  type ExposureCommandCode,
  type SurfaceOperation,
  type SurfaceOrderCode,
} from "../simulation/environment";
import { type MaterialId, type SurfaceLayer } from "../simulation/materials";
import { observeSite } from "../simulation/observations";
import type { GameState } from "../simulation/state";
import {
  authorizeSiteWork,
  cancelLaboratory,
  placeLaboratory,
  validateLaboratoryPlacement,
  type ConstructionCode,
} from "../simulation/construction";
import {
  setDoorPolicy,
  type DoorPolicy,
  type TilePosition,
} from "../simulation/world";
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
  goHere(
    mapId: string,
    personId: string,
    destination: TilePosition,
  ): { code: TacticalCode; snapshot: ControllerSnapshot };
  previewGoHere(
    mapId: string,
    personId: string,
    destination: TilePosition,
  ): TacticalCode;
  enlistExpedition(
    noticeId: string,
    team: readonly string[],
    loadouts?: Readonly<
      Record<
        string,
        { readonly ammunition: number; readonly medicalSupplies: number }
      >
    >,
  ): { code: ExpeditionCode; snapshot: ControllerSnapshot };
  cancelExpedition(): { code: ExpeditionCode; snapshot: ControllerSnapshot };
  dispatchExpedition(): { code: ExpeditionCode; snapshot: ControllerSnapshot };
  recallExpedition(): { code: ExpeditionCode; snapshot: ControllerSnapshot };
  cancelRecovery(
    expeditionId: string,
    personId: string,
  ): { code: ExpeditionCode; snapshot: ControllerSnapshot };
  recoverExpeditionObject(
    expeditionId: string,
    personId: string,
    objectId: string,
  ): { code: ExpeditionCode; snapshot: ControllerSnapshot };
  orderFieldResponder(
    expeditionId: string,
    id: string,
    order: TacticalOrder,
    destination?: TilePosition,
    targetId?: string,
  ): { code: TacticalCode; snapshot: ControllerSnapshot };
  previewFieldOrder(
    expeditionId: string,
    id: string,
    order: TacticalOrder,
    destination?: TilePosition,
    targetId?: string,
  ): TacticalCode;
  setFieldDoorPolicy(
    expeditionId: string,
    position: TilePosition,
    policy: DoorPolicy,
  ): ControllerSnapshot;
  draftResponder(
    id: string,
    drafted: boolean,
  ): { code: TacticalCode; snapshot: ControllerSnapshot };
  orderResponder(
    id: string,
    order: TacticalOrder,
    destination?: TilePosition,
    targetId?: string,
  ): { code: TacticalCode; snapshot: ControllerSnapshot };
  previewTacticalOrder(
    id: string,
    order: TacticalOrder,
    destination?: TilePosition,
    targetId?: string,
  ): TacticalCode;
  startEncounter(position: TilePosition): {
    code: TacticalCode;
    snapshot: ControllerSnapshot;
  };
  previewEncounter(position: TilePosition): TacticalCode;
  setUtilityEnabled(id: string, enabled: boolean): ControllerSnapshot;
  repairUtility(id: string): {
    code: VesselCommandCode;
    snapshot: ControllerSnapshot;
  };
  craftVessel(
    position: TilePosition,
    material: MaterialId,
  ): { code: VesselCommandCode; snapshot: ControllerSnapshot };
  previewVesselCraft(
    position: TilePosition,
    material: MaterialId,
  ): VesselCommandCode | null;
  orderVesselAction(
    vesselId: string,
    action: Exclude<VesselAction, "craft">,
    cargoId?: string,
    position?: TilePosition,
    transport?: { mode: "helicopter" | "truck"; duration: number },
  ): { code: VesselCommandCode; snapshot: ControllerSnapshot };
  previewVesselAction(
    vesselId: string,
    action: Exclude<VesselAction, "craft">,
    cargoId?: string,
    position?: TilePosition,
    transport?: { mode: "helicopter" | "truck"; duration: number },
  ): VesselCommandCode | null;
  cancelVesselWork(id: string): ControllerSnapshot;
  previewExposureSource(
    policy: ExposureSourcePolicy,
    id?: string,
  ): ExposureCommandCode | null;
  setExposureSource(
    policy: ExposureSourcePolicy,
    id?: string,
  ): { code: ExposureCommandCode; snapshot: ControllerSnapshot };
  removeExposureSource(id: string): ControllerSnapshot;
  previewStorageArea(
    policy: StoragePolicy,
    id?: string,
  ): StorageCommandCode | null;
  setStorageArea(
    policy: StoragePolicy,
    id?: string,
  ): { code: StorageCommandCode; snapshot: ControllerSnapshot };
  removeStorageArea(id: string): {
    code: StorageCommandCode;
    snapshot: ControllerSnapshot;
  };
  previewObjectMove(
    objectId: string,
    destination: TilePosition,
    orientation: ObjectOrientation,
    install: boolean,
    quantity?: number,
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
    operation?: SurfaceOperation,
  ): { code: SurfaceOrderCode; snapshot: ControllerSnapshot };
  previewSurfaceWork(
    position: TilePosition,
    layer: SurfaceLayer,
    material: MaterialId,
    operation: SurfaceOperation,
  ): SurfaceOrderCode | null;
  setAutomaticRepairs(enabled: boolean): ControllerSnapshot;
  cancelSurfaceWork(orderId: string): ControllerSnapshot;
  setDoorOpen(position: TilePosition, open: boolean): ControllerSnapshot;
  setDoorPolicy(position: TilePosition, policy: DoorPolicy): ControllerSnapshot;
  getSnapshot(): ControllerSnapshot;
  advance(tickCount?: number): ControllerSnapshot;
  replaceState(nextState: GameState): ControllerSnapshot;
  authorizeJob(jobId: string): ControllerSnapshot;
  setWorkPriority(
    jobId: string,
    priority: WorkPriority | null,
  ): ControllerSnapshot;
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

  function applyDoorPolicy(
    position: TilePosition,
    policy: DoorPolicy,
  ): ControllerSnapshot {
    const obstructions = state.objects.items.flatMap((item) =>
      item.location.kind === "ground" &&
      !(item.kind === "cable" && item.installed)
        ? item.installed
          ? objectFootprint(item, item.location.position)
          : [item.location.position]
        : [],
    );
    if (state.combat.adversary)
      obstructions.push(state.combat.adversary.position);
    state = observeSite({
      ...state,
      world: setDoorPolicy(state.world, position, policy, obstructions),
    });
    return publish();
  }

  return {
    getSnapshot,
    goHere(mapId, personId, destination) {
      const result = goHere(state, mapId, personId, destination);
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    previewGoHere(mapId, personId, destination) {
      return goHere(state, mapId, personId, destination).code;
    },
    enlistExpedition(noticeId, team, loadouts) {
      const result = enlistExpedition(state, noticeId, team, loadouts);
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    cancelExpedition() {
      const result = cancelExpedition(state);
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    dispatchExpedition() {
      const result = dispatchExpedition(state);
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    recallExpedition() {
      const result = recallExpedition(state);
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    cancelRecovery(expeditionId, personId) {
      if (state.expeditions.active?.id !== expeditionId)
        return { code: "not-found", snapshot: getSnapshot() };
      const result = cancelRecovery(state, personId);
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    recoverExpeditionObject(expeditionId, personId, objectId) {
      if (state.expeditions.active?.id !== expeditionId)
        return { code: "not-found", snapshot: getSnapshot() };
      const result = recoverExpeditionObject(state, personId, objectId);
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    previewFieldOrder(expeditionId, id, order, destination, targetId) {
      const field = fieldState(state);
      if (
        !field ||
        state.expeditions.active?.id !== expeditionId ||
        state.expeditions.active.phase !== "field" ||
        state.expeditions.active.recoveryOrders.some(
          (entry) => entry.personId === id && entry.phase !== "delivered",
        )
      )
        return "busy";
      return orderResponder(field, id, order, destination, targetId).code;
    },
    orderFieldResponder(expeditionId, id, order, destination, targetId) {
      const field = fieldState(state);
      if (
        !field ||
        state.expeditions.active?.id !== expeditionId ||
        state.expeditions.active.phase !== "field" ||
        state.expeditions.active.recoveryOrders.some(
          (entry) => entry.personId === id && entry.phase !== "delivered",
        )
      )
        return { code: "busy", snapshot: getSnapshot() };
      const result = orderResponder(field, id, order, destination, targetId);
      state = storeFieldState(state, result.state);
      return { code: result.code, snapshot: publish() };
    },
    setFieldDoorPolicy(expeditionId, position, policy) {
      const field = fieldState(state);
      if (
        !field ||
        state.expeditions.active?.id !== expeditionId ||
        !["field", "regrouping"].includes(state.expeditions.active.phase)
      )
        return getSnapshot();
      const obstructions = field.objects.items.flatMap((item) =>
        item.location.kind === "ground" ? [item.location.position] : [],
      );
      if (field.combat.adversary)
        obstructions.push(field.combat.adversary.position);
      state = storeFieldState(
        state,
        observeCombat(
          observeSite({
            ...field,
            world: setDoorPolicy(field.world, position, policy, obstructions),
          }),
        ),
      );
      return publish();
    },
    draftResponder(id, drafted) {
      if (expeditionMember(state, id))
        return { code: "busy", snapshot: getSnapshot() };
      const result = draftResponder(state, id, drafted);
      state = observeCombat(observeSite(result.state));
      return { code: result.code, snapshot: publish() };
    },
    orderResponder(id, order, destination, targetId) {
      if (expeditionMember(state, id))
        return { code: "busy", snapshot: getSnapshot() };
      const result = orderResponder(state, id, order, destination, targetId);
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    previewTacticalOrder(id, order, destination, targetId) {
      if (expeditionMember(state, id)) return "busy";
      return orderResponder(state, id, order, destination, targetId).code;
    },
    startEncounter(position) {
      const result = startEncounter(state, position);
      state = observeCombat(observeSite(result.state));
      return { code: result.code, snapshot: publish() };
    },
    previewEncounter(position) {
      return startEncounter(state, position).code;
    },
    setUtilityEnabled(id, enabled) {
      state = observeSite(setUtilityEnabled(state, id, enabled));
      return publish();
    },
    repairUtility(id) {
      if (
        !state.objects.items.some(
          (item) => item.id === id && isElectrical(item),
        )
      )
        return { code: "not-found", snapshot: getSnapshot() };
      const result = orderVesselAction(state, id, "repair");
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    craftVessel(position, material) {
      const result = craftVessel(state, position, material);
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    previewVesselCraft(position, material) {
      const code = craftVessel(state, position, material).code;
      return code === "accepted" ? null : code;
    },
    orderVesselAction(vesselId, action, cargoId, position, transport) {
      const result = orderVesselAction(
        state,
        vesselId,
        action,
        cargoId,
        position,
        transport,
      );
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    previewVesselAction(vesselId, action, cargoId, position, transport) {
      const code = orderVesselAction(
        state,
        vesselId,
        action,
        cargoId,
        position,
        transport,
      ).code;
      return code === "accepted" ? null : code;
    },
    cancelVesselWork(id) {
      state = cancelVesselWork(state, id);
      return publish();
    },
    previewExposureSource(policy, id) {
      return exposureSourceIssue(state, policy, id);
    },
    setExposureSource(policy, id) {
      const result = setExposureSource(state, policy, id);
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    removeExposureSource(id) {
      state = removeExposureSource(state, id);
      return publish();
    },
    previewStorageArea(policy, id) {
      return storagePlacementIssue(state, policy, id);
    },
    setStorageArea(policy, id) {
      const result = setStorageArea(state, policy, id);
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    removeStorageArea(id) {
      const result = removeStorageArea(state, id);
      state = result.state;
      return { code: result.code, snapshot: publish() };
    },
    previewObjectMove(objectId, destination, orientation, install, quantity) {
      return objectPlacementIssue(
        state,
        objectId,
        destination,
        orientation,
        install,
        quantity,
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

    previewSurfaceWork(position, layer, material, operation) {
      const result = orderSurfaceWork(
        state,
        position,
        layer,
        material,
        operation,
      );
      return result.code === "accepted" ? null : result.code;
    },
    orderSurfaceWork(position, layer, material, operation) {
      const result = orderSurfaceWork(
        state,
        position,
        layer,
        material,
        operation,
      );
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
    cancelSurfaceWork(orderId) {
      state = cancelSurfaceWork(state, orderId);
      return publish();
    },
    setDoorOpen(position, open) {
      if (typeof open === "boolean")
        return applyDoorPolicy(position, open ? "held-open" : "held-closed");
      return publish();
    },
    setDoorPolicy: applyDoorPolicy,

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
    setWorkPriority(jobId, priority) {
      state = { ...state, jobs: setWorkPriority(state.jobs, jobId, priority) };
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
