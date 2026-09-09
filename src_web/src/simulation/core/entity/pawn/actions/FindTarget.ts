import type { Entity } from "../../Entity";
import type { ActionContext } from "./Action";
import { distance, positionOf } from "../../../site/TileMap";
import { interactionRoute } from "../../../site/Pathfinding";

export function findTarget(
  context: ActionContext,
  accepts: (entity: Entity) => boolean,
): Entity | null {
  const { site, pawn } = context;
  const origin = positionOf(site, pawn.id);
  if (!origin) return null;
  const candidates = Object.values(site.entities).filter(accepts);
  candidates.sort((first, second) => {
    const firstPosition = positionOf(site, first.id);
    const secondPosition = positionOf(site, second.id);
    return (
      (firstPosition ? distance(origin, firstPosition) : Infinity) -
        (secondPosition ? distance(origin, secondPosition) : Infinity) ||
      (first.id < second.id ? -1 : first.id > second.id ? 1 : 0)
    );
  });
  return (
    candidates.find((entity) => {
      const path = interactionRoute(site, pawn.id, entity.id);
      return path !== null && (pawn.mobile || path.length === 0);
    }) ?? null
  );
}
