import type { Entity } from "./Entity";
import type { Item } from "./Item";
import type { Site } from "../site/Site";
import type { Pawn } from "./pawn/Pawn";

export interface Equipment {
  slot: "tool" | "armor";
  worn: boolean;
  subdual?: {
    charges: number;
    ticks: number;
    duration: number;
    rearm?: { supplyDefinitionId: string; capacity: number; ticks: number };
  };
  armor?: { reduction: number; wear: number };
  medicine?: {
    supplies: number;
    ticks: number;
    rearm?: { supplyDefinitionId: string; capacity: number; ticks: number };
  };
}

export function wornEquipment(
  site: Pick<Site, "entities">,
  pawnId: string,
  slot: Equipment["slot"],
): Item | undefined {
  return Object.values(site.entities).find(
    (entity): entity is Item =>
      entity.kind === "item" &&
      entity.equipment?.worn === true &&
      entity.equipment.slot === slot &&
      entity.location.kind === "carried" &&
      entity.location.carrierId === pawnId,
  );
}

export function carriedCargo(
  entities: Record<string, Entity>,
  pawnId: string,
): Entity[] {
  return Object.values(entities).filter(
    (entity) =>
      entity.location.kind === "carried" &&
      entity.location.carrierId === pawnId &&
      !(
        entity.kind === "item" &&
        (entity.equipment?.worn || entity.restraint?.attached)
      ),
  );
}

export function availableForRecovery(
  site: Site,
  target: Entity,
  actorId: string,
): boolean {
  if (target.location.kind === "ground") return true;
  if (target.location.carrierId === actorId) return true;
  const owner = site.entities[target.location.carrierId];
  if (owner?.kind !== "pawn") return false;
  if (owner.health?.death) return true;
  const worker = site.entities[actorId];
  return (
    !owner.canAct &&
    worker?.kind === "pawn" &&
    !!worker.response?.faction &&
    worker.response.faction === owner.response?.faction
  );
}

export function equipmentUnderRepair(
  site: Site,
  equipmentId: string,
  exceptWorkerId?: string,
): boolean {
  return Object.values(site.entities).some((entity) => {
    if (entity.kind !== "pawn" || entity.id === exceptWorkerId) return false;
    const action = entity.queue[0]?.action;
    return (
      action?.kind === "repair-equipment" &&
      action.targetId === equipmentId &&
      action.supplyId !== undefined
    );
  });
}

export function stabilizationCapability(
  site: Pick<Site, "entities">,
  pawn: Pawn,
): { supplies: number; ticks: number } | undefined {
  if (!pawn.response?.medicine) return undefined;
  const tool = wornEquipment(site, pawn.id, "tool");
  if (tool?.equipment?.medicine)
    return (tool.integrity ?? 100) > 0 ? tool.equipment.medicine : undefined;
  return pawn.response.medicine;
}
