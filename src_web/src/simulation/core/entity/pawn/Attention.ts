import type { Site } from "../../site/Site";
import type { Pawn } from "./Pawn";
import type { Facility } from "../Facility";
import { canSee } from "../../site/Sight";
import { restraintFor } from "./Custody";
import { distance, positionOf } from "../../site/TileMap";

export function directWatchers(site: Site, targetId: string): Pawn[] {
  return Object.values(site.entities)
    .filter((entity): entity is Pawn => {
      if (
        entity.kind !== "pawn" ||
        entity.human !== true ||
        entity.id === targetId ||
        !entity.canAct ||
        entity.health?.death ||
        entity.location.kind !== "ground" ||
        (entity.needs.fatigue?.value ?? 0) >= 85 ||
        restraintFor(site.entities, entity.id)
      )
        return false;
      const current = entity.queue[0];
      return (
        current?.action.kind === "watch" &&
        current.action.targetId === targetId &&
        current.action.workTicks > 0 &&
        current.blockedReason === null &&
        (current.source !== "player" || entity.playerControllable) &&
        canSee(site, entity, targetId)
      );
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function supervisionBlocker(
  site: Site,
  facility: Facility,
  workerId: string,
): string | null {
  const rule = facility.supervision;
  if (!rule) return null;
  const target = Object.values(site.entities)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .find(
      (entity) =>
        entity.definitionId === rule.targetDefinitionId &&
        entity.kind === "pawn" &&
        !entity.health?.death &&
        entity.location.kind === "ground" &&
        distance(
          positionOf(site, entity.id)!,
          positionOf(site, facility.id)!,
        ) <= rule.range,
    );
  if (!target)
    return "The supervised subject must remain beside this work station.";
  const observers = directWatchers(site, target.id).filter(
    (observer) =>
      observer.id !== workerId &&
      distance(
        positionOf(site, observer.id)!,
        positionOf(site, facility.id)!,
      ) <= rule.range,
  );
  return observers.length >= rule.observers
    ? null
    : `Maintain ${rule.observers} active direct observers beside the station, other than the worker, before this supervised work.`;
}
