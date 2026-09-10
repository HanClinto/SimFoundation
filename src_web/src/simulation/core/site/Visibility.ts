import PF from "pathfinding";
import type { Site } from "./Site";
import type { Pawn } from "../entity/pawn/Pawn";
import { distance, tileAt, positionOf, samePosition } from "./TileMap";
import type { Position } from "../entity/Entity";
import { operatingPhase } from "./OperatingCycle";
import { restraintFor } from "../entity/pawn/Custody";

function transparent(
  site: Site,
  position: Position,
  observerId: string,
  targetId: string,
): boolean {
  const tile = tileAt(site, position);
  return (
    tile !== null &&
    !tile.blocksSight &&
    !Object.values(site.entities).some(
      (entity) =>
        entity.id !== observerId &&
        entity.id !== targetId &&
        entity.blocksSight &&
        (entity.integrity === undefined || entity.integrity > 0) &&
        (entity.kind !== "door" || !entity.open) &&
        entity.location.kind === "ground" &&
        samePosition(entity.location.position, position),
    )
  );
}

export function canSee(site: Site, observer: Pawn, targetId: string): boolean {
  const origin = positionOf(site, observer.id);
  const target = positionOf(site, targetId);
  if (
    !origin ||
    !target ||
    !observer.response ||
    distance(origin, target) > observer.response.sight
  )
    return false;
  const line = PF.Util.expandPath([
    [origin.x, origin.y],
    [target.x, target.y],
  ]);
  let previous = origin;
  for (const [column, row] of line) {
    const point = { x: column!, y: row! };
    if (!transparent(site, point, observer.id, targetId)) return false;
    if (
      previous.x !== point.x &&
      previous.y !== point.y &&
      (!transparent(
        site,
        { x: previous.x, y: point.y },
        observer.id,
        targetId,
      ) ||
        !transparent(
          site,
          { x: point.x, y: previous.y },
          observer.id,
          targetId,
        ))
    )
      return false;
    previous = point;
  }
  return true;
}

export function hostilityActive(site: Site, pawn: Pawn, tick: number): boolean {
  return (
    !pawn.response?.hostileDuring ||
    operatingPhase(site.cycle, tick).phase === pawn.response.hostileDuring
  );
}

export function visibleThreats(site: Site, observer: Pawn, tick = 0): Pawn[] {
  if (!hostilityActive(site, observer, tick)) return [];
  return Object.values(site.entities)
    .filter(
      (entity): entity is Pawn =>
        entity.kind === "pawn" &&
        entity.id !== observer.id &&
        entity.canAct &&
        !restraintFor(site.entities, entity.id) &&
        entity.location.kind === "ground" &&
        !!entity.response &&
        hostilityActive(site, entity, tick) &&
        !!observer.response?.hostileTo.includes(entity.response.faction) &&
        canSee(site, observer, entity.id),
    )
    .sort((first, second) => {
      const origin = positionOf(site, observer.id)!;
      return (
        distance(origin, positionOf(site, first.id)!) -
          distance(origin, positionOf(site, second.id)!) ||
        (first.id < second.id ? -1 : first.id > second.id ? 1 : 0)
      );
    });
}
