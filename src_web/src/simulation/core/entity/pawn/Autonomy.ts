import type { ActionContext, ActionState } from "./actions/Action";
import { needActions } from "./actions/NeedActions";
import { chooseNeedAction } from "./Needs";
import { positionOf, samePosition } from "../../site/TileMap";
import { chooseConcern } from "./concerns/Concerns";
import { Mend } from "./actions/Mend";
import { Service } from "./actions/Service";

export function chooseAction(context: ActionContext): ActionState | null {
  const { site, pawn } = context;
  const concern = chooseConcern(context);
  if (concern) return concern.action;
  const mending = Mend.offer(context);
  if (mending) return mending;
  if (pawn.serviceDuty) {
    const urgent = chooseNeedAction(context, needActions, true);
    if (urgent) return urgent;
    const service = Service.offer(context);
    if (service) return service;
  }
  const needed = chooseNeedAction(context, needActions);
  if (needed) return needed;
  const origin = positionOf(site, pawn.id);
  const destination =
    origin && pawn.patrol.find((point) => !samePosition(point, origin));
  return destination ? { kind: "move", destination: { ...destination } } : null;
}
