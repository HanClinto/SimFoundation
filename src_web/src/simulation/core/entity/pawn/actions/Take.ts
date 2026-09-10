import type { Action, ActionContext, ActionResult } from "./Action";
import { Move } from "./Move";
import { facilityInUse } from "../../Facility";
import { serviceInputInUse } from "../../Service";

export class Take implements Action {
  constructor(
    readonly targetId: string,
    readonly amount?: number,
  ) {}

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
    if (target.kind === "item" && target.requiresCase)
      return "This specimen requires sealing into a compatible carried case.";
    if (this.amount !== undefined) {
      if (!Number.isFinite(this.amount) || this.amount <= 0)
        return "Choose a positive finite supply quantity.";
      if (
        target.kind !== "item" ||
        !target.stackable ||
        target.case ||
        target.sample
      )
        return "Only ordinary stackable supplies can be collected by quantity.";
      if (this.amount > target.amount)
        return "The source has less than the requested quantity.";
      if (
        Object.values(site.entities).some(
          (entity) =>
            entity.location.kind === "carried" &&
            entity.location.carrierId === target.id,
        )
      )
        return "Unload a supply stack before collecting a portion.";
    }
    if (target.kind === "facility" && facilityInUse(site, target.id))
      return "The facility is occupied.";
    if (serviceInputInUse(site, target.id))
      return "Finish or cancel the active presentation before moving its programme.";
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
    if (this.amount !== undefined && this.amount < target.amount) {
      const id = `${target.id}:portion-${context.pawn.queue[0]!.id}`;
      if (context.site.entities[id])
        return {
          status: "blocked",
          reason: "The collected portion identity is already in use.",
        };
      context.site.entities[id] = {
        ...structuredClone(target),
        id,
        amount: this.amount,
        location: { kind: "carried", carrierId: context.pawn.id },
      };
      target.amount -= this.amount;
      return { status: "completed" };
    }
    target.location = { kind: "carried", carrierId: context.pawn.id };
    return { status: "completed" };
  }
}
