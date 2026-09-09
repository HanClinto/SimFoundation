import type { GameState } from "./state";
import { goHere } from "./direct-control";
import { performInteraction } from "./interactions";
import { expeditionMember, fieldState, storeFieldState } from "./expeditions";
import {
  createActionQueueExecutor,
  type ActionIntent,
} from "./action-queue-core";
export { ACTION_QUEUE_LIMIT } from "./action-queue-core";
export type {
  ActionIntent,
  QueuedAction,
  PersonActionQueue,
  ActionQueues,
} from "./action-queue-core";
export type QueueResult = {
  readonly state: GameState;
  readonly reason: string | null;
};
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
export const {
  discardActionQueue,
  invalidateActionQueues,
  queueEligibility,
  submitAction,
  editActionQueue,
  advanceActionQueues,
} = createActionQueueExecutor<GameState>({
  location,
  atLocation,
  ownership,
  execute,
  interact: performInteraction,
  personalRoutines: (state, local) => state === local,
  recoverable: (state, local) => state !== local,
  recovery: (state, actorId, targetId) => {
    const order = state.expeditions.active?.recoveryOrders.find(
      (entry) =>
        entry.personId === actorId && `object:${entry.objectId}` === targetId,
    );
    return order
      ? order.phase === "delivered"
        ? "delivered"
        : "active"
      : null;
  },
});
