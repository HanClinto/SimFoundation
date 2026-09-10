import type { Site } from "../../site/Site";
import type { Pawn } from "./Pawn";
import type { Facility } from "../Facility";
import { canSee } from "../../site/Sight";
import { restraintFor } from "./Custody";
import { distance, positionOf } from "../../site/TileMap";

export function canObserveIndependently(site: Site, pawn: Pawn): boolean {
  const current = pawn.queue[0]?.action;
  return (
    pawn.canAct &&
    !pawn.health?.death &&
    !(current?.kind === "sleep" && current.workTicks > 0) &&
    pawn.location.kind === "ground" &&
    !restraintFor(site.entities, pawn.id)
  );
}

export function supportsDirectWatch(
  site: Site,
  observer: Pawn,
  targetId: string,
): boolean {
  const support = observer.attentionSupport;
  const target = site.entities[targetId];
  if (
    !support ||
    !canObserveIndependently(site, observer) ||
    target?.kind !== "pawn" ||
    !target.stillWhenWatched ||
    target.health?.death ||
    target.location.kind !== "ground" ||
    !support.targets.includes(target.definitionId) ||
    !canSee(site, observer, target.id)
  )
    return false;
  return Object.values(site.entities).some(
    (human) =>
      human.kind === "pawn" &&
      human.id !== observer.id &&
      human.human === true &&
      canObserveIndependently(site, human) &&
      distance(positionOf(site, observer.id)!, positionOf(site, human.id)!) <=
        support.humanRange &&
      canSee(site, observer, human.id),
  );
}

export function directWatchers(site: Site, targetId: string): Pawn[] {
  return Object.values(site.entities)
    .filter((entity): entity is Pawn => {
      if (
        entity.kind !== "pawn" ||
        entity.id === targetId ||
        !canObserveIndependently(site, entity)
      )
        return false;
      if (supportsDirectWatch(site, entity, targetId)) return true;
      if (entity.human !== true || (entity.needs.fatigue?.value ?? 0) >= 85)
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
      observer.human === true &&
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

export function watchHandoffBlocker(
  site: Site,
  outgoing: Pawn,
  replacementId: string,
): string | null {
  const watch = outgoing.queue[0]?.action;
  const replacement = site.entities[replacementId];
  if (watch?.kind !== "watch")
    return "The outgoing worker must have a current direct-watch commitment.";
  if (
    replacement?.kind !== "pawn" ||
    replacement.id === outgoing.id ||
    !outgoing.response?.faction ||
    replacement.response?.faction !== outgoing.response.faction
  )
    return "Choose a different allied replacement at this site.";
  const active = directWatchers(site, watch.targetId);
  if (
    replacement.queue[0]?.action.kind !== "watch" ||
    !active.some((observer) => observer.id === outgoing.id) ||
    !active.some((observer) => observer.id === replacement.id)
  )
    return "Both workers must already be actively watching the same subject; activate replacement coverage before relief.";
  const proposed: Site = {
    ...site,
    entities: {
      ...site.entities,
      [outgoing.id]: { ...outgoing, queue: outgoing.queue.slice(1) },
    },
  };
  for (const worker of Object.values(site.entities)) {
    if (
      worker.kind !== "pawn" ||
      !worker.canAct ||
      worker.location.kind !== "ground"
    )
      continue;
    const work = worker.queue[0]?.action;
    if (
      (work?.kind !== "study" && work?.kind !== "service") ||
      work.workTicks <= 0
    )
      continue;
    const station = site.entities[work.targetId];
    if (
      station?.kind === "facility" &&
      station.supervision &&
      supervisionBlocker(site, station, worker.id) === null &&
      supervisionBlocker(proposed, station, worker.id) !== null
    )
      return "Relief would leave productive supervised work without its required observers.";
  }
  return null;
}
