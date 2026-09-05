import type { SiteMap, TileKind, TilePosition } from "./world";

export const MATERIALS = {
  concrete: {
    name: "Concrete",
    corrosionResistance: 1,
    impactResistance: 9,
    cost: 2,
    color: "#c3c9c4",
  },
  steel: {
    name: "Steel",
    corrosionResistance: 5,
    impactResistance: 8,
    cost: 4,
    color: "#82a9be",
  },
  ceramic: {
    name: "Ceramic",
    corrosionResistance: 9,
    impactResistance: 2,
    cost: 3,
    color: "#ded9b7",
  },
  composite: {
    name: "Composite",
    corrosionResistance: 7,
    impactResistance: 7,
    cost: 6,
    color: "#9bc7ac",
  },
} as const;
export type MaterialId = keyof typeof MATERIALS;
export type SurfaceLayer = "floor" | "structure";
export interface Surface {
  readonly kind: "floor" | "wall" | "door" | "closed-door";
  readonly material: MaterialId;
  readonly integrity: number;
}
export interface TileSurfaces {
  readonly floor: Surface | null;
  readonly structure: Surface | null;
}

export function surfacesForTile(tile: TileKind): TileSurfaces {
  return {
    floor:
      tile === "grass"
        ? null
        : { kind: "floor", material: "concrete", integrity: 100 },
    structure:
      tile === "wall" || tile === "door" || tile === "closed-door"
        ? {
            kind: tile,
            material: tile === "wall" ? "concrete" : "steel",
            integrity: 100,
          }
        : null,
  };
}

export function surfaceTile(cell: TileSurfaces): TileKind {
  if (cell.structure && cell.structure.integrity > 0)
    return cell.structure.kind;
  return cell.floor && cell.floor.integrity > 0 ? "floor" : "grass";
}

export function surfaceAt(
  map: SiteMap,
  position: TilePosition,
  layer: SurfaceLayer,
): Surface | null {
  if (
    !Number.isInteger(position.x) ||
    !Number.isInteger(position.y) ||
    position.x < 0 ||
    position.y < 0 ||
    position.x >= map.width ||
    position.y >= map.height
  )
    return null;
  return map.surfaces[position.y * map.width + position.x]?.[layer] ?? null;
}

export function replaceSurface(
  map: SiteMap,
  position: TilePosition,
  layer: SurfaceLayer,
  surface: Surface,
): SiteMap {
  if (!surfaceAt(map, position, layer)) return map;
  const index = position.y * map.width + position.x;
  const cell = { ...map.surfaces[index]!, [layer]: surface };
  const tiles = [...map.tiles];
  tiles[index] = surfaceTile(cell);
  return { ...map, tiles, surfaces: { ...map.surfaces, [index]: cell } };
}

export function damageSurface(
  map: SiteMap,
  position: TilePosition,
  layer: SurfaceLayer,
  kind: "corrosion" | "impact",
  dose: number,
): SiteMap {
  return damageSurfaces(map, [{ position, layer, kind, dose }]);
}

export interface SurfaceDamage {
  readonly position: TilePosition;
  readonly layer: SurfaceLayer;
  readonly kind: "corrosion" | "impact";
  readonly dose: number;
}
export function damageSurfaces(
  map: SiteMap,
  damage: readonly SurfaceDamage[],
): SiteMap {
  let surfaces: Record<number, TileSurfaces> | null = null;
  let tiles: TileKind[] | null = null;
  for (const { position, layer, kind, dose } of damage) {
    if (!surfaceAt(map, position, layer) || !Number.isFinite(dose) || dose <= 0)
      continue;
    const index = position.y * map.width + position.x;
    const cell = (surfaces ?? map.surfaces)[index]!;
    const surface = cell[layer]!;
    const material = MATERIALS[surface.material];
    const resistance =
      kind === "corrosion"
        ? material.corrosionResistance
        : material.impactResistance;
    const integrity = Math.max(
      0,
      Math.round((surface.integrity - (dose * (10 - resistance)) / 10) * 100) /
        100,
    );
    if (integrity === surface.integrity) continue;
    surfaces ??= { ...map.surfaces };
    tiles ??= [...map.tiles];
    surfaces[index] = { ...cell, [layer]: { ...surface, integrity } };
    tiles[index] = surfaceTile(surfaces[index]!);
  }
  return surfaces && tiles ? { ...map, surfaces, tiles } : map;
}
