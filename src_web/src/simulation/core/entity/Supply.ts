import type { Position } from "./Entity";
import type { Item } from "./Item";
import type { Site } from "../site/Site";
import { distance } from "../site/TileMap";

export function findSupply(
  site: Site,
  definitionId: string,
  amount: number,
  position: Position,
  range: number,
  carrierId?: string,
  excludedIds: readonly string[] = [],
): Item | undefined {
  return Object.values(site.entities)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .find(
      (entity): entity is Item =>
        entity.kind === "item" &&
        !excludedIds.includes(entity.id) &&
        entity.definitionId === definitionId &&
        entity.amount >= amount &&
        (entity.integrity ?? 100) > 0 &&
        (entity.location.kind === "ground"
          ? distance(entity.location.position, position) <= range
          : carrierId !== undefined && entity.location.carrierId === carrierId),
    );
}
