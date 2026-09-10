import type { Action, ActionContext, ActionResult } from "./Action";
import { wornEquipment } from "../../Equipment";
import { Move } from "./Move";
import type { Pawn } from "../Pawn";

export interface SubdueState {
  kind: "subdue";
  targetId: string;
  workTicks: number;
}

export class Subdue implements Action {
  constructor(readonly state: SubdueState) {}

  canStart({ site, pawn }: ActionContext): string | null {
    const tool = wornEquipment(site, pawn.id, "tool");
    if (
      !tool?.equipment?.subdual ||
      (tool.integrity ?? 100) <= 0 ||
      tool.equipment.subdual.charges < 1
    )
      return "Wear a serviceable intervention tool with a remaining charge.";
    const target = site.entities[this.state.targetId];
    if (
      target?.kind !== "pawn" ||
      !target.health ||
      target.health.death ||
      !target.response ||
      !pawn.response?.hostileTo.includes(target.response.faction)
    )
      return "Choose a living hostile subject, not a cooperative passenger or body.";
    if (target.location.kind !== "ground")
      return "Set the subject down before intervention.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const target = context.site.entities[this.state.targetId] as Pawn;
    if (!target.canAct) return { status: "completed" };
    const approach = Move.approach(context, target);
    if (approach) {
      this.state.workTicks = 0;
      return approach;
    }
    const tool = wornEquipment(context.site, context.pawn.id, "tool")!;
    const capability = tool.equipment!.subdual!;
    if (++this.state.workTicks < capability.ticks) return { status: "running" };
    capability.charges--;
    target.health!.subdual = {
      untilTick: context.tick + capability.duration,
      actorId: context.pawn.id,
    };
    target.health!.incapacity = "subdued";
    target.canAct = false;
    return { status: "completed" };
  }
}
