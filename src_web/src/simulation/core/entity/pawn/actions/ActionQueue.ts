import type { Action, ActionContext, ActionState } from "./Action";
import { Move } from "./Move";
import { Take } from "./Take";
import { Drop } from "./Drop";
import { Eat } from "./Eat";
import { Wait } from "./Wait";
import { Sleep } from "./Sleep";
import { Relax } from "./Relax";
import { Research } from "./Research";

export function actionHandler(action: ActionState): Action {
  switch (action.kind) {
    case "sleep":
      return new Sleep(action);
    case "relax":
      return new Relax(action);
    case "research":
      return new Research(action);
    case "move":
      return new Move(action.destination);
    case "take":
      return new Take(action.targetId);
    case "drop":
      return new Drop(action.targetId);
    case "eat":
      return new Eat(action.targetId);
    case "wait":
      return new Wait(action.ticks);
  }
}

export function tickActionQueue(context: ActionContext): void {
  const { pawn, site, events } = context;
  const current = pawn.queue[0];
  if (!current) return;
  const reason =
    !pawn.canAct || pawn.location.kind === "carried"
      ? "This pawn cannot act in its current condition or location."
      : current.source === "player" && !pawn.playerControllable
        ? "Player control is unavailable."
        : null;
  const result = reason
    ? { status: "blocked" as const, reason }
    : actionHandler(current.action).tick(context, current.elapsed);
  current.elapsed++;
  current.blockedReason = result.status === "blocked" ? result.reason : null;
  if (result.status === "completed") {
    pawn.queue.shift();
    events.push({
      siteId: site.id,
      entityId: pawn.id,
      kind: "completed",
      actionId: current.id,
    });
  } else if (result.status === "blocked") {
    events.push({
      siteId: site.id,
      entityId: pawn.id,
      kind: "blocked",
      actionId: current.id,
      reason: result.reason,
    });
  }
}
