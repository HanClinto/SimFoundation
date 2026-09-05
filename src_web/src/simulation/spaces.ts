import type { TileKind } from "./world";

export interface PhysicalSpace {
  readonly id: number;
  readonly tiles: readonly number[];
  readonly floorTiles: number;
  readonly reachesEdge: boolean;
  readonly touchesUnknown: boolean;
}

export interface SpaceMap {
  readonly spaceByTile: readonly (number | null)[];
  readonly spaces: readonly PhysicalSpace[];
}

export function blocksSpace(tile: TileKind | null | undefined): boolean {
  return tile === "wall" || tile === "closed-door";
}

export function deriveSpaces(
  width: number,
  height: number,
  tiles: readonly (TileKind | null | undefined)[],
): SpaceMap {
  const spaceByTile: (number | null)[] = Array.from(
    { length: width * height },
    () => null,
  );
  const spaces: PhysicalSpace[] = [];
  for (let start = 0; start < spaceByTile.length; start += 1) {
    if (
      spaceByTile[start] !== null ||
      tiles[start] == null ||
      blocksSpace(tiles[start])
    )
      continue;
    const id = spaces.length;
    const reached = [start];
    spaceByTile[start] = id;
    let floorTiles = 0;
    let reachesEdge = false;
    let touchesUnknown = false;
    for (let cursor = 0; cursor < reached.length; cursor += 1) {
      const index = reached[cursor]!;
      const column = index % width;
      const row = Math.floor(index / width);
      floorTiles += Number(tiles[index] === "floor" || tiles[index] === "door");
      reachesEdge ||=
        column === 0 || row === 0 || column === width - 1 || row === height - 1;
      const adjacent = [
        ...(column > 0 ? [index - 1] : []),
        ...(column < width - 1 ? [index + 1] : []),
        ...(row > 0 ? [index - width] : []),
        ...(row < height - 1 ? [index + width] : []),
      ];
      for (const neighbor of adjacent) {
        if (tiles[neighbor] == null) {
          touchesUnknown = true;
          continue;
        }
        if (spaceByTile[neighbor] !== null || blocksSpace(tiles[neighbor]))
          continue;
        spaceByTile[neighbor] = id;
        reached.push(neighbor);
      }
    }
    spaces.push({
      id,
      tiles: reached,
      floorTiles,
      reachesEdge,
      touchesUnknown,
    });
  }
  return { spaceByTile, spaces };
}

export function spaceBoundary(
  space: PhysicalSpace,
): "Open to map edge" | "Boundary unknown" | "Enclosed" {
  return space.reachesEdge
    ? "Open to map edge"
    : space.touchesUnknown
      ? "Boundary unknown"
      : "Enclosed";
}
