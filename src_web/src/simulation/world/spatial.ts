import PF from "pathfinding";
import type { Door, Position, Site } from "../model";

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

export function doorAt(site: Site, position: Position): Door | undefined {
  return Object.values(site.entities).find(
    (entity): entity is Door =>
      entity.kind === "door" &&
      entity.location.kind === "ground" &&
      samePosition(entity.location.position, position),
  );
}

export function route(
  site: Site,
  origin: Position,
  destination: Position,
): readonly Position[] | null {
  if (!floorAt(site, origin) || !floorAt(site, destination)) return null;
  const grid = new PF.Grid(
    site.terrain.map((row, y) =>
      [...row].map((tile, x) => {
        const door = doorAt(site, { x, y });
        return tile !== "." ||
          (door && !door.open && door.policy === "held-closed")
          ? 1
          : 0;
      }),
    ),
  );
  const path = new PF.AStarFinder({ allowDiagonal: false }).findPath(
    origin.x,
    origin.y,
    destination.x,
    destination.y,
    grid,
  );
  return path.length ? path.slice(1).map(([x, y]) => ({ x: x!, y: y! })) : null;
}
