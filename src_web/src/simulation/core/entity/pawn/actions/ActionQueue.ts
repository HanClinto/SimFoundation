import type { Action, ActionContext, ActionState } from "./Action";
import { Move } from "./Move";
import { Take } from "./Take";
import { Drop } from "./Drop";
import { Eat } from "./Eat";
import { Wait } from "./Wait";
import { Sleep } from "./Sleep";
import { Relax } from "./Relax";
import { Research } from "./Research";
import { Read } from "./Read";
import { Exercise } from "./Exercise";
import { Attack } from "./Attack";
import { Treat } from "./Treat";
import { Flee } from "./Flee";
import { Study } from "./Study";
import { Deliver } from "./Deliver";
import { Dispense } from "./Dispense";
import { Escort, Follow } from "./Escort";
import { Pack, Unpack } from "./Pack";
import { Nurse } from "./Nurse";

export function actionHandler(action: ActionState): Action {
  switch (action.kind) {
    case "nurse":
      return new Nurse(action);
    case "pack":
      return new Pack(action);
    case "unpack":
      return new Unpack(action);
    case "escort":
      return new Escort(action);
    case "follow":
      return new Follow(action);
    case "dispense":
      return new Dispense(action);
    case "deliver":
      return new Deliver(action);
    case "study":
      return new Study(action);
    case "attack":
      return new Attack(action);
    case "treat":
      return new Treat(action);
    case "flee":
      return new Flee(action.targetId);
    case "read":
      return new Read(action);
    case "exercise":
      return new Exercise(action);
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
  let result = reason
    ? {
        status:
          !pawn.canAct || pawn.location.kind === "carried"
            ? ("interrupted" as const)
            : ("blocked" as const),
        reason,
      }
    : "targetId" in current.action && !site.entities[current.action.targetId]
      ? {
          status: "failed" as const,
          reason: "The target is no longer present.",
        }
      : actionHandler(current.action).tick(context, current.elapsed);
  current.elapsed++;
  current.blockedTicks =
    result.status === "blocked" ? (current.blockedTicks ?? 0) + 1 : 0;
  if (current.source === "autonomy" && current.blockedTicks >= 8)
    result = {
      status: "interrupted",
      reason: "Autonomous action abandoned after eight blocked ticks.",
    };
  current.blockedReason = result.status === "blocked" ? result.reason : null;
  if (
    result.status === "completed" ||
    result.status === "failed" ||
    result.status === "interrupted"
  ) {
    pawn.queue.shift();
    events.push({
      siteId: site.id,
      entityId: pawn.id,
      kind: result.status,
      actionId: current.id,
      actionKind: current.action.kind,
      ...("targetId" in current.action
        ? { targetId: current.action.targetId }
        : {}),
      ...(result.status === "completed" ? {} : { reason: result.reason }),
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
