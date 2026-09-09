import type { ActionContext, ActionState } from "./actions/Action";
import { needActions } from "./actions/NeedActions";
import { chooseNeedAction } from "./Needs";
import { positionOf, samePosition } from "../../site/TileMap";

export function chooseAction(context: ActionContext): ActionState | null {
  const { site, pawn } = context;
  const needed = chooseNeedAction(context, needActions);
  if (needed) return needed;
  const origin = positionOf(site, pawn.id);
  const destination =
    origin && pawn.patrol.find((point) => !samePosition(point, origin));
  return destination ? { kind: "move", destination: { ...destination } } : null;
}
