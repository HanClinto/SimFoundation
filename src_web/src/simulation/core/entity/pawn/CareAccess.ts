import type { Entity } from "../Entity";
import type { Pawn } from "./Pawn";
import type { Health } from "./Health";
import type { Site } from "../../site/Site";
import { restraintFor } from "./Custody";
import { containmentFor, secureContainment } from "../Containment";

export function isCarePatient(
  site: Site,
  worker: Pawn,
  target: Entity | undefined,
  tick: number,
): target is Pawn & { health: Health } {
  if (
    target?.kind !== "pawn" ||
    !target.health ||
    target.health.death ||
    target.id === worker.id
  )
    return false;
  if (target.response?.faction === worker.response?.faction) return true;
  if (!target.requiresRestraint) return false;
  const cell = containmentFor(site.entities, target.id);
  return (
    !!restraintFor(site.entities, target.id) ||
    !!(cell && secureContainment(cell, tick))
  );
}
