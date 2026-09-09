import type { ActionContext, ActionState } from "./actions/Action";
import { Eat } from "./actions/Eat";
import { positionOf, samePosition } from "../../site/TileMap";

export function chooseAction(context: ActionContext): ActionState | null {
  const { site, pawn } = context;
  if ((pawn.needs.hunger?.value ?? 0) >= 50) {
    const target = Eat.findFood(context);
    if (target) return { kind: "eat", targetId: target.id };
  }
  const origin = positionOf(site, pawn.id);
  const destination =
    origin && pawn.patrol.find((point) => !samePosition(point, origin));
  return destination ? { kind: "move", destination: { ...destination } } : null;
}
