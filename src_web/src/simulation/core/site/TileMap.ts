import type { Position } from "../entity/Entity";
import type { Door } from "../entity/Door";
import type { Site } from "./Site";

export const samePosition = (first: Position, second: Position): boolean =>
  first.x === second.x && first.y === second.y;
export const distance = (first: Position, second: Position): number =>
  Math.abs(first.x - second.x) + Math.abs(first.y - second.y);

export function positionOf(site: Site, entityId: string): Position | null {
  const visited = new Set<string>();
  let entity = site.entities[entityId];
  while (entity) {
    if (visited.has(entity.id)) return null;
    visited.add(entity.id);
    if (entity.location.kind === "ground") return entity.location.position;
    entity = site.entities[entity.location.carrierId];
  }
  return null;
}

export function floorAt(site: Site, position: Position): boolean {
  return (
    Number.isInteger(position.x) &&
    Number.isInteger(position.y) &&
    site.terrain[position.y]?.[position.x] === "."
  );
}

export type Traversal =
  | { kind: "clear" }
  | { kind: "blocked"; reason: string }
  | { kind: "open-door"; door: Door };

export function traversalAt(
  site: Site,
  position: Position,
  actorId?: string,
): Traversal {
  if (!floorAt(site, position))
    return { kind: "blocked", reason: "The terrain is impassable." };
  let doorToOpen: Door | undefined;
  for (const entity of Object.values(site.entities)) {
    if (
      entity.id === actorId ||
      entity.location.kind !== "ground" ||
      !samePosition(entity.location.position, position)
    )
      continue;
    if (entity.kind === "door") {
      if (entity.open) continue;
      if (entity.policy === "automatic") {
        doorToOpen = entity;
        continue;
      }
      return { kind: "blocked", reason: "The door is closed." };
    }
    if (entity.blocksMovement)
      return { kind: "blocked", reason: "The destination is occupied." };
  }
  return doorToOpen
    ? { kind: "open-door", door: doorToOpen }
    : { kind: "clear" };
}
