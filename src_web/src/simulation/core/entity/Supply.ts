import type { Position } from "./Entity";
import type { Item } from "./Item";
import type { Site } from "../site/Site";
import { distance } from "../site/TileMap";

function matchingSupplies(
  site: Site,
  definitionId: string,
  position: Position,
  range: number,
  carrierId?: string,
  excludedIds: readonly string[] = [],
): Item[] {
  return Object.values(site.entities)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .filter(
      (entity): entity is Item =>
        entity.kind === "item" &&
        !excludedIds.includes(entity.id) &&
        entity.definitionId === definitionId &&
        (entity.integrity ?? 100) > 0 &&
        (entity.location.kind === "ground"
          ? distance(entity.location.position, position) <= range
          : carrierId !== undefined && entity.location.carrierId === carrierId),
    );
}

export function findSupply(
  site: Site,
  definitionId: string,
  amount: number,
  position: Position,
  range: number,
  carrierId?: string,
  excludedIds: readonly string[] = [],
): Item | undefined {
  return matchingSupplies(
    site,
    definitionId,
    position,
    range,
    carrierId,
    excludedIds,
  ).find((entity) => entity.amount >= amount);
}

export function findSupplyPortions(
  site: Site,
  definitionId: string,
  amount: number,
  position: Position,
  range: number,
  carrierId?: string,
): { source: Item; amount: number }[] | undefined {
  const portions: { source: Item; amount: number }[] = [];
  let remaining = amount;
  for (const source of matchingSupplies(
    site,
    definitionId,
    position,
    range,
    carrierId,
  )) {
    if (source.amount <= 0) continue;
    const portion = Math.min(remaining, source.amount);
    portions.push({ source, amount: portion });
    remaining -= portion;
    if (remaining <= 0) return portions;
  }
}
