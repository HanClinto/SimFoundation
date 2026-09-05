import { deriveSpaces, type SpaceMap } from "../../simulation/spaces";
import type { TileKind } from "../../simulation/world";

const projections = new WeakMap<
  readonly (TileKind | null | undefined)[],
  { width: number; height: number; result: SpaceMap }
>();

export function spaceProjection(
  width: number,
  height: number,
  tiles: readonly (TileKind | null | undefined)[],
): SpaceMap {
  const cached = projections.get(tiles);
  if (cached?.width === width && cached.height === height) return cached.result;
  const result = deriveSpaces(width, height, tiles);
  projections.set(tiles, { width, height, result });
  return result;
}
