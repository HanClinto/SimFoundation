import type { Pawn, QueuedAction, Site } from "../model";
import type { ActionRequest, Proposal } from "../actions/proposals";
import {
  distance,
  doorAt,
  positionOf,
  route,
  samePosition,
} from "../world/spatial";
import { advanceNeeds } from "../entities/needs";

function chooseAction(
  site: Site,
  pawn: Pawn,
  tick: number,
): QueuedAction | null {
  if (pawn.queue.length) return pawn.queue[0]!;
  if (!pawn.autonomy || pawn.definitionId !== "wanderer" || !pawn.patrol.length)
    return null;
  const origin = positionOf(site, pawn.id)!;
  const target = pawn.patrol.find(
    (position) => !samePosition(position, origin),
  );
  return target
    ? {
        id: `autonomy:${tick}:${pawn.id}`,
        source: "autonomy",
        action: { kind: "move", destination: target },
        elapsed: 0,
        blockedReason: null,
      }
    : null;
}

function movement(
  site: Site,
  pawn: Pawn,
  destination: { x: number; y: number },
): ActionRequest {
  if (!pawn.mobile)
    return { kind: "blocked", reason: "This pawn cannot move independently." };
  const path = route(site, positionOf(site, pawn.id)!, destination);
  if (!path) return { kind: "blocked", reason: "No route to the destination." };
  const step = path[0];
  if (!step) return { kind: "complete" };
  const door = doorAt(site, step);
  return door && !door.open
    ? { kind: "open", targetId: door.id }
    : { kind: "move", destination: step };
}

export function tickPawn(site: Site, pawn: Pawn, tick: number): Proposal {
  const needs = advanceNeeds(pawn.needs);
  const base = { kind: "pawn" as const, entityId: pawn.id, needs };
  if (!pawn.canAct || pawn.location.kind === "carried")
    return {
      ...base,
      current: pawn.queue[0] ?? null,
      request: pawn.queue.length
        ? {
            kind: "blocked",
            reason:
              "This pawn cannot act in its current condition or location.",
          }
        : null,
    };
  const current = chooseAction(site, pawn, tick);
  if (!current) return { ...base, current, request: null };
  if (current.source === "player" && !pawn.playerControllable)
    return {
      ...base,
      current,
      request: { kind: "blocked", reason: "Player control is unavailable." },
    };
  const action = current.action;
  let request: ActionRequest;
  if (action.kind === "move")
    request = movement(site, pawn, action.destination);
  else if (action.kind === "wait")
    request = {
      kind: current.elapsed + 1 >= action.ticks ? "complete" : "wait",
    };
  else {
    const target = site.entities[action.targetId];
    const position = target ? positionOf(site, target.id) : null;
    if (!target || !position)
      request = { kind: "blocked", reason: "The target is no longer present." };
    else if (distance(positionOf(site, pawn.id)!, position) > 1)
      request = movement(site, pawn, position);
    else request = { kind: action.kind, targetId: action.targetId };
  }
  return { ...base, current, request };
}
