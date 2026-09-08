import type { GameState } from "./state";
import { draftResponder, orderResponder } from "./combat";
import {
  cancelRecovery,
  expeditionMember,
  fieldState,
  recoverExpeditionObject,
  storeFieldState,
} from "./expeditions";
import { OBJECT_DEFINITIONS } from "./objects";

export type PersonInteraction =
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
  const responder = local.combat.responders[actorId];
  if (responder?.incapacitated)
    return fail(
      "This person is incapacitated; another responder must stabilize them.",
    );
  if (
    local.objects.items.some(
      (item) =>
        item.location.kind === "carried" && item.location.personId === actorId,
    )
  )
    return fail("Finish the reserved cargo delivery first.");
  if (
    local.jobs.some(
      (job) =>
        job.status === "in-progress" &&
        job.assessment &&
        (job.assignedPersonId === actorId ||
          job.assessment.patientId === actorId),
    )
  )
    return fail("Finish the active clinical appointment first.");
  if (action === "cancel") {
    if (
      !responder?.drafted ||
      (responder.order === "hold" &&
        responder.phase === "ready" &&
        !responder.returnToAutonomy)
    )
      return fail("No current personal action to cancel.");
    const held = orderResponder(local, actorId, "hold");
    if (held.code !== "accepted")
      return fail("This action cannot be cancelled now.");
    const next = {
      ...held.state,
      combat: {
        ...held.state.combat,
        responders: {
          ...held.state.combat.responders,
          [actorId]: {
            ...held.state.combat.responders[actorId]!,
            returnToAutonomy: responder.returnToAutonomy === true,
          },
        },
      },
    };
    return { state: field ? storeFieldState(state, next) : next, reason: null };
  }
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
  if (action === "engage" || action === "attack") {
    if (
      !local.combat.adversary ||
      targetId !== local.combat.adversary.id ||
      local.combat.status !== "active" ||
      local.combat.adversary.health <= 0
    )
      return fail("No active adversary at this location.");
    if (!local.combat.participants.includes(actorId))
      return fail("This person is not enrolled in this encounter.");
    if (!responder || responder.ammunition <= 0)
      return fail("No ammunition remaining.");
  } else if (action === "stabilize") {
    const patient = targetId ? local.combat.responders[targetId] : null;
    if (targetId === actorId)
      return fail("Select another injured person to stabilize.");
    if (!targetId || !local.world.positions[targetId] || !patient)
      return fail("No casualty at this location.");
    if (!patient.injuries)
      return fail("This person has no tactical injury to stabilize.");
    if (patient.stabilized) return fail("This person is already stabilized.");
    if (responder && responder.medicalSupplies <= 0)
      return fail("No stabilization kits remaining.");
  } else if (action !== "hold") return fail("Unknown interaction.");
  const drafted = responder?.drafted
    ? { state: local, code: "accepted" as const }
    : draftResponder(local, actorId, true);
  if (drafted.code !== "accepted")
    return fail("This person cannot leave their current commitment.");
  const result = orderResponder(
    drafted.state,
    actorId,
    action,
    undefined,
    action === "hold" ? undefined : targetId,
  );
  if (result.code !== "accepted")
    return fail("This interaction is no longer available.");
  const temporary =
    action === "stabilize" &&
    (!responder?.drafted || responder.returnToAutonomy === true);
  const next = {
    ...result.state,
    combat: {
      ...result.state.combat,
      responders: {
        ...result.state.combat.responders,
        [actorId]: {
          ...result.state.combat.responders[actorId]!,
          returnToAutonomy: temporary,
        },
      },
    },
  };
  return { state: field ? storeFieldState(state, next) : next, reason: null };
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
