import type { Entity } from "../Entity";
import type { Item } from "../Item";
import type { Pawn } from "./Pawn";
import type { TickEvent } from "../../Simulation";
import { positionOf } from "../../site/TileMap";

export function restraintFor(
  entities: Record<string, Entity>,
  pawnId: string,
): Item | undefined {
  return Object.values(entities).find(
    (entity): entity is Item =>
      entity.kind === "item" &&
      entity.restraint?.attached === true &&
      (entity.integrity ?? 100) > 0 &&
      entity.location.kind === "carried" &&
      entity.location.carrierId === pawnId,
  );
}

export function tickCustody(
  entities: Record<string, Entity>,
  pawn: Pawn,
  siteId: string,
  events: TickEvent[],
): void {
  if (pawn.health?.death || !pawn.canAct) return;
  const restraint = restraintFor(entities, pawn.id);
  if (restraint) {
    restraint.integrity = Math.max(
      0,
      (restraint.integrity ?? 100) - restraint.restraint!.wearPerTick,
    );
    if (restraint.integrity > 0) return;
    const position = positionOf({ entities }, pawn.id)!;
    restraint.restraint!.attached = false;
    restraint.location = { kind: "ground", position: { ...position } };
    events.push({
      siteId,
      entityId: pawn.id,
      kind: "escaped",
      targetId: restraint.id,
      reason: "The physical restraint broke under conscious struggle.",
    });
  }
  if (pawn.requiresRestraint && pawn.location.kind === "carried") {
    const position = positionOf({ entities }, pawn.id)!;
    pawn.location = { kind: "ground", position: { ...position } };
    events.push({
      siteId,
      entityId: pawn.id,
      kind: "escaped",
      reason: "The unrestrained conscious subject escaped its carrier.",
    });
  }
}
