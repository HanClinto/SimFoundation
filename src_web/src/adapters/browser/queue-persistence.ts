import type { GameState } from "../../simulation/state";
import {
  ACTION_QUEUE_LIMIT,
  type ActionIntent,
} from "../../simulation/action-queue";
import { fieldState, expeditionMember } from "../../simulation/expeditions";
import { tileAt, sameTile } from "../../simulation/world";
import {
  isPersonalRoutineAction,
  PERSONAL_ROUTINE_KINDS,
} from "../../simulation/routines";

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export function actionQueuesValid(state: GameState): boolean {
  if (
    !record(state.actionQueues) ||
    Object.keys(state.actionQueues).length > state.personnel.length
  )
    return false;
  for (const [actorId, queue] of Object.entries(state.actionQueues)) {
    if (
      !record(queue) ||
      !record(queue.current) ||
      typeof queue.current.started !== "boolean" ||
      (queue.current.blockedReason !== null &&
        typeof queue.current.blockedReason !== "string") ||
      typeof queue.returnToAutonomy !== "boolean" ||
      !Array.isArray(queue.pending) ||
      queue.pending.length >= ACTION_QUEUE_LIMIT ||
      !state.personnel.some((person) => person.id === actorId)
    )
      return false;
    if (queue.current.started && queue.current.blockedReason !== null)
      return false;
    if (
      queue.current.waitingFor !== undefined &&
      (typeof queue.current.waitingFor !== "string" ||
        !/^(routine|job):/.test(queue.current.waitingFor) ||
        queue.current.started ||
        queue.current.blockedReason !== null)
    )
      return false;
    if (!Number.isSafeInteger(queue.nextSequence) || queue.nextSequence < 2)
      return false;
    const valid = (value: unknown): value is ActionIntent => {
      if (
        !record(value) ||
        value.actorId !== actorId ||
        typeof value.mapId !== "string" ||
        ![
          "move",
          "hold",
          "attack",
          "engage",
          "stabilize",
          "recover",
          "eat",
          "sleep",
          "relax",
        ].includes(value.action as string)
      )
        return false;
      if (
        !Number.isSafeInteger(value.sequence) ||
        (value.sequence as number) < 1 ||
        (value.sequence as number) >= queue.nextSequence
      )
        return false;
      const local =
        state.world.map.id === value.mapId
          ? state
          : state.expeditions.active?.site?.world.map.id === value.mapId
            ? fieldState(state)
            : null;
      if (!local || !local.world.positions[actorId]) return false;
      if (
        isPersonalRoutineAction(value.action as string) &&
        (local !== state ||
          !local.objects.items.some(
            (item) =>
              `object:${item.id}` === value.targetId &&
              item.kind ===
                (value.action === "eat"
                  ? "meal-seat"
                  : value.action === "sleep"
                    ? "bed"
                    : "break-seat"),
          ))
      )
        return false;
      if (
        local === state
          ? expeditionMember(state, actorId)
          : state.expeditions.active?.phase !== "field"
      )
        return false;
      if (value.action === "move") {
        if (
          !record(value.destination) ||
          !Number.isInteger(value.destination.x) ||
          !Number.isInteger(value.destination.y) ||
          tileAt(
            local.world.map,
            value.destination as unknown as { x: number; y: number },
          ) === null ||
          value.targetId !== undefined
        )
          return false;
      } else if (value.destination !== undefined) return false;
      if (
        ["attack", "engage"].includes(value.action as string) &&
        value.targetId !== "SCP-049-2"
      )
        return false;
      if (value.action === "hold" && value.targetId !== undefined) return false;
      if (
        value.action === "stabilize" &&
        (value.targetId === actorId ||
          !local.personnel.some((person) => person.id === value.targetId))
      )
        return false;
      if (
        value.action === "recover" &&
        (local === state ||
          typeof value.targetId !== "string" ||
          !value.targetId.startsWith("object:"))
      )
        return false;
      return true;
    };
    if (
      !valid(queue.current.intent) ||
      !queue.pending.every(valid) ||
      queue.pending.some(
        (intent) => intent.mapId !== queue.current.intent.mapId,
      )
    )
      return false;
    if (
      new Set([
        queue.current.intent.sequence,
        ...queue.pending.map((intent) => intent.sequence),
      ]).size !==
      queue.pending.length + 1
    )
      return false;
    const local =
      state.world.map.id === queue.current.intent.mapId
        ? state
        : fieldState(state)!;
    if (
      queue.current.started &&
      (!local.combat.responders[actorId]?.drafted ||
        local.combat.responders[actorId]?.returnToAutonomy)
    )
      return false;
    if (queue.current.started) {
      const intent = queue.current.intent;
      const responder = local.combat.responders[actorId]!;
      if (isPersonalRoutineAction(intent.action)) {
        const routine = local.routines.activities[actorId];
        if (
          !routine ||
          routine.source !== "player" ||
          routine.kind !== PERSONAL_ROUTINE_KINDS[intent.action] ||
          `object:${routine.stationId}` !== intent.targetId ||
          responder.order !== "hold"
        )
          return false;
        continue;
      }
      const matches =
        intent.action === "recover"
          ? state.expeditions.active?.recoveryOrders.some(
              (order) =>
                order.personId === actorId &&
                `object:${order.objectId}` === intent.targetId,
            )
          : intent.action === "move"
            ? (responder.order === "move" &&
                !!responder.destination &&
                sameTile(responder.destination, intent.destination!)) ||
              (responder.order === "hold" &&
                sameTile(local.world.positions[actorId]!, intent.destination!))
            : intent.action === "stabilize"
              ? (responder.order === "stabilize" &&
                  responder.targetId === intent.targetId) ||
                (responder.order === "hold" &&
                  !!local.combat.responders[intent.targetId!]?.stabilized)
              : intent.action === "hold"
                ? responder.order === "hold"
                : (responder.order === intent.action &&
                    responder.targetId === intent.targetId) ||
                  (responder.order === "hold" &&
                    local.combat.status === "neutralized");
      if (!matches) return false;
    }
  }
  return true;
}
