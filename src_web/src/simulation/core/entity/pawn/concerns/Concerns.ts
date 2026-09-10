import type {
  ActionContext,
  ActionState,
  QueuedAction,
} from "../actions/Action";
import { threatConcern } from "./Threat";
import { careConcern } from "./Care";
import type { Concern } from "./Concern";

export function chooseConcern(context: ActionContext): Concern | null {
  let best: Concern | null = null;
  for (const discover of [threatConcern, careConcern]) {
    const concern = discover(context);
    if (concern && (!best || concern.urgency > best.urgency)) best = concern;
  }
  return best;
}

export function responseAction(action: ActionState): boolean {
  return (
    action.kind === "attack" ||
    action.kind === "flee" ||
    action.kind === "treat"
  );
}

export function shouldInterrupt(
  current: QueuedAction,
  concern: Concern,
): boolean {
  if (current.source !== "autonomy") return false;
  if (current.action.kind === "treat")
    return concern.kind === "threat" && concern.urgency === 100;
  return (
    !responseAction(current.action) &&
    ("workTicks" in current.action ||
      current.action.kind === "move" ||
      current.action.kind === "wait")
  );
}
