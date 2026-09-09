import type { GameState, SiteSimulationState } from "./state";
import { personCurrentAction } from "./person-actions";
import { routineProgress } from "./routines";
import { findRoute, sameTile, type TilePosition } from "./world";
import { mealCollectionPoint } from "./storage";
import { fieldState } from "./expeditions";
import { expeditionScenario } from "./expedition-site";

export interface ActionTiming {
  readonly mapId: string;
  readonly key: string;
  readonly startedTick: number;
  readonly doorStep?: {
    readonly tick: number;
    readonly position: TilePosition;
  };
}

export function recordDoorOpening<State extends SiteSimulationState>(
  state: State,
  actorId: string,
  position: TilePosition,
  parentKey?: string,
): State {
  const routine = state.routines.activities[actorId];
  const responder = state.combat.responders[actorId];
  const current = state.actionQueues[actorId]?.current;
  const queue =
    current?.started && current.intent.mapId === state.world.map.id
      ? current
      : null;
  const identity = queue
    ? {
        key: `queue:${queue.intent.sequence}:${queue.intent.action}:${queue.intent.targetId ?? ""}:${queue.intent.destination?.x},${queue.intent.destination?.y}`,
        startedTick: state.actionTimings[actorId]?.startedTick,
      }
    : routine
      ? {
          key: `routine:${actorId}:${routine.startedTick}:${routine.stationId}`,
          startedTick: routine.startedTick,
        }
      : responder?.drafted
        ? {
            key: `tactical:${actorId}:${responder.order}:${responder.targetId}:${responder.destination?.x},${responder.destination?.y}:${!!(responder.order === "hold" && responder.returnToAutonomy)}`,
            startedTick: state.actionTimings[actorId]?.startedTick,
          }
        : null;
  const key = parentKey ?? identity?.key;
  if (!key) return state;
  const previous = state.actionTimings[actorId];
  const timing =
    previous?.key === key && previous.mapId === state.world.map.id
      ? previous
      : {
          key,
          mapId: state.world.map.id,
          startedTick: identity?.startedTick ?? state.tick,
        };
  return {
    ...state,
    actionTimings: {
      ...state.actionTimings,
      [actorId]: {
        ...timing,
        doorStep: { tick: state.tick, position: { ...position } },
      },
    },
  };
}
export interface ActionProgress {
  readonly kind: "duration" | "travel" | "elapsed" | "blocked";
  readonly label: string;
  readonly text: string;
  readonly detail: string;
  readonly fraction: number | null;
  readonly elapsedMinutes: number;
}

export function currentActionIdentity(
  state: GameState,
  actorId: string,
): { key: string; label: string; startedTick?: number } | null {
  const projected = personCurrentAction(state, actorId);
  if (projected)
    return {
      key: projected.key,
      label: projected.label,
      startedTick: projected.key.startsWith("routine:")
        ? state.routines.activities[actorId]?.startedTick
        : undefined,
    };
  const current = state.actionQueues[actorId]?.current;
  if (!current || current.intent.mapId !== state.world.map.id) return null;
  return {
    key: `queue:${current.intent.sequence}:${current.intent.action}:${current.intent.targetId ?? ""}:${current.intent.destination?.x},${current.intent.destination?.y}`,
    label: current.intent.action,
  };
}

export function trackActionTimes(state: GameState): GameState {
  const field = fieldState(state);
  const actionTimings: Record<string, ActionTiming> = {};
  for (const person of state.personnel) {
    const local = state.world.positions[person.id]
      ? state
      : field?.personnel.some((entry) => entry.id === person.id)
        ? field
        : state;
    const identity = currentActionIdentity(local, person.id);
    if (!identity) continue;
    const previous = state.actionTimings[person.id];
    actionTimings[person.id] =
      previous?.key === identity.key && previous.mapId === local.world.map.id
        ? previous
        : {
            mapId: local.world.map.id,
            key: identity.key,
            startedTick: identity.startedTick ?? state.tick,
          };
  }
  const unchanged =
    Object.keys(actionTimings).length ===
      Object.keys(state.actionTimings).length &&
    Object.entries(actionTimings).every(
      ([id, timing]) => state.actionTimings[id] === timing,
    );
  return unchanged ? state : { ...state, actionTimings };
}

export function actionProgress(
  state: GameState,
  actorId: string,
): ActionProgress | null {
  const identity = currentActionIdentity(state, actorId);
  if (!identity) return null;
  const timing = state.actionTimings[actorId];
  const since =
    timing?.key === identity.key && timing.mapId === state.world.map.id
      ? timing.startedTick
      : (identity.startedTick ?? state.tick);
  const elapsedMinutes = Math.max(0, state.tick - since);
  const base = { label: identity.label, elapsedMinutes };
  const routine = routineProgress(state, actorId);
  if (routine)
    return {
      ...base,
      label: routine.label,
      kind: "duration",
      fraction: routine.fraction,
      text: `~${routine.remainingMinutes} min`,
      detail: `About ${routine.remainingMinutes} in-game minutes remaining if uninterrupted / ${elapsedMinutes} in-game minutes elapsed`,
    };
  const position = state.world.positions[actorId];
  const responder = state.combat.responders[actorId];
  let destination: TilePosition | null = null;
  let travelling = false;
  if (!responder?.incapacitated && position) {
    const activity = state.routines.activities[actorId];
    const mission = state.expeditions.active;
    const recovery =
      mission?.site?.world.map.id === state.world.map.id
        ? mission.recoveryOrders.find(
            (entry) =>
              entry.personId === actorId && entry.phase !== "delivered",
          )
        : null;
    if (recovery) {
      const item = state.objects.items.find(
        (entry) => entry.id === recovery.objectId,
      );
      destination =
        recovery.phase === "carrying"
          ? expeditionScenario(mission!.noticeId).extraction
          : item?.location.kind === "ground"
            ? item.location.position
            : null;
      travelling = !destination || !sameTile(position, destination);
    } else if (activity) {
      destination =
        activity.kind === "meal" && !activity.mealConsumed
          ? mealCollectionPoint(state, position)
          : (state.routines.stations.find(
              (station) => station.id === activity.stationId,
            )?.position ?? null);
      travelling = !destination || !sameTile(position, destination);
    } else if (
      responder?.drafted &&
      (responder.order === "move" || responder.order === "retreat")
    ) {
      destination = responder.destination;
      travelling = true;
    } else if (!responder?.drafted) {
      const job = state.jobs.find(
        (entry) =>
          (entry.status === "in-progress" &&
            (entry.assignedPersonId === actorId ||
              entry.assessment?.patientId === actorId)) ||
          (entry.status === "available" &&
            entry.requiredWorkerId === actorId &&
            state.objects.items.some(
              (item) =>
                item.location.kind === "carried" &&
                item.location.personId === actorId &&
                item.reservedBy === entry.id,
            )),
      );
      destination = job?.workSite ?? null;
      travelling = !!destination && !sameTile(position, destination);
    }
  }
  if (travelling && position) {
    const route = destination
      ? findRoute(state.world.map, position, destination)
      : null;
    return route
      ? {
          ...base,
          kind: "travel",
          fraction: null,
          text: `${route.length} ${route.length === 1 ? "tile" : "tiles"} left`,
          detail: `${route.length} route tiles to the current destination; door opening can take additional time / ${elapsedMinutes} in-game minutes elapsed`,
        }
      : {
          ...base,
          kind: "blocked",
          fraction: null,
          text: "No route",
          detail: `No reachable route to the current destination / ${elapsedMinutes} in-game minutes elapsed`,
        };
  }
  return {
    ...base,
    kind: "elapsed",
    fraction: null,
    text: `${elapsedMinutes} min elapsed`,
    detail: `${elapsedMinutes} in-game minutes on this action, including time blocked or waiting; not an estimate of completion`,
  };
}
