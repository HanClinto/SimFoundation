import type { EntityBase } from "./Entity";
import type { Site } from "../site/Site";
import type { TickEvent } from "../Simulation";
import { distance, positionOf } from "../site/TileMap";

export interface Door extends EntityBase {
  kind: "door";
  open: boolean;
  policy: "automatic" | "held-open" | "held-closed";
}

export function openDoor(site: Site, door: Door, events: TickEvent[]): boolean {
  if (door.open) return true;
  if (door.policy !== "automatic") return false;
  door.open = true;
  events.push({ siteId: site.id, entityId: door.id, kind: "opened" });
  return true;
}

export function tickDoor(site: Site, door: Door, events: TickEvent[]): void {
  if (!door.open || door.policy !== "automatic") return;
  const position = positionOf(site, door.id);
  if (!position) return;
  const obstructed = Object.values(site.entities).some(
    (entity) =>
      entity.id !== door.id &&
      entity.location.kind === "ground" &&
      distance(entity.location.position, position) <= 1,
  );
  if (!obstructed) {
    door.open = false;
    events.push({ siteId: site.id, entityId: door.id, kind: "closed" });
  }
}
