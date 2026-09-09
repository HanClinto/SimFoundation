import type { Action, ActionContext, ActionResult } from "./Action";
import { Move } from "./Move";
import { facilityInUse } from "../../Facility";

export class Take implements Action {
  constructor(readonly targetId: string) {}

  canStart({ site, pawn }: ActionContext): string | null {
    const target = site.entities[this.targetId];
    if (
      !target ||
      target.id === pawn.id ||
      !target.carryable ||
      target.location.kind !== "ground"
    )
      return "This entity cannot be picked up now.";
    if (target.kind === "pawn" && target.canAct && target.mobile)
      return "An active mobile pawn cannot be picked up.";
    if (target.kind === "facility" && facilityInUse(site, target.id))
      return "The facility is occupied.";
    if (
      Object.values(site.entities).some(
        (entity) =>
          entity.location.kind === "carried" &&
          entity.location.carrierId === pawn.id,
      )
    )
      return "This pawn is already carrying an entity.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const target = context.site.entities[this.targetId]!;
    const approach = Move.approach(context, target);
    if (approach) return approach;
    target.location = { kind: "carried", carrierId: context.pawn.id };
    return { status: "completed" };
  }
}
