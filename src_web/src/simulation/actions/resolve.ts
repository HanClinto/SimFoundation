import type { Entity, Pawn, Site, TickEvent } from "../model";
import type { Proposal } from "./proposals";
import {
  distance,
  doorAt,
  floorAt,
  positionOf,
  samePosition,
} from "../world/spatial";

export function resolveTick(
  site: Site,
  proposals: readonly Proposal[],
): { site: Site; events: readonly TickEvent[] } {
  const entities: Record<string, Entity> = { ...site.entities };
  const events: TickEvent[] = [];
  const claimed = new Set<string>();
  const occupied = new Set<string>();
  const opened = new Set<string>();
  const actors = proposals
    .filter((proposal) => proposal.kind === "pawn")
    .sort((first, second) => first.entityId.localeCompare(second.entityId));
  for (const proposal of actors) {
    const original = site.entities[proposal.entityId];
    if (!original || original.kind !== "pawn") continue;
    let pawn: Pawn = { ...original, needs: proposal.needs };
    const current = proposal.current;
    const request = proposal.request;
    if (!current || !request) {
      entities[pawn.id] = claimed.has(pawn.id)
        ? { ...pawn, location: entities[pawn.id]!.location }
        : pawn;
      continue;
    }
    let reason: string | null = null;
    let completed = false;
    const origin = positionOf(site, pawn.id)!;
    if (request.kind === "blocked") reason = request.reason;
    else if (request.kind === "complete") completed = true;
    else if (request.kind === "move") {
      const key = `${request.destination.x},${request.destination.y}`;
      const door = doorAt(site, request.destination);
      const obstructed = Object.values(site.entities).some(
        (entity) =>
          entity.kind === "pawn" &&
          entity.id !== pawn.id &&
          entity.location.kind === "ground" &&
          samePosition(entity.location.position, request.destination),
      );
      if (
        !floorAt(site, request.destination) ||
        distance(origin, request.destination) !== 1 ||
        (door && !door.open)
      )
        reason = "Movement is blocked.";
      else if (occupied.has(key) || obstructed)
        reason = "The destination is occupied or claimed this tick.";
      else {
        occupied.add(key);
        pawn = {
          ...pawn,
          location: { kind: "ground", position: { ...request.destination } },
        };
        completed =
          current.action.kind === "move" &&
          samePosition(request.destination, current.action.destination);
      }
    } else if (request.kind === "open") {
      const target = site.entities[request.targetId];
      if (
        !target ||
        target.kind !== "door" ||
        target.policy !== "automatic" ||
        distance(origin, positionOf(site, target.id)!) > 1
      )
        reason = "The door cannot be opened.";
      else {
        entities[target.id] = { ...target, open: true };
        if (!opened.has(target.id))
          events.push({ siteId: site.id, entityId: target.id, kind: "opened" });
        opened.add(target.id);
      }
    } else if ("targetId" in request) {
      const target = site.entities[request.targetId];
      const position = target ? positionOf(site, target.id) : null;
      if (!target || !position || distance(origin, position) > 1)
        reason = "The target is out of reach.";
      else if (claimed.has(target.id))
        reason = "The target was claimed by another action this tick.";
      else if (request.kind === "take") {
        const carrying = Object.values(site.entities).some(
          (entity) =>
            entity.location.kind === "carried" &&
            entity.location.carrierId === pawn.id,
        );
        if (
          target.id === pawn.id ||
          !target.carryable ||
          target.location.kind !== "ground" ||
          carrying ||
          (target.kind === "pawn" && target.canAct && target.mobile)
        )
          reason = "This entity cannot be picked up now.";
        else {
          entities[target.id] = {
            ...entities[target.id]!,
            location: { kind: "carried", carrierId: pawn.id },
          };
          claimed.add(target.id);
          completed = true;
        }
      } else if (request.kind === "drop") {
        if (
          target.location.kind !== "carried" ||
          target.location.carrierId !== pawn.id
        )
          reason = "This pawn is not carrying the target.";
        else {
          entities[target.id] = {
            ...entities[target.id]!,
            location: { kind: "ground", position: { ...origin } },
          };
          claimed.add(target.id);
          completed = true;
        }
      } else {
        if (
          target.kind !== "item" ||
          target.nutrition <= 0 ||
          !pawn.needs.hunger ||
          (target.location.kind === "carried" &&
            target.location.carrierId !== pawn.id)
        )
          reason = "This pawn cannot consume that item.";
        else {
          pawn = {
            ...pawn,
            needs: {
              ...pawn.needs,
              hunger: {
                ...pawn.needs.hunger,
                value: Math.max(0, pawn.needs.hunger.value - target.nutrition),
              },
            },
          };
          delete entities[target.id];
          claimed.add(target.id);
          completed = true;
        }
      }
    }
    const pending =
      original.queue[0]?.id === current.id
        ? original.queue.slice(1)
        : original.queue;
    pawn = {
      ...pawn,
      queue: completed
        ? pending
        : [
            { ...current, elapsed: current.elapsed + 1, blockedReason: reason },
            ...pending,
          ],
    };
    const carried = entities[pawn.id]?.location;
    if (claimed.has(pawn.id) && carried) pawn = { ...pawn, location: carried };
    entities[pawn.id] = pawn;
    if (completed)
      events.push({
        siteId: site.id,
        entityId: pawn.id,
        kind: "completed",
        actionId: current.id,
      });
    else if (reason)
      events.push({
        siteId: site.id,
        entityId: pawn.id,
        kind: "blocked",
        actionId: current.id,
        reason,
      });
  }
  for (const proposal of [...proposals]
    .filter((entry) => entry.kind === "close")
    .sort((first, second) => first.entityId.localeCompare(second.entityId))) {
    const door = entities[proposal.entityId];
    if (!door || door.kind !== "door" || opened.has(door.id)) continue;
    const position = positionOf(site, door.id)!;
    const obstruction = Object.values(entities).some(
      (entity) =>
        entity.id !== door.id &&
        entity.location.kind === "ground" &&
        distance(entity.location.position, position) <= 1,
    );
    if (!obstruction) {
      entities[door.id] = { ...door, open: false };
      events.push({ siteId: site.id, entityId: door.id, kind: "closed" });
    }
  }
  return { site: { ...site, entities }, events };
}
