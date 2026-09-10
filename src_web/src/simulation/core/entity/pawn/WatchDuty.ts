import type { ActionContext, ActionState } from "./actions/Action";
import { samePosition, positionOf } from "../../site/TileMap";
import { Watch } from "./actions/Watch";
import type { Site } from "../../site/Site";
import type { Pawn } from "./Pawn";

export function watchDutyBlocker(site: Site, pawn: Pawn): string | null {
  const duty = pawn.watchDuty;
  if (!duty) return null;
  return new Watch({
    kind: "watch",
    targetId: duty.targetId,
    ticks: 1000,
    workTicks: 0,
  }).canStart({ site, pawn });
}

export function watchDutyAction(context: ActionContext): ActionState | null {
  const duty = context.pawn.watchDuty;
  if (!duty || !context.site.entities[duty.targetId]) return null;
  if (!samePosition(positionOf(context.site, context.pawn.id)!, duty.post))
    return { kind: "move", destination: { ...duty.post } };
  const action: ActionState = {
    kind: "watch",
    targetId: duty.targetId,
    ticks: 1000,
    workTicks: 0,
  };
  return watchDutyBlocker(context.site, context.pawn) ? null : action;
}
