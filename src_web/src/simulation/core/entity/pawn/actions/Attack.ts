import type { Action, ActionContext, ActionResult } from "./Action";
import { Move } from "./Move";
import { canSee, hostilityActive } from "../../../site/Visibility";
import { incapacitated } from "../Health";
import type { Pawn } from "../Pawn";

export interface AttackState {
  kind: "attack";
  targetId: string;
  workTicks: number;
}

export class Attack implements Action {
  constructor(readonly state: AttackState) {}

  canStart({ site, pawn, tick }: ActionContext): string | null {
    const target = site.entities[this.state.targetId];
    if (!pawn.response?.attack) return "This pawn has no attack capability.";
    if (!hostilityActive(site, pawn, tick))
      return "This actor is not hostile during the current operating phase.";
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
    if (!hostilityActive(context.site, context.pawn, context.tick))
      return { status: "completed" };
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
    const totalSeverity = target.health!.wounds.reduce(
      (sum, wound) => sum + wound.severity,
      0,
    );
    const damage = Math.max(
      0,
      Math.min(
        pawn.response!.attack!.damage,
        (pawn.response!.attack!.maximumSeverity ?? Infinity) - totalSeverity,
      ),
    );
    if (damage <= 0) return { status: "completed" };
    target.health!.wounds.push({
      id: `impact:${context.tick}:${pawn.id}`,
      severity: damage,
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
