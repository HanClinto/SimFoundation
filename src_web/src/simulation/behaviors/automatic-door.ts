import type { Door, Site } from "../model";
import type { Proposal } from "../actions/proposals";
import { distance, positionOf } from "../world/spatial";

export function tickAutomaticDoor(site: Site, door: Door): Proposal | null {
  if (
    !door.open ||
    door.policy !== "automatic" ||
    door.location.kind !== "ground"
  )
    return null;
  const origin = door.location.position;
  const obstructed = Object.values(site.entities).some((entity) => {
    if (entity.id === door.id || entity.location.kind !== "ground")
      return false;
    const position = positionOf(site, entity.id);
    return position !== null && distance(origin, position) <= 1;
  });
  return obstructed ? null : { kind: "close", entityId: door.id };
}
