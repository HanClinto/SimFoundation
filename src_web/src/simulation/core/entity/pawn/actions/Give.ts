import type { Action, ActionContext, ActionResult } from "./Action";
import { carriedCargo, equipmentUnderRepair } from "../../Equipment";
import { Move } from "./Move";

export interface GiveState {
  kind: "give";
  targetId: string;
  recipientId: string;
}

export class Give implements Action {
  constructor(readonly state: GiveState) {}
  canStart({ site, pawn }: ActionContext): string | null {
    const cargo = site.entities[this.state.targetId];
    if (
      !cargo ||
      !carriedCargo(site.entities, pawn.id).some(
        (entity) => entity.id === cargo.id,
      )
    )
      return "Give requires this worker's actual loose carried cargo, not worn gear or a restraint.";
    if (equipmentUnderRepair(site, cargo.id))
      return "Finish or cancel the funded equipment repair before handing off its gear.";
    const recipient = site.entities[this.state.recipientId];
    if (
      recipient?.kind !== "pawn" ||
      recipient.id === pawn.id ||
      !recipient.canAct ||
      recipient.health?.death ||
      !recipient.playerControllable ||
      recipient.location.kind !== "ground" ||
      !pawn.response?.faction ||
      recipient.response?.faction !== pawn.response.faction
    )
      return "Choose an available, controllable allied teammate on the ground.";
    if (carriedCargo(site.entities, recipient.id).length)
      return "The receiving teammate already has ordinary cargo.";
    return null;
  }
  tick(context: ActionContext): ActionResult {
    if (!context.site.entities[this.state.recipientId])
      return {
        status: "failed",
        reason: "The receiving teammate is no longer at this site.",
      };
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const recipient = context.site.entities[this.state.recipientId]!;
    const approach = Move.approach(context, recipient);
    if (approach) return approach;
    context.site.entities[this.state.targetId]!.location = {
      kind: "carried",
      carrierId: recipient.id,
    };
    return { status: "completed" };
  }
}
