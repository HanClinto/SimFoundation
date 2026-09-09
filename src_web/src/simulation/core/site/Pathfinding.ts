import PF from "pathfinding";
import type { Position } from "../entity/Entity";
import type { Site } from "./Site";
import { floorAt, positionOf, traversalAt } from "./TileMap";

export function route(
  site: Site,
  origin: Position,
  destination: Position,
  actorId: string,
): readonly Position[] | null {
  if (!floorAt(site, origin) || !floorAt(site, destination)) return null;
  if (traversalAt(site, destination, actorId).kind === "blocked") return null;
  const grid = new PF.Grid(
    site.terrain.map((row, rowIndex) =>
      [...row].map((_tile, columnIndex) =>
        traversalAt(site, { x: columnIndex, y: rowIndex }, actorId).kind ===
        "blocked"
          ? 1
          : 0,
      ),
    ),
  );
  grid.setWalkableAt(origin.x, origin.y, true);
  const path = new PF.AStarFinder({ allowDiagonal: false }).findPath(
    origin.x,
    origin.y,
    destination.x,
    destination.y,
    grid,
  );
  return path.length
    ? path.slice(1).map(([column, row]) => ({ x: column!, y: row! }))
    : null;
}

export function interactionRoute(
  site: Site,
  actorId: string,
  targetId: string,
): readonly Position[] | null {
  const origin = positionOf(site, actorId);
  const target = positionOf(site, targetId);
  if (!origin || !target) return null;
  const candidates = [
    target,
    { x: target.x, y: target.y - 1 },
    { x: target.x - 1, y: target.y },
    { x: target.x + 1, y: target.y },
    { x: target.x, y: target.y + 1 },
  ];
  let best: readonly Position[] | null = null;
  for (const destination of candidates) {
    const path = route(site, origin, destination, actorId);
    if (path && (best === null || path.length < best.length)) best = path;
  }
  return best;
}
