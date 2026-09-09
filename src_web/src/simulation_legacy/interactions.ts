import type { GameState } from "./state";
import {
  performSiteInteraction,
  siteInteractionIssue,
} from "./site-interactions";
import {
  cancelRecovery,
  expeditionMember,
  fieldState,
  recoverExpeditionObject,
  storeFieldState,
} from "./expeditions";
import { OBJECT_DEFINITIONS } from "./objects";
import {
  isPersonalRoutineAction,
  type PersonalRoutineAction,
} from "./routines";

export type PersonInteraction =
  | PersonalRoutineAction
  | "hold"
  | "attack"
  | "engage"
  | "stabilize"
  | "recover"
  | "cancel";
export interface InteractionRequest {
  readonly mapId: string;
  readonly actorId: string;
  readonly action: PersonInteraction;
  readonly targetId?: string;
}
export interface InteractionOption {
  readonly action: PersonInteraction;
  readonly label: string;
  readonly reason: string | null;
}
export interface InteractionResult {
  readonly state: GameState;
  readonly reason: string | null;
}

export function performInteraction(
  state: GameState,
  request: InteractionRequest,
): InteractionResult {
  const { actorId, targetId, action } = request;
  const active = state.expeditions.active;
  const field = active?.site?.world.map.id === request.mapId;
  const local = field
    ? fieldState(state)
    : state.world.map.id === request.mapId
      ? state
      : null;
  const fail = (reason: string): InteractionResult => ({ state, reason });
  if (
    !local ||
    !local.world.positions[actorId] ||
    !local.personnel.some((person) => person.id === actorId)
  )
    return fail("This person is no longer on this map.");
  if (field ? active!.phase !== "field" : expeditionMember(state, actorId))
    return fail(
      "Expedition assembly, transit or regrouping owns this person's orders.",
    );
  const recovery = field
    ? active!.recoveryOrders.find(
        (order) => order.personId === actorId && order.phase !== "delivered",
      )
    : null;
  if (recovery) {
    if (action !== "cancel")
      return fail("Finish or cancel the current cargo recovery first.");
    const result = cancelRecovery(state, actorId);
    return result.code === "accepted"
      ? { state: result.state, reason: null }
      : fail("Cargo cannot be put down at this time.");
  }
  if (action !== "recover") {
    if (field && isPersonalRoutineAction(action))
      return fail("Personal routines require a bed or seat at the base.");
    const result = performSiteInteraction(local, request);
    return result.reason
      ? fail(result.reason)
      : {
          state: field ? storeFieldState(state, result.state) : result.state,
          reason: null,
        };
  }
  const issue = siteInteractionIssue(local, actorId);
  if (issue) return fail(issue);
  const responder = local.combat.responders[actorId];
  if (action === "recover") {
    if (!field || !targetId?.startsWith("object:"))
      return fail("Recovery is available for field cargo only.");
    const objectId = targetId.slice(7);
    const item = local.objects.items.find((item) => item.id === objectId);
    if (!item) return fail("This object is no longer present.");
    if (!["archive-case", "anomaly-case"].includes(item.kind))
      return fail("This object has no field recovery interaction.");
    if (active!.cargo.includes(item.id))
      return fail("This object is already delivered to extraction.");
    if (item.reservedBy || item.location.kind !== "ground")
      return fail("This object is reserved or being carried.");
    if (responder?.phase === "recovering")
      return fail("Wait for action recovery to finish before handling cargo.");
    const result = recoverExpeditionObject(state, actorId, objectId);
    return result.code === "accepted"
      ? { state: result.state, reason: null }
      : fail(
          result.code === "unreachable"
            ? "No reachable route to this object."
            : "This recovery cannot start now.",
        );
  }
  return fail("Unknown interaction.");
}

export function interactionOptions(
  state: GameState,
  mapId: string,
  actorId: string | null,
  targetId: string,
): readonly InteractionOption[] {
  const local =
    state.expeditions.active?.site?.world.map.id === mapId
      ? fieldState(state)
      : state.world.map.id === mapId
        ? state
        : null;
  if (!local) return [];
  const actions: { action: PersonInteraction; label: string }[] = [];
  if (targetId.startsWith("tile:") || targetId === actorId)
    actions.push({ action: "hold", label: "Hold Position" });
  if (targetId === "SCP-049-2")
    actions.push(
      { action: "attack", label: "Attack" },
      { action: "engage", label: "Engage From Here" },
    );
  if (
    local.personnel.some((person) => person.id === targetId) &&
    targetId !== actorId
  )
    actions.push({ action: "stabilize", label: "Stabilize" });
  const object = targetId.startsWith("object:")
    ? local.objects.items.find((item) => item.id === targetId.slice(7))
    : null;
  if (object && local.world.map.id === state.world.map.id) {
    if (object.kind === "bed")
      actions.push({ action: "sleep", label: "Sleep" });
    if (object.kind === "meal-seat")
      actions.push({ action: "eat", label: "Eat" });
    if (object.kind === "break-seat")
      actions.push({ action: "relax", label: "Relax" });
  }
  if (
    object &&
    ["archive-case", "anomaly-case"].includes(object.kind) &&
    local.world.map.id !== state.world.map.id
  )
    actions.push({ action: "recover", label: "Recover to Extraction" });
  return actions.map((entry) => ({
    ...entry,
    reason: actorId
      ? performInteraction(state, {
          mapId,
          actorId,
          targetId,
          action: entry.action,
        }).reason
      : "Select a person first.",
  }));
}

export function currentPersonAction(local: GameState, actorId: string): string {
  const person = local.personnel.find((person) => person.id === actorId);
  if (!person) return "Person unavailable";
  const responder = local.combat.responders[actorId];
  const routine = local.routines.activities[actorId];
  if (routine?.source === "player" && !responder?.incapacitated)
    return `${person.activity} / Player ${routine.kind === "meal" ? "meal" : routine.kind === "sleep" ? "rest" : "relaxation"}`;
  if (responder?.incapacitated)
    return responder.stabilized
      ? "Stabilized / recovering"
      : "Incapacitated / needs stabilization";
  const recovery =
    local.expeditions.active?.site?.world.map.id === local.world.map.id
      ? local.expeditions.active.recoveryOrders.find(
          (order) => order.personId === actorId && order.phase !== "delivered",
        )
      : null;
  if (recovery) {
    const item = local.objects.items.find(
      (item) => item.id === recovery.objectId,
    );
    return `${recovery.phase === "carrying" ? "Delivering" : recovery.progress ? "Securing" : "Approaching"} ${item ? OBJECT_DEFINITIONS[item.kind].name.toLowerCase() : "cargo"}${recovery.blockedReason ? ` / ${recovery.blockedReason}` : ""}`;
  }
  if (!responder?.drafted) return person.activity;
  const target =
    local.personnel.find((person) => person.id === responder.targetId)?.name ??
    responder.targetId;
  const label =
    responder.order === "move"
      ? `Go Here: ${responder.destination?.x}, ${responder.destination?.y}`
      : responder.order === "attack"
        ? `Attack: ${target}`
        : responder.order === "engage"
          ? `Engage from here: ${target}`
          : responder.order === "stabilize"
            ? `Stabilize: ${target}`
            : responder.order === "retreat"
              ? "Retreat"
              : responder.returnToAutonomy
                ? "Returning to routine"
                : "Hold position";
  return `${label}${responder.phase !== "ready" ? ` / ${responder.phase} ${responder.remaining}` : ""}${responder.blockedReason ? ` / ${responder.blockedReason}` : ""}`;
}
