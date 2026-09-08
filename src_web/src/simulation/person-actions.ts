import type { GameState } from "./state";
import type { TilePosition } from "./world";
import { draftResponder } from "./combat";

export interface AutomaticAction {
  readonly key: string;
  readonly source: "schedule" | "need" | "autonomy" | "job";
  readonly label: string;
  readonly targetId: string;
  readonly position: TilePosition;
  readonly detail: string;
}

export function automaticAction(
  state: GameState,
  actorId: string,
): AutomaticAction | null {
  const person = state.personnel.find((entry) => entry.id === actorId);
  if (
    !person ||
    !state.world.positions[actorId] ||
    state.combat.responders[actorId]?.drafted
  )
    return null;
  const routine = state.routines.activities[actorId];
  if (routine) {
    const station = state.routines.stations.find(
      (entry) => entry.id === routine.stationId,
    );
    if (!station) return null;
    return {
      key: `routine:${actorId}:${routine.startedTick}:${routine.stationId}`,
      source: routine.source ?? (routine.kind === "meal" ? "need" : "autonomy"),
      label:
        routine.kind === "meal"
          ? "Eat"
          : routine.kind === "sleep"
            ? "Sleep"
            : "Relax",
      targetId: `object:${routine.stationId}`,
      position: station.position,
      detail: person.activity,
    };
  }
  const carried = state.objects.items.find(
    (item) =>
      item.location.kind === "carried" && item.location.personId === actorId,
  );
  const job = state.jobs.find(
    (entry) =>
      (entry.status === "in-progress" &&
        (entry.assignedPersonId === actorId ||
          entry.assessment?.patientId === actorId)) ||
      (entry.status === "available" &&
        entry.requiredWorkerId === actorId &&
        carried?.reservedBy === entry.id),
  );
  if (!job) return null;
  return {
    key: `job:${job.id}:${actorId}`,
    source: "job",
    label:
      job.assessment?.patientId === actorId ? "Attend appointment" : "Work",
    targetId: `tile:${job.workSite.x},${job.workSite.y}:floor`,
    position: job.workSite,
    detail: `${job.title} / ${person.activity}`,
  };
}

export function manualActionWaiting(
  state: GameState,
  actorId: string,
): boolean {
  return (
    !!state.actionQueues[actorId] &&
    !state.actionQueues[actorId]!.current.started
  );
}

export function cancelAutomaticAction(
  state: GameState,
  mapId: string,
  actorId: string,
  key: string,
): { state: GameState; reason: string | null } {
  if (
    mapId !== state.world.map.id ||
    automaticAction(state, actorId)?.key !== key
  )
    return { state, reason: "This automatic action is no longer current." };
  const result = draftResponder(state, actorId, true);
  if (result.code !== "accepted")
    return {
      state,
      reason: "Finish the protected delivery or clinical appointment first.",
    };
  return {
    reason: null,
    state: {
      ...result.state,
      combat: {
        ...result.state.combat,
        responders: {
          ...result.state.combat.responders,
          [actorId]: {
            ...result.state.combat.responders[actorId]!,
            returnToAutonomy: true,
          },
        },
      },
    },
  };
}
