import {
  advanceSites,
  createSite,
  disposeSite,
  siteOwnershipIssue,
  updateSite,
  type SimulationState,
  type SiteSetup,
} from "../simulation/sites";
import type { IncidentLevel } from "../simulation/state";
import {
  dispatchFreight,
  returnFreight,
  type FreightRequest,
} from "../simulation/site-transfers";
import { siteActions } from "../simulation/site-actions";
import type { ActionIntent } from "../simulation/action-queue-core";
import {
  orderSurfaceWork,
  cancelSurfaceWork,
  setExposureSource,
  type ExposureSourcePolicy,
  type SurfaceOperation,
} from "../simulation/environment";
import { orderObjectMove, cancelObjectMove } from "../simulation/object-work";
import {
  craftVessel,
  orderVesselAction,
  cancelVesselWork,
  type VesselAction,
} from "../simulation/vessel-work";
import { setWorkPriority, type WorkPriority } from "../simulation/jobs";
import {
  setDoorPolicy,
  tileAt,
  type DoorPolicy,
  type TilePosition,
} from "../simulation/world";
import type { MaterialId, SurfaceLayer } from "../simulation/materials";
import { objectFootprint, type ObjectOrientation } from "../simulation/objects";

export type SimulationCommand =
  | { readonly kind: "dispatch-freight"; readonly request: FreightRequest }
  | { readonly kind: "return-freight"; readonly transferId: string }
  | {
      readonly kind: "queue-action";
      readonly siteId: string;
      readonly intent: ActionIntent;
      readonly mode?: "append" | "now";
    }
  | {
      readonly kind: "edit-queue";
      readonly siteId: string;
      readonly actorId: string;
      readonly operation: "cancel" | "retry" | "clear" | "remove" | "reorder";
      readonly sequence?: number;
      readonly beforeSequence?: number;
    }
  | { readonly kind: "create-site"; readonly setup: SiteSetup }
  | { readonly kind: "dispose-site"; readonly siteId: string }
  | {
      readonly kind: "surface";
      readonly siteId: string;
      readonly position: TilePosition;
      readonly layer: SurfaceLayer;
      readonly material: MaterialId;
      readonly operation: SurfaceOperation;
    }
  | {
      readonly kind: "cancel-surface";
      readonly siteId: string;
      readonly orderId: string;
    }
  | {
      readonly kind: "move-object";
      readonly siteId: string;
      readonly objectId: string;
      readonly position: TilePosition;
      readonly orientation: ObjectOrientation;
      readonly install: boolean;
      readonly quantity?: number;
    }
  | {
      readonly kind: "cancel-object";
      readonly siteId: string;
      readonly orderId: string;
    }
  | {
      readonly kind: "craft-vessel";
      readonly siteId: string;
      readonly position: TilePosition;
      readonly material: MaterialId;
    }
  | {
      readonly kind: "vessel-action";
      readonly siteId: string;
      readonly vesselId: string;
      readonly action: Exclude<VesselAction, "craft" | "transport">;
      readonly cargoId?: string;
    }
  | {
      readonly kind: "cancel-vessel";
      readonly siteId: string;
      readonly orderId: string;
    }
  | {
      readonly kind: "work-priority";
      readonly siteId: string;
      readonly jobId: string;
      readonly priority: WorkPriority | null;
    }
  | {
      readonly kind: "door-policy";
      readonly siteId: string;
      readonly position: TilePosition;
      readonly policy: DoorPolicy;
    }
  | {
      readonly kind: "exposure-source";
      readonly siteId: string;
      readonly policy: ExposureSourcePolicy;
      readonly sourceId?: string;
    };

export interface SimulationSnapshot {
  readonly simulation: SimulationState;
  readonly running: boolean;
  readonly incidentTransitions: readonly {
    readonly siteId: string;
    readonly previous: IncidentLevel;
    readonly current: IncidentLevel;
    readonly tick: number;
  }[];
}

export function createSimulationController(initial: SimulationState) {
  const ownershipIssue = siteOwnershipIssue(initial);
  if (ownershipIssue) throw new Error(ownershipIssue);
  let simulation = structuredClone(initial);
  let running = true;
  let incidentTransitions: SimulationSnapshot["incidentTransitions"] = [];
  const listeners = new Set<(snapshot: SimulationSnapshot) => void>();
  const getSnapshot = (): SimulationSnapshot =>
    structuredClone({ simulation, running, incidentTransitions });
  const publish = () => {
    for (const listener of listeners) listener(getSnapshot());
    return getSnapshot();
  };
  const commit = (next: SimulationState) => {
    incidentTransitions = Object.entries(next.sites).flatMap(
      ([siteId, site]) => {
        const previous = simulation.sites[siteId]?.incident.level ?? "green";
        return previous === site.incident.level
          ? []
          : [
              {
                siteId,
                previous,
                current: site.incident.level,
                tick: next.tick,
              },
            ];
      },
    );
    simulation = next;
  };
  return {
    getSnapshot,
    subscribe(listener: (snapshot: SimulationSnapshot) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setRunning(next: boolean) {
      running = next;
      return publish();
    },
    advance(count = 1) {
      if (!Number.isInteger(count) || count <= 0)
        throw new RangeError("Tick count must be a positive integer.");
      for (let step = 0; running && step < count; step += 1) {
        commit(advanceSites(simulation));
        if (
          incidentTransitions.some(
            (entry) => entry.current === "orange" || entry.current === "red",
          )
        )
          running = false;
        publish();
      }
      return getSnapshot();
    },
    dispatch(command: SimulationCommand) {
      if (
        command.kind === "dispatch-freight" ||
        command.kind === "return-freight"
      ) {
        const result =
          command.kind === "dispatch-freight"
            ? dispatchFreight(simulation, command.request)
            : returnFreight(simulation, command.transferId);
        if (!result.reason) commit(result.state);
        return { snapshot: publish(), reason: result.reason };
      }
      if (command.kind === "create-site") {
        const result = createSite(simulation, command.setup);
        if (!result.reason) commit(result.state);
        return {
          snapshot: publish(),
          reason: result.reason,
          siteId: result.siteId,
        };
      }
      if (command.kind === "dispose-site") {
        const result = disposeSite(simulation, command.siteId);
        if (!result.reason) commit(result.state);
        return { snapshot: publish(), reason: result.reason };
      }
      let rejected: string | null = null;
      const result = updateSite(simulation, command.siteId, (site) => {
        switch (command.kind) {
          case "queue-action": {
            const result = siteActions.submitAction(
              site,
              command.intent,
              command.mode,
            );
            rejected = result.reason;
            return result.state;
          }
          case "edit-queue": {
            const result = siteActions.editActionQueue(
              site,
              command.siteId,
              command.actorId,
              command.operation,
              command.sequence,
              command.beforeSequence,
            );
            rejected = result.reason;
            return result.state;
          }
          case "surface": {
            const result = orderSurfaceWork(
              site,
              command.position,
              command.layer,
              command.material,
              command.operation,
            );
            if (result.code !== "accepted") rejected = result.code;
            return result.state;
          }
          case "cancel-surface":
            return cancelSurfaceWork(site, command.orderId);
          case "move-object": {
            const result = orderObjectMove(
              site,
              command.objectId,
              command.position,
              command.orientation,
              command.install,
              command.quantity,
            );
            if (result.code !== "accepted") rejected = result.code;
            return result.state;
          }
          case "cancel-object":
            return cancelObjectMove(site, command.orderId);
          case "craft-vessel": {
            const result = craftVessel(
              site,
              command.position,
              command.material,
            );
            if (result.code !== "accepted") rejected = result.code;
            return result.state;
          }
          case "vessel-action": {
            const result = orderVesselAction(
              site,
              command.vesselId,
              command.action,
              command.cargoId,
            );
            if (result.code !== "accepted") rejected = result.code;
            return result.state;
          }
          case "cancel-vessel":
            return cancelVesselWork(site, command.orderId);
          case "work-priority":
            return {
              ...site,
              jobs: setWorkPriority(site.jobs, command.jobId, command.priority),
            };
          case "door-policy": {
            const tile = tileAt(site.world.map, command.position);
            if (tile !== "door" && tile !== "closed-door") {
              rejected = "Select an existing door.";
              return site;
            }
            const obstructions = [
              ...(site.combat.adversary
                ? [site.combat.adversary.position]
                : []),
              ...site.objects.items.flatMap((item) =>
                item.location.kind === "ground" &&
                !(item.kind === "cable" && item.installed)
                  ? objectFootprint(item, item.location.position)
                  : [],
              ),
            ];
            const world = setDoorPolicy(
              site.world,
              command.position,
              command.policy,
              obstructions,
            );
            if (world === site.world)
              rejected =
                "The door policy is invalid or its doorway is occupied.";
            return { ...site, world };
          }
          case "exposure-source": {
            const result = setExposureSource(
              site,
              command.policy,
              command.sourceId,
            );
            if (result.code !== "accepted") rejected = result.code;
            return result.state;
          }
        }
      });
      const reason = rejected ?? result.reason;
      if (!reason) commit(result.state);
      return { snapshot: publish(), reason };
    },
  };
}
