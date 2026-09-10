import type { Action, ActionContext, ActionResult } from "./Action";
import { canSee } from "../../../site/Visibility";
import { chooseNeedAction } from "../Needs";
import { needActions } from "./NeedActions";

export interface WatchState {
  kind: "watch";
  targetId: string;
  ticks: number;
  workTicks: number;
}

export class Watch implements Action {
  constructor(readonly state: WatchState) {}
  canStart({
    site,
    pawn,
  }: Pick<ActionContext, "site" | "pawn">): string | null {
    if (pawn.human !== true)
      return "Direct watch requires a conscious human observer.";
    const target = site.entities[this.state.targetId];
    if (
      target?.kind !== "pawn" ||
      target.id === pawn.id ||
      !target.stillWhenWatched ||
      target.health?.death ||
      target.location.kind !== "ground"
    )
      return "Choose a grounded attention-sensitive subject.";
    if (
      !Number.isSafeInteger(this.state.ticks) ||
      this.state.ticks < 1 ||
      this.state.ticks > 1000
    )
      return "Choose one to 1000 watch ticks.";
    if ((pawn.needs.fatigue?.value ?? 0) >= 85)
      return "Too fatigued for direct watch; relieve and rest this observer.";
    if (!canSee(site, pawn, target.id))
      return "Direct watch needs current line of sight; move to a visible vantage first.";
    return null;
  }
  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) {
      this.state.workTicks = 0;
      context.events.push({
        siteId: context.site.id,
        entityId: context.pawn.id,
        targetId: this.state.targetId,
        kind: "warning",
        reason: `Direct watch lost: ${reason}`,
      });
      return { status: "interrupted", reason };
    }
    if (
      context.pawn.queue[0]?.source === "autonomy" &&
      context.pawn.watchDuty?.targetId === this.state.targetId &&
      chooseNeedAction(context, needActions, true)
    ) {
      context.events.push({
        siteId: context.site.id,
        entityId: context.pawn.id,
        targetId: this.state.targetId,
        kind: "warning",
        reason:
          "Assigned observer is leaving watch for actual restorative work; maintain replacement coverage.",
      });
      return { status: "completed" };
    }
    if (this.state.workTicks >= this.state.ticks) {
      context.events.push({
        siteId: context.site.id,
        entityId: context.pawn.id,
        targetId: this.state.targetId,
        kind: "warning",
        reason: "Direct watch commitment ended.",
      });
      return { status: "completed" };
    }
    const fatigue = context.pawn.needs.fatigue;
    if (this.state.workTicks === 0)
      context.events.push({
        siteId: context.site.id,
        entityId: context.pawn.id,
        targetId: this.state.targetId,
        kind: "watching",
        reason: "Direct watch is now active.",
      });
    this.state.workTicks++;
    if (
      this.state.workTicks === Math.max(1, this.state.ticks - 10) ||
      (fatigue &&
        fatigue.value >= 75 &&
        (this.state.workTicks === 1 ||
          fatigue.value - fatigue.increasePerTick < 75))
    )
      context.events.push({
        siteId: context.site.id,
        entityId: context.pawn.id,
        targetId: this.state.targetId,
        kind: "warning",
        reason:
          "Direct watch needs relief soon; activate another observer before this commitment or fatigue limit ends.",
      });
    return { status: "running" };
  }
}
