import type { GameState } from "../../simulation_legacy/state";
import type { PhysicalObject } from "../../simulation_legacy/objects";
import { sameTile, type TilePosition } from "../../simulation_legacy/world";
import type { MapPerspective } from "./map-settings";
import type { PawnPose } from "./pawn-art";

export interface PawnVisual {
  readonly position: TilePosition;
  readonly pose: PawnPose;
  readonly facing: "left" | "right";
  readonly bob: number;
  readonly cargo: PhysicalObject | null;
}

export function physicalPawnPose(
  state: GameState,
  id: string,
  perspective: MapPerspective,
): PawnPose {
  if (perspective === "recorded") {
    if (!state.observations.visibleEntityIds.includes(id)) return "stand";
    const activity = state.observations.entities[id]?.activity;
    return activity?.startsWith("Incapacitated:") ||
      activity?.startsWith("Stabilized:") ||
      activity === "Sleeping"
      ? "sleep"
      : activity === "Eating a meal" ||
          activity === "Taking a restorative break"
        ? "sit"
        : activity?.startsWith("Working:")
          ? "work"
          : "stand";
  }
  const responder = state.combat.responders[id];
  if (responder?.incapacitated) return "sleep";
  if (responder?.drafted && responder.phase === "preparing") return "work";
  const position = state.world.positions[id];
  const routine = state.routines.activities[id];
  const station = state.routines.stations.find(
    (station) => station.id === routine?.stationId,
  );
  if (position && routine && station && sameTile(position, station.position))
    return routine.kind === "sleep" ? "sleep" : "sit";
  const job = state.jobs.find(
    (job) => job.assignedPersonId === id && job.status === "in-progress",
  );
  return position && job && sameTile(position, job.workSite) ? "work" : "stand";
}

export function createPawnVisuals() {
  let previousTick = -1;
  let previousPerspective: MapPerspective | null = null;
  let previousTime = 0;
  let tracks = new Map<
    string,
    {
      from: TilePosition;
      to: TilePosition;
      started: number;
      facing: "left" | "right";
      visible: boolean;
    }
  >();
  return (
    state: GameState,
    perspective: MapPerspective,
    time: number,
    running: boolean,
    reducedMotion = false,
  ): Readonly<Record<string, PawnVisual>> => {
    const recorded = perspective === "recorded";
    const positions = recorded
      ? Object.fromEntries(
          Object.entries(state.observations.entities).map(
            ([id, observation]) => [id, observation.position],
          ),
        )
      : state.world.positions;
    const reset =
      previousPerspective !== perspective ||
      state.tick < previousTick ||
      state.tick > previousTick + 1 ||
      time < previousTime;
    const items = recorded
      ? Object.values(state.observations.objects).map(({ object }) => object)
      : state.objects.items;
    const nextTracks: typeof tracks = new Map();
    const result: Record<string, PawnVisual> = {};
    for (const [id, position] of Object.entries(positions)) {
      const visible =
        !recorded || state.observations.visibleEntityIds.includes(id);
      const previous = reset ? undefined : tracks.get(id);
      const changed = previous && !sameTile(previous.to, position);
      const distance = previous
        ? Math.abs(position.x - previous.to.x) +
          Math.abs(position.y - previous.to.y)
        : 0;
      const adjacent =
        changed &&
        distance === 1 &&
        state.tick === previousTick + 1 &&
        visible &&
        previous.visible &&
        running &&
        !reducedMotion;
      const direction = previous
        ? position.x - previous.to.x - (position.y - previous.to.y)
        : 0;
      const track =
        !previous ||
        changed ||
        !visible ||
        previous.visible !== visible ||
        reducedMotion
          ? {
              from: adjacent ? previous.to : position,
              to: position,
              started: time,
              facing: (direction < 0
                ? "left"
                : direction > 0
                  ? "right"
                  : (previous?.facing ?? "right")) as "left" | "right",
              visible,
            }
          : previous;
      nextTracks.set(id, track);
      const fraction = Math.max(0, Math.min(1, (time - track.started) / 400));
      const moving = fraction < 1 && !sameTile(track.from, track.to);
      const cargo = visible
        ? (items.find(
            (item) =>
              item.location.kind === "carried" && item.location.personId === id,
          ) ?? null)
        : null;
      const leftStep = Math.floor(time / 120) % 2 === 1;
      const pose = cargo
        ? moving
          ? leftStep
            ? "carry-left"
            : "carry-right"
          : "carry"
        : moving
          ? leftStep
            ? "walk-left"
            : "walk-right"
          : physicalPawnPose(state, id, perspective);
      result[id] = {
        position: {
          x: track.from.x + (track.to.x - track.from.x) * fraction,
          y: track.from.y + (track.to.y - track.from.y) * fraction,
        },
        pose,
        facing: track.facing,
        bob: reducedMotion
          ? 0
          : moving
            ? Math.abs(Math.sin(time / 65)) * 1.5
            : pose === "work"
              ? Math.sin(time / 150) * 1.2
              : 0,
        cargo,
      };
    }
    tracks = nextTracks;
    previousTick = state.tick;
    previousPerspective = perspective;
    previousTime = time;
    return result;
  };
}
