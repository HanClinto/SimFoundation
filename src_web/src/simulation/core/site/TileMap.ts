import type { Entity, Position } from "../entity/Entity";
import type { Door } from "../entity/Door";
import type { Site } from "./Site";
import { basicTiles, type Tile } from "./Tile";

export const samePosition = (first: Position, second: Position): boolean =>
  first.x === second.x && first.y === second.y;
export const distance = (first: Position, second: Position): number =>
  Math.abs(first.x - second.x) + Math.abs(first.y - second.y);

export function positionOf(
  site: Pick<Site, "entities">,
  entityId: string,
): Position | null {
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

export function tileAt(site: Site, position: Position): Tile | null {
  if (!Number.isInteger(position.x) || !Number.isInteger(position.y))
    return null;
  const symbol = site.terrain[position.y]?.[position.x];
  return symbol === undefined
    ? null
    : (site.tiles?.[symbol] ?? basicTiles[symbol] ?? null);
}

export function floorAt(site: Site, position: Position): boolean {
  const tile = tileAt(site, position);
  return tile !== null && !tile.blocksMovement;
}

export type Traversal =
  | { kind: "clear" }
  | { kind: "blocked"; reason: string }
  | { kind: "open-door"; door: Door };

export function groundOccupants(
  site: Site,
): ReadonlyMap<string, readonly Entity[]> {
  const occupants = new Map<string, Entity[]>();
  for (const entity of Object.values(site.entities)) {
    if (entity.location.kind !== "ground") continue;
    const position = entity.location.position;
    const key = `${position.x},${position.y}`;
    const current = occupants.get(key);
    if (current) current.push(entity);
    else occupants.set(key, [entity]);
  }
  return occupants;
}

export function traversalAt(
  site: Site,
  position: Position,
  actorId?: string,
  occupants?: ReadonlyMap<string, readonly Entity[]>,
): Traversal {
  if (!floorAt(site, position))
    return { kind: "blocked", reason: "The terrain is impassable." };
  let doorToOpen: Door | undefined;
  for (const entity of occupants
    ? (occupants.get(`${position.x},${position.y}`) ?? [])
    : Object.values(site.entities)) {
    if (
      entity.id === actorId ||
      (entity.integrity !== undefined && entity.integrity <= 0) ||
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
