import type { GameState, SiteSimulationState } from "./state";
import type { TilePosition } from "./world";
import { draftResponder } from "./combat";
import { fieldState } from "./expeditions";
import { currentPersonAction, performInteraction } from "./interactions";

export interface AutomaticAction {
  readonly key: string;
  readonly source: "schedule" | "need" | "autonomy" | "job";
  readonly label: string;
  readonly targetId: string;
  readonly position: TilePosition;
  readonly detail: string;
}

export interface PersonCurrentAction {
  readonly key: string;
  readonly source:
    | AutomaticAction["source"]
    | "idle"
    | "waiting"
    | "tactical"
    | "mission"
    | "condition";
  readonly label: string;
  readonly targetId: string;
  readonly position?: TilePosition;
  readonly detail: string;
  readonly cancellation: "automatic" | "order" | "release" | null;
  readonly cancellationReason: string | null;
}

export function personCurrentAction(
  state: GameState,
  actorId: string,
): PersonCurrentAction | null {
  const person = state.personnel.find((entry) => entry.id === actorId);
  const position = state.world.positions[actorId];
  const mission = state.expeditions.active;
  const transit =
    mission?.team.includes(actorId) &&
    mission.site?.world.map.id === state.world.map.id &&
    ["outbound", "inbound"].includes(mission.phase);
  if (!person || (!position && !transit)) return null;
  const automatic = automaticAction(state, actorId);
  if (automatic)
    return {
      ...automatic,
      cancellation: "automatic",
      cancellationReason: null,
    };
  const responder = state.combat.responders[actorId];
  const active = state.expeditions.active;
  const enlisted = active?.team.includes(actorId);
  const base = { targetId: actorId, position };
  if (responder?.incapacitated)
    return {
      ...base,
      key: `condition:${actorId}:${responder.stabilized}`,
      source: "condition",
      label: responder.stabilized ? "Recover" : "Incapacitated",
      detail: responder.stabilized
        ? "Stabilized; recovering before movement is possible."
        : "Needs stabilization from another responder.",
      cancellation: null,
      cancellationReason: "Incapacitation cannot be cancelled.",
    };
  if (active && enlisted && active.phase !== "field") {
    const labels = {
      assembling: "Assemble",
      outbound: "Travel to site",
      regrouping: "Regroup",
      inbound: "Return to base",
    };
    return {
      ...base,
      key: `mission:${active.id}:${active.phase}:${actorId}`,
      source: "mission",
      label: labels[active.phase],
      detail:
        responder?.blockedReason ??
        (active.phase === "assembling"
          ? "Expedition assembly; waiting for dispatch when the team is ready."
          : active.phase === "regrouping"
            ? "Return to extraction with the expedition team."
            : "Expedition transit in progress."),
      cancellation: null,
      cancellationReason: "Manage this commitment in Expedition Operations.",
    };
  }
  const queue = state.actionQueues[actorId];
  if (queue && queue.current.intent.mapId === state.world.map.id) return null;
  const recovery =
    active && enlisted && active.site?.world.map.id === state.world.map.id
      ? active.recoveryOrders.find(
          (entry) => entry.personId === actorId && entry.phase !== "delivered",
        )
      : null;
  if (recovery)
    return {
      ...base,
      key: `recovery:${active!.id}:${actorId}:${recovery.objectId}`,
      source: "mission",
      label: recovery.phase === "carrying" ? "Deliver cargo" : "Recover cargo",
      targetId: `object:${recovery.objectId}`,
      detail: currentPersonAction(state, actorId),
      cancellation: "order",
      cancellationReason: null,
    };
  if (responder?.drafted) {
    const labels = {
      move: "Go Here",
      hold: "Hold Position",
      retreat: "Retreat",
      attack: "Attack",
      engage: "Engage From Here",
      stabilize: "Stabilize",
    };
    const returning = responder.order === "hold" && responder.returnToAutonomy;
    const release =
      responder.order === "hold" && responder.phase === "ready" && !returning;
    return {
      ...base,
      key: `tactical:${actorId}:${responder.order}:${responder.targetId}:${responder.destination?.x},${responder.destination?.y}:${!!returning}`,
      source: "tactical",
      label: returning
        ? "Resume routine"
        : responder.order === "hold" && responder.phase === "recovering"
          ? "Recover"
          : labels[responder.order],
      targetId:
        responder.targetId ??
        (responder.destination
          ? `tile:${responder.destination.x},${responder.destination.y}:floor`
          : actorId),
      position: responder.destination ?? position,
      detail: currentPersonAction(state, actorId),
      cancellation:
        returning || (release && enlisted)
          ? null
          : release
            ? "release"
            : "order",
      cancellationReason: returning
        ? "Routine control resumes when recovery and safety checks permit."
        : release && enlisted
          ? "Field responders remain drafted until expedition return."
          : null,
    };
  }
  const blocked = state.routines.blockedReasons[actorId];
  const carried = state.objects.items.find(
    (item) =>
      item.location.kind === "carried" && item.location.personId === actorId,
  );
  if (blocked || carried)
    return {
      ...base,
      key: `waiting:${actorId}:${carried?.id ?? blocked}`,
      source: "waiting",
      label: "Waiting",
      targetId: carried ? `object:${carried.id}` : actorId,
      detail:
        blocked ??
        "Carrying an object; waiting for its owning activity to continue.",
      cancellation: null,
      cancellationReason:
        "Resolve the blocked activity through its owning system.",
    };
  return {
    ...base,
    key: `idle:${actorId}`,
    source: "idle",
    label: "Idle",
    detail: person.activity,
    cancellation: null,
    cancellationReason: "No active action to cancel.",
  };
}

export function cancelPersonAction(
  state: GameState,
  mapId: string,
  actorId: string,
  key: string,
): { state: GameState; reason: string | null } {
  const local =
    state.world.map.id === mapId
      ? state
      : state.expeditions.active?.site?.world.map.id === mapId
        ? fieldState(state)
        : null;
  const action = local ? personCurrentAction(local, actorId) : null;
  if (!action || action.key !== key)
    return { state, reason: "This action is no longer current." };
  if (action.cancellation === "automatic")
    return cancelAutomaticAction(state, mapId, actorId, key);
  if (action.cancellation === "order")
    return performInteraction(state, { mapId, actorId, action: "cancel" });
  if (action.cancellation === "release") {
    const result = draftResponder(state, actorId, false);
    return result.code === "accepted"
      ? { state: result.state, reason: null }
      : {
          state,
          reason:
            "Release is blocked by recovery, injuries or an active encounter.",
        };
  }
  return { state, reason: action.cancellationReason };
}

export function automaticAction(
  state: SiteSimulationState,
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
  if (routine?.source === "player") return null;
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
  state: SiteSimulationState,
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
