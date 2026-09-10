import type { Entity } from "./Entity";
import type { Item } from "./Item";
import type { Site } from "../site/Site";

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
}

export function wornEquipment(
  site: Site,
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
  return owner?.kind === "pawn" && !!owner.health?.death;
}
