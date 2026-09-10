import type { Action, ActionContext, ActionResult } from "./Action";
import { Move } from "./Move";
import { canSee } from "../../../site/Visibility";
import { incapacitated } from "../Health";
import type { Pawn } from "../Pawn";

export interface AttackState {
  kind: "attack";
  targetId: string;
  workTicks: number;
}

export class Attack implements Action {
  constructor(readonly state: AttackState) {}

  canStart({ site, pawn }: ActionContext): string | null {
    const target = site.entities[this.state.targetId];
    if (!pawn.response?.attack) return "This pawn has no attack capability.";
    if (
      target?.kind !== "pawn" ||
      !target.health ||
      !target.response ||
      !pawn.response.hostileTo.includes(target.response.faction)
    )
      return "The target is not a hostile pawn.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const { site, pawn, events } = context;
    const target = site.entities[this.state.targetId] as Pawn;
    if (!target.canAct || !canSee(site, pawn, target.id))
      return { status: "completed" };
    const approach = Move.approach(context, target);
    if (approach) {
      this.state.workTicks = 0;
      return approach;
    }
    if (++this.state.workTicks < pawn.response!.attack!.windup)
      return { status: "running" };
    this.state.workTicks = 0;
    target.health!.wounds.push({
      id: `impact:${context.tick}:${pawn.id}`,
      severity: pawn.response!.attack!.damage,
      bleeding: 0,
    });
    if (incapacitated(target.health!)) target.canAct = false;
    events.push({
      siteId: site.id,
      entityId: pawn.id,
      kind: "attacked",
      targetId: target.id,
    });
    return { status: target.canAct ? "running" : "completed" };
  }
}
