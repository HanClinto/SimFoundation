import type { ControllerSnapshot } from "../../application/controller";
import { objectBlocks, objectStations } from "../../simulation_legacy/objects";
import { awayPersonnel } from "../../simulation_legacy/expeditions";

const projections = new WeakMap<ControllerSnapshot, ControllerSnapshot>();

export function observedSnapshot(
  snapshot: ControllerSnapshot,
): ControllerSnapshot {
  const existing = projections.get(snapshot);
  if (existing) return existing;
  const knowledge = snapshot.game.observations;
  const visible = new Set(knowledge.visibleEntityIds);
  const away =
    snapshot.game.world.map.id ===
    snapshot.game.expeditions.active?.site?.world.map.id
      ? []
      : awayPersonnel(snapshot.game);
  const objects = {
    ...snapshot.game.objects,
    items: Object.values(knowledge.objects).map(
      (observation) => observation.object,
    ),
  };
  const projected: ControllerSnapshot = {
    ...snapshot,
    game: {
      ...snapshot.game,
      combat: {
        ...snapshot.game.combat,
        responders: {},
        adversary: snapshot.game.combat.sighting?.adversary ?? null,
        events: [],
        status: snapshot.game.combat.sighting
          ? snapshot.game.combat.sighting.adversary.health <= 0
            ? "neutralized"
            : "active"
          : "idle",
      },
      objects,
      personnel: snapshot.game.personnel.map((person) => {
        const observation = knowledge.entities[person.id];
        return {
          ...person,
          activity: away.includes(person.id)
            ? "Away on expedition"
            : !observation
              ? "No recorded observation"
              : visible.has(person.id)
                ? observation.activity
                : `Last observed ${snapshot.game.tick - observation.observedTick} minutes ago: ${observation.activity}`,
        };
      }),
      world: {
        ...snapshot.game.world,
        positions: Object.fromEntries(
          Object.entries(knowledge.entities).map(([id, observation]) => [
            id,
            observation.position,
          ]),
        ),
        map: {
          ...snapshot.game.world.map,
          tiles: knowledge.knownTiles.map((tile) => tile ?? "grass"),
          surfaces: knowledge.knownSurfaces,
          objectBlocks: objectBlocks(objects, snapshot.game.world.map.width),
          rooms: knowledge.knownRooms,
        },
      },
      entities: Object.values(knowledge.entityStates).map(
        (observation) => observation.state,
      ),
      routines: {
        ...snapshot.game.routines,
        stations: [
          ...objectStations(objects),
          ...snapshot.game.routines.stations.filter((station) =>
            objects.items.some(
              (item) =>
                item.id === station.id &&
                item.installed &&
                item.reservedBy &&
                item.condition > 0,
            ),
          ),
        ],
        blockedReasons: Object.fromEntries(
          Object.entries(knowledge.entities).flatMap(([id, observation]) =>
            observation.blockedReason ? [[id, observation.blockedReason]] : [],
          ),
        ),
      },
    },
  };
  projections.set(snapshot, projected);
  projections.set(projected, projected);
  return projected;
}
