import type { Site } from "./Site";
import type { Pawn } from "../entity/pawn/Pawn";
import { distance, positionOf } from "./TileMap";
import { operatingPhase } from "./OperatingCycle";
import { restraintFor } from "../entity/pawn/Custody";
import { directWatchers } from "../entity/pawn/Attention";
import { canSee } from "./Sight";
export { canSee } from "./Sight";

export function hostilityActive(site: Site, pawn: Pawn, tick: number): boolean {
  return (
    !pawn.response?.hostileDuring ||
    operatingPhase(site.cycle, tick).phase === pawn.response.hostileDuring
  );
}

export function visibleThreats(site: Site, observer: Pawn, tick = 0): Pawn[] {
  if (!hostilityActive(site, observer, tick)) return [];
  return Object.values(site.entities)
    .filter(
      (entity): entity is Pawn =>
        entity.kind === "pawn" &&
        entity.id !== observer.id &&
        entity.canAct &&
        !(
          entity.stillWhenWatched && directWatchers(site, entity.id).length > 0
        ) &&
        !restraintFor(site.entities, entity.id) &&
        entity.location.kind === "ground" &&
        !!entity.response &&
        hostilityActive(site, entity, tick) &&
        !!observer.response?.hostileTo.includes(entity.response.faction) &&
        canSee(site, observer, entity.id),
    )
    .sort((first, second) => {
      const origin = positionOf(site, observer.id)!;
      return (
        distance(origin, positionOf(site, first.id)!) -
          distance(origin, positionOf(site, second.id)!) ||
        (first.id < second.id ? -1 : first.id > second.id ? 1 : 0)
      );
    });
}
