import type { GameState } from "../../simulation/state";
import { tileAt } from "../../simulation/world";

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown, maximum: number) =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= maximum;
export function combatStateValid(state: GameState): boolean {
  const combat = state.combat;
  if (
    !record(combat) ||
    !record(combat.responders) ||
    !Array.isArray(combat.participants) ||
    !Array.isArray(combat.events) ||
    combat.events.length > 40 ||
    !["idle", "active", "neutralized", "withdrawn"].includes(combat.status) ||
    !integer(combat.withdrawalTicks, 8)
  )
    return false;
  const ids = state.personnel.map(({ id }) => id);
  const position = (value: unknown): boolean =>
    record(value) &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    Number.isInteger(value.x) &&
    Number.isInteger(value.y) &&
    tileAt(state.world.map, { x: value.x, y: value.y }) !== null;
  const phase = (value: { phase: string; remaining: number }) =>
    ["ready", "preparing", "recovering"].includes(value.phase) &&
    integer(value.remaining, 6) &&
    (value.phase === "ready" ? value.remaining === 0 : value.remaining > 0);
  for (const [id, responder] of Object.entries(combat.responders)) {
    if (
      !ids.includes(id) ||
      !record(responder) ||
      (responder.returnToAutonomy !== undefined &&
        typeof responder.returnToAutonomy !== "boolean") ||
      (responder.returnToAutonomy === true &&
        (!responder.drafted || !["move", "hold"].includes(responder.order))) ||
      !["drafted", "incapacitated", "stabilized"].every(
        (key) => typeof responder[key] === "boolean",
      ) ||
      !integer(responder.health, 100) ||
      !integer(responder.injuries, 1000000) ||
      !integer(responder.ammunition, 12) ||
      !integer(responder.medicalSupplies, 2) ||
      !integer(responder.recovery, 11) ||
      !(
        responder.lastShotTick === null ||
        integer(responder.lastShotTick, state.tick)
      ) ||
      !phase(responder) ||
      !["hold", "move", "retreat", "engage", "stabilize"].includes(
        responder.order,
      ) ||
      !(
        responder.blockedReason === null ||
        typeof responder.blockedReason === "string"
      )
    )
      return false;
    if (
      responder.incapacitated !== (responder.health === 0) ||
      (responder.injuries === 0 &&
        (responder.health !== 100 || responder.stabilized)) ||
      (!responder.drafted &&
        (responder.order !== "hold" || responder.phase !== "ready")) ||
      (responder.recovery > 0 &&
        (!responder.incapacitated || !responder.stabilized))
    )
      return false;
    if (
      responder.phase === "preparing" &&
      !["engage", "stabilize"].includes(responder.order)
    )
      return false;
    if (
      ["move", "retreat"].includes(responder.order)
        ? !position(responder.destination)
        : responder.destination !== null
    )
      return false;
    if (
      responder.order === "engage"
        ? responder.targetId !== "SCP-049-2"
        : responder.order === "stabilize"
          ? !ids.includes(responder.targetId!) || responder.targetId === id
          : responder.targetId !== null
    )
      return false;
    if (responder.drafted || responder.incapacitated) {
      if (
        state.routines.activities[id] ||
        state.personnel.find((person) => person.id === id)?.currentJobId ||
        state.objects.items.some(
          (item) =>
            item.location.kind === "carried" && item.location.personId === id,
        ) ||
        state.jobs.some(
          (job) =>
            job.status === "in-progress" &&
            (job.assignedPersonId === id || job.assessment?.patientId === id),
        )
      )
        return false;
    }
  }
  if (
    new Set(combat.participants).size !== combat.participants.length ||
    combat.participants.some(
      (id) => !ids.includes(id) || !combat.responders[id],
    )
  )
    return false;
  if (combat.status === "idle") {
    if (
      combat.adversary !== null ||
      combat.sighting !== null ||
      combat.participants.length
    )
      return false;
  } else {
    if (
      combat.participants.length < 2 ||
      combat.participants.length > 3 ||
      !record(combat.adversary)
    )
      return false;
    if (
      combat.status === "active" &&
      combat.participants.some((id) => !combat.responders[id]!.drafted)
    )
      return false;
    if ((combat.status === "neutralized") !== (combat.adversary.health === 0))
      return false;
  }
  const actorValid = (actor: unknown): boolean =>
    record(actor) &&
    actor.id === "SCP-049-2" &&
    position(actor.position) &&
    position(actor.origin) &&
    integer(actor.health, 120) &&
    phase(actor as unknown as { phase: string; remaining: number }) &&
    (actor.targetId === null ||
      combat.participants.includes(String(actor.targetId))) &&
    (actor.lastKnown === null || position(actor.lastKnown));
  if (combat.adversary !== null && !actorValid(combat.adversary)) return false;
  if (
    combat.adversary?.phase === "preparing" &&
    combat.adversary.targetId === null
  )
    return false;
  if (
    combat.sighting !== null &&
    (!record(combat.sighting) ||
      !integer(combat.sighting.observedTick, state.tick) ||
      !actorValid(combat.sighting.adversary))
  )
    return false;
  return combat.events.every(
    (event) =>
      record(event) &&
      integer(event.tick, state.tick) &&
      typeof event.text === "string" &&
      event.text.length <= 300,
  );
}
