import type { ControllerSnapshot } from "../../application/controller";
import { createScp999State } from "../../simulation/scp-999";

const projections = new WeakMap<ControllerSnapshot, ControllerSnapshot>();

export function observedSnapshot(
  snapshot: ControllerSnapshot,
): ControllerSnapshot {
  const existing = projections.get(snapshot);
  if (existing) return existing;
  const knowledge = snapshot.game.observations;
  const visible = new Set(knowledge.visibleEntityIds);
  const projected: ControllerSnapshot = {
    ...snapshot,
    game: {
      ...snapshot.game,
      personnel: snapshot.game.personnel.map((person) => {
        const observation = knowledge.entities[person.id];
        return {
          ...person,
          activity: !observation
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
          rooms: knowledge.knownRooms,
        },
      },
      scp999: knowledge.scp999?.state ?? createScp999State(),
      routines: {
        ...snapshot.game.routines,
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
