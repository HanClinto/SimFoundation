import PF from "pathfinding";
import type { Position } from "../entity/Entity";
import type { Site } from "./Site";
import { floorAt, doorAt } from "./TileMap";

export function route(
  site: Site,
  origin: Position,
  destination: Position,
): readonly Position[] | null {
  if (!floorAt(site, origin) || !floorAt(site, destination)) return null;
  const grid = new PF.Grid(
    site.terrain.map((row, rowIndex) =>
      [...row].map((tile, columnIndex) => {
        const door = doorAt(site, { x: columnIndex, y: rowIndex });
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
  return path.length
    ? path.slice(1).map(([column, row]) => ({ x: column!, y: row! }))
    : null;
}
