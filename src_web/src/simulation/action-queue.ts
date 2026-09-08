import type { GameState } from "./state";
import type { TilePosition } from "./world";
import { sameTile, tileAt } from "./world";
import { goHere } from "./direct-control";
import { performInteraction, type PersonInteraction } from "./interactions";
import { expeditionMember, fieldState, storeFieldState } from "./expeditions";

export const ACTION_QUEUE_LIMIT = 8;
export interface ActionIntent {
  readonly sequence?: number;
  readonly mapId: string;
  readonly actorId: string;
  readonly action: Exclude<PersonInteraction, "cancel"> | "move";
  readonly targetId?: string;
  readonly destination?: TilePosition;
}
export interface QueuedAction {
  readonly intent: ActionIntent;
  readonly started: boolean;
  readonly blockedReason: string | null;
}
export interface PersonActionQueue {
  readonly nextSequence: number;
  readonly current: QueuedAction;
  readonly pending: readonly ActionIntent[];
  readonly returnToAutonomy: boolean;
}
export type ActionQueues = Readonly<Record<string, PersonActionQueue>>;
export type QueueResult = {
  readonly state: GameState;
  readonly reason: string | null;
};

export function discardActionQueue(
  state: GameState,
  actorId: string,
): GameState {
  return release(state, actorId, false);
}
export function invalidateActionQueues(state: GameState): GameState {
  for (const [actorId, queue] of Object.entries(state.actionQueues))
    if (ownership(state, queue.current.intent))
      state = release(state, actorId, false);
  return state;
}

function location(state: GameState, mapId: string) {
  return state.world.map.id === mapId
    ? state
    : state.expeditions.active?.site?.world.map.id === mapId
      ? fieldState(state)
      : null;
}
function atLocation(state: GameState, local: GameState) {
  return state.world.map.id === local.world.map.id
    ? local
    : storeFieldState(state, local);
}
function ownership(state: GameState, intent: ActionIntent): string | null {
  const local = location(state, intent.mapId);
  if (
    !local ||
    !local.world.positions[intent.actorId] ||
    !local.personnel.some((person) => person.id === intent.actorId)
  )
    return "This person is no longer on this map.";
  if (
    local === state
      ? expeditionMember(state, intent.actorId)
      : state.expeditions.active?.phase !== "field"
  )
    return "Expedition orders own this person's actions.";
  return null;
}
function release(
  state: GameState,
  actorId: string,
  restore: boolean,
): GameState {
  const queue = state.actionQueues[actorId];
  if (!queue) return state;
  const queues = { ...state.actionQueues };
  delete queues[actorId];
  const local = location(state, queue.current.intent.mapId);
  if (
    restore &&
    queue.returnToAutonomy &&
    local?.combat.responders[actorId]?.drafted
  ) {
    state = atLocation(state, {
      ...local,
      combat: {
        ...local.combat,
        responders: {
          ...local.combat.responders,
          [actorId]: {
            ...local.combat.responders[actorId]!,
            returnToAutonomy: true,
          },
        },
      },
    });
  }
  return { ...state, actionQueues: queues };
}
function execute(state: GameState, intent: ActionIntent): QueueResult {
  if (intent.action !== "move")
    return performInteraction(state, { ...intent, action: intent.action });
  const result = goHere(
    state,
    intent.mapId,
    intent.actorId,
    intent.destination!,
  );
  return {
    state: result.state,
    reason:
      result.code === "accepted"
        ? null
        : result.code === "unreachable"
          ? "No reachable route to this tile."
          : `Movement unavailable: ${result.code}.`,
  };
}
function start(state: GameState, actorId: string): GameState {
  const queue = state.actionQueues[actorId]!;
  if (queue.current.started || queue.current.blockedReason) return state;
  const intent = queue.current.intent;
  const local = location(state, intent.mapId);
  if (local?.combat.responders[actorId]?.phase === "recovering") return state;
  const result = execute(state, intent);
  if (result.reason)
    return {
      ...state,
      actionQueues: {
        ...state.actionQueues,
        [actorId]: {
          ...queue,
          current: { ...queue.current, blockedReason: result.reason },
        },
      },
    };
  const next = location(result.state, intent.mapId)!;
  const responder = next.combat.responders[actorId]!;
  state = atLocation(result.state, {
    ...next,
    combat: {
      ...next.combat,
      responders: {
        ...next.combat.responders,
        [actorId]: { ...responder, returnToAutonomy: false },
      },
    },
  });
  return {
    ...state,
    actionQueues: {
      ...state.actionQueues,
      [actorId]: {
        ...queue,
        returnToAutonomy: ["hold", "attack", "engage"].includes(intent.action)
          ? false
          : queue.returnToAutonomy,
        current: { intent, started: true, blockedReason: null },
      },
    },
  };
}
function finish(state: GameState, actorId: string): GameState {
  const queue = state.actionQueues[actorId]!;
  const [next, ...pending] = queue.pending;
  if (!next) return release(state, actorId, true);
  return start(
    {
      ...state,
      actionQueues: {
        ...state.actionQueues,
        [actorId]: {
          ...queue,
          current: { intent: next, started: false, blockedReason: null },
          pending,
        },
      },
    },
    actorId,
  );
}
export function queueEligibility(
  state: GameState,
  intent: ActionIntent,
  mode: "append" | "now" = "append",
): string | null {
  if (!["append", "now"].includes(mode)) return "Unknown queue mode.";
  const issue = ownership(state, intent);
  if (issue) return issue;
  if (
    !["move", "hold", "attack", "engage", "stabilize", "recover"].includes(
      intent.action,
    )
  )
    return "Unknown action.";
  if (
    (intent.action === "hold" || intent.action === "move") &&
    intent.targetId !== undefined
  )
    return "This action does not take a target identity.";
  if (intent.action !== "move" && intent.destination !== undefined)
    return "This action does not take a destination.";
  const local = location(state, intent.mapId)!;
  if (
    intent.action === "move" &&
    (!intent.destination ||
      !Number.isInteger(intent.destination.x) ||
      !Number.isInteger(intent.destination.y) ||
      tileAt(local.world.map, intent.destination) === null)
  )
    return "Invalid destination.";
  if (
    ["attack", "engage"].includes(intent.action) &&
    intent.targetId !== local.combat.adversary?.id
  )
    return "No adversary at this location.";
  if (
    intent.action === "stabilize" &&
    (!intent.targetId ||
      intent.targetId === intent.actorId ||
      !local.world.positions[intent.targetId])
  )
    return "Choose another person at this location.";
  if (
    intent.action === "recover" &&
    (local === state ||
      !local.objects.items.some(
        (item) =>
          `object:${item.id}` === intent.targetId &&
          ["archive-case", "anomaly-case"].includes(item.kind),
      ))
  )
    return "No recoverable field cargo at this location.";
  const queue = state.actionQueues[intent.actorId];
  if (
    mode === "append" &&
    queue &&
    queue.current.intent.action !== "hold" &&
    queue.pending.length + 1 >= ACTION_QUEUE_LIMIT
  )
    return "Action queue is full (8 actions).";
  return null;
}
export function submitAction(
  state: GameState,
  intent: ActionIntent,
  mode: "append" | "now" = "append",
): QueueResult {
  const issue = queueEligibility(state, intent, mode);
  if (issue) return { state, reason: issue };
  const actorId = intent.actorId;
  const existing = state.actionQueues[actorId];
  const sequence = existing?.nextSequence ?? 1;
  const scheduled = { ...structuredClone(intent), sequence };
  if (
    existing &&
    mode === "append" &&
    existing.current.intent.action !== "hold"
  )
    return {
      state: {
        ...state,
        actionQueues: {
          ...state.actionQueues,
          [actorId]: {
            ...existing,
            nextSequence: sequence + 1,
            pending: [...existing.pending, scheduled],
          },
        },
      },
      reason: null,
    };
  if (existing?.current.started && existing.current.intent.action !== "hold") {
    const cancelled = performInteraction(state, {
      ...existing.current.intent,
      action: "cancel",
    });
    if (cancelled.reason) return { state, reason: cancelled.reason };
    state = cancelled.state;
  }
  const responder = location(state, intent.mapId)!.combat.responders[actorId];
  const queue: PersonActionQueue = {
    nextSequence: sequence + 1,
    current: { intent: scheduled, started: false, blockedReason: null },
    pending: existing?.pending ?? [],
    returnToAutonomy:
      existing?.returnToAutonomy ??
      (!responder?.drafted || responder.returnToAutonomy === true),
  };
  const next = start(
    { ...state, actionQueues: { ...state.actionQueues, [actorId]: queue } },
    actorId,
  );
  return { state: next, reason: null };
}
export function editActionQueue(
  state: GameState,
  mapId: string,
  actorId: string,
  operation: "cancel" | "retry" | "clear" | "remove",
  index?: number,
): QueueResult {
  if (!["cancel", "retry", "clear", "remove"].includes(operation))
    return { state, reason: "Unknown queue operation." };
  const queue = state.actionQueues[actorId];
  if (!queue || queue.current.intent.mapId !== mapId)
    return { state, reason: "No action queue at this location." };
  if (operation === "clear")
    return {
      state: {
        ...state,
        actionQueues: {
          ...state.actionQueues,
          [actorId]: { ...queue, pending: [] },
        },
      },
      reason: null,
    };
  if (operation === "remove") {
    if (
      !Number.isInteger(index) ||
      !queue.pending.some((intent) => intent.sequence === index)
    )
      return { state, reason: "This pending action no longer exists." };
    return {
      state: {
        ...state,
        actionQueues: {
          ...state.actionQueues,
          [actorId]: {
            ...queue,
            pending: queue.pending.filter(
              (intent) => intent.sequence !== index,
            ),
          },
        },
      },
      reason: null,
    };
  }
  if (operation === "retry") {
    if (queue.current.started)
      return { state, reason: "The current action is already running." };
    return {
      state: start(
        {
          ...state,
          actionQueues: {
            ...state.actionQueues,
            [actorId]: {
              ...queue,
              current: { ...queue.current, blockedReason: null },
            },
          },
        },
        actorId,
      ),
      reason: null,
    };
  }
  if (queue.current.started && queue.current.intent.action !== "hold") {
    const result = performInteraction(state, {
      ...queue.current.intent,
      action: "cancel",
    });
    if (result.reason) return { state, reason: result.reason };
    state = result.state;
  }
  return { state: finish(state, actorId), reason: null };
}
export function advanceActionQueues(state: GameState): GameState {
  for (const actorId of Object.keys(state.actionQueues).sort()) {
    const queue = state.actionQueues[actorId]!;
    const { intent, started } = queue.current;
    if (ownership(state, intent)) {
      state = release(state, actorId, false);
      continue;
    }
    if (!started) {
      state = start(state, actorId);
      continue;
    }
    const local = location(state, intent.mapId)!;
    const responder = local.combat.responders[actorId];
    if (!responder?.drafted) {
      state = release(state, actorId, false);
      continue;
    }
    if (responder.incapacitated) {
      if (intent.action !== "recover")
        state = {
          ...state,
          actionQueues: {
            ...state.actionQueues,
            [actorId]: {
              ...queue,
              current: {
                ...queue.current,
                started: false,
                blockedReason:
                  "Incapacitated; stabilize this person before retrying.",
              },
            },
          },
        };
      continue;
    }
    const recovered =
      intent.action === "recover" &&
      state.expeditions.active?.recoveryOrders.some(
        (order) =>
          order.personId === actorId &&
          `object:${order.objectId}` === intent.targetId &&
          order.phase === "delivered",
      );
    const completed =
      intent.action === "move"
        ? responder.order === "hold" &&
          sameTile(local.world.positions[actorId]!, intent.destination!)
        : intent.action === "stabilize"
          ? responder.order === "hold" &&
            !!local.combat.responders[intent.targetId!]?.stabilized
          : ["attack", "engage"].includes(intent.action)
            ? local.combat.status === "neutralized"
            : recovered;
    if (completed) {
      if (responder.phase === "ready") state = finish(state, actorId);
      continue;
    }
    const matches =
      intent.action === "recover"
        ? state.expeditions.active?.recoveryOrders.some(
            (order) =>
              order.personId === actorId &&
              `object:${order.objectId}` === intent.targetId &&
              order.phase !== "delivered",
          )
        : responder.order === intent.action &&
          (intent.action === "move"
            ? !!responder.destination &&
              sameTile(responder.destination, intent.destination!)
            : intent.action === "hold" ||
              responder.targetId === intent.targetId);
    if (!matches) state = release(state, actorId, false);
  }
  return state;
}
