import type { SiteSimulationState } from "./state";
import { draftResponder, orderResponder } from "./combat";
import {
  orderPersonalRoutine,
  cancelPersonalRoutine,
  isPersonalRoutineAction,
  PERSONAL_ROUTINE_KINDS,
} from "./routines";
import type { InteractionRequest } from "./interactions";

export function siteInteractionIssue(
  local: SiteSimulationState,
  actorId: string,
): string | null {
  const responder = local.combat.responders[actorId];
  if (responder?.incapacitated)
    return "This person is incapacitated; another responder must stabilize them.";
  if (
    local.objects.items.some(
      (item) =>
        item.location.kind === "carried" && item.location.personId === actorId,
    )
  )
    return "Finish the reserved cargo delivery first.";
  if (
    local.jobs.some(
      (job) =>
        job.status === "in-progress" &&
        job.assessment &&
        (job.assignedPersonId === actorId ||
          job.assessment.patientId === actorId),
    )
  )
    return "Finish the active clinical appointment first.";

  return null;
}

export function performSiteInteraction<State extends SiteSimulationState>(
  state: State,
  request: InteractionRequest,
): { state: State; reason: string | null } {
  const { actorId, targetId, action } = request;
  const local = state;
  const fail = (reason: string) => ({ state, reason });
  if (
    request.mapId !== local.world.map.id ||
    !local.world.positions[actorId] ||
    !local.personnel.some((person) => person.id === actorId)
  )
    return fail("This person is no longer on this map.");
  const issue = siteInteractionIssue(local, actorId);
  if (issue) return fail(issue);
  const responder = local.combat.responders[actorId];
  if (action === "cancel") {
    if (local.routines.activities[actorId]?.source === "player")
      return cancelPersonalRoutine(state, actorId);
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
    return { state: next, reason: null };
  }
  if (isPersonalRoutineAction(action)) {
    if (!targetId?.startsWith("object:"))
      return fail("Personal routines require a bed or seat at this site.");
    return orderPersonalRoutine(
      state,
      actorId,
      PERSONAL_ROUTINE_KINDS[action],
      targetId.slice(7),
    );
  }
  if (action === "recover")
    return fail("Use a transport or recovery operation for this object.");
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
  return { state: next, reason: null };
}
