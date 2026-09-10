import type { Action, ActionContext, ActionResult } from "./Action";
import { Move } from "./Move";
import { canSee, hostilityActive } from "../../../site/Visibility";
import { incapacitated } from "../Health";
import type { Pawn } from "../Pawn";
import { wornEquipment } from "../../Equipment";
import { applyNeedChanges } from "../Needs";
import { recordWitnessedImpact } from "../../ImpactRecording";

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
    let damage = Math.max(
      0,
      Math.min(
        pawn.response!.attack!.damage,
        (pawn.response!.attack!.maximumSeverity ?? Infinity) - totalSeverity,
      ),
    );
    if (damage <= 0) return { status: "completed" };
    const severity = damage;
    const armor = wornEquipment(site, target.id, "armor");
    if (armor?.equipment?.armor && (armor.integrity ?? 100) > 0) {
      const before = armor.integrity ?? 100;
      damage = Math.max(0, damage - armor.equipment.armor.reduction);
      armor.integrity = Math.max(
        0,
        (armor.integrity ?? 100) - armor.equipment.armor.wear,
      );
      if (armor.integrity === 0 || (before > 20 && armor.integrity <= 20))
        events.push({
          siteId: site.id,
          entityId: armor.id,
          targetId: target.id,
          kind: "warning",
          reason:
            armor.integrity === 0
              ? `${target.name}'s worn protection has broken; it no longer reduces impacts.`
              : `${target.name}'s worn protection is nearly exhausted (${armor.integrity} condition).`,
        });
    }
    // An active recorder can preserve the impact that incapacitates its operator.
    recordWitnessedImpact(context, target, severity, damage, armor?.id);
    if (damage <= 0) return { status: "running" };
    const fatalAfterTicks = pawn.response!.attack!.fatalAfterTicks;
    if (fatalAfterTicks !== undefined && !target.health!.mortality) {
      target.health!.mortality = { criticalTicks: 0, fatalAfterTicks };
      events.push({
        siteId: site.id,
        entityId: target.id,
        targetId: pawn.id,
        kind: "warning",
        reason: `${target.name} suffered a lethal-risk impact; untreated critical deterioration can be fatal after ${fatalAfterTicks} ticks.`,
      });
    }
    target.health!.wounds.push({
      id: `impact:${context.tick}:${pawn.id}`,
      severity: damage,
      bleeding: pawn.response!.attack!.bleeding ?? 0,
    });
    applyNeedChanges(target.needs, pawn.response!.attack!.needChanges ?? {});
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
