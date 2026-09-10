import type { Action, ActionContext, ActionResult } from "./Action";
import { positionOf } from "../../../site/TileMap";

export class Drop implements Action {
  constructor(readonly targetId: string) {}

  canStart({ site, pawn }: ActionContext): string | null {
    const target = site.entities[this.targetId];
    if (target?.kind === "item" && target.equipment?.worn)
      return "Use unequip to remove worn equipment.";
    return target?.location.kind === "carried" &&
      target.location.carrierId === pawn.id
      ? null
      : "This pawn is not carrying the target.";
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    context.site.entities[this.targetId]!.location = {
      kind: "ground",
      position: { ...positionOf(context.site, context.pawn.id)! },
    };
    return { status: "completed" };
  }
}
