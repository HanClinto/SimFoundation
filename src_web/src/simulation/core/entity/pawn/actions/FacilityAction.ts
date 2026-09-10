import type {
  Action,
  ActionContext,
  ActionResult,
  ActivityKind,
  ActivityState,
} from "./Action";
import type { NeedActionOffer } from "../Needs";
import { applyNeedChanges } from "../Needs";
import { facilityInUse, type Facility } from "../../Facility";
import { Move } from "./Move";
import { findTarget } from "./FindTarget";

export abstract class FacilityAction implements Action {
  constructor(readonly state: ActivityState) {}

  canStart({ site, pawn }: ActionContext): string | null {
    const target = site.entities[this.state.targetId];
    if (target?.kind !== "facility" || target.location.kind !== "ground")
      return "The facility is not available on the ground.";
    if (target.integrity !== undefined && target.integrity <= 0)
      return "The facility is broken.";
    const activity = target.activities[this.state.kind];
    if (
      !activity ||
      !Number.isSafeInteger(activity.duration) ||
      activity.duration < 1
    )
      return "This facility does not support the activity.";
    if (facilityInUse(site, target.id, pawn.id))
      return "The facility is occupied.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const target = context.site.entities[this.state.targetId] as Facility;
    const activity = target.activities[this.state.kind]!;
    const current = context.pawn.queue[0];
    const benefits = Object.entries(activity.needChanges).filter(
      ([, change]) => change < 0,
    );
    if (
      current?.source === "autonomy" &&
      current.action === this.state &&
      this.state.kind !== "research" &&
      benefits.length > 0 &&
      benefits.every(([id]) => (context.pawn.needs[id]?.value ?? 0) <= 0)
    )
      return { status: "completed" };
    const approach = Move.approach(context, target);
    if (approach) return approach;
    applyNeedChanges(context.pawn.needs, activity.needChanges);
    this.state.workTicks++;
    this.performWork(target);
    return {
      status:
        this.state.workTicks >= activity.duration ? "completed" : "running",
    };
  }

  protected performWork(_facility: Facility): void {}

  static findOffer(
    context: ActionContext,
    needId: string,
    kind: ActivityKind,
    handler: (state: ActivityState) => FacilityAction,
  ): NeedActionOffer | null {
    const target = findTarget(context, (entity) => {
      if (entity.kind !== "facility") return false;
      const change = entity.activities[kind]?.needChanges[needId] ?? 0;
      return (
        change < 0 &&
        handler({ kind, targetId: entity.id, workTicks: 0 }).canStart(
          context,
        ) === null
      );
    });
    if (!target || target.kind !== "facility") return null;
    return {
      action: { kind, targetId: target.id, workTicks: 0 },
      relief: Math.min(
        context.pawn.needs[needId]?.value ?? 0,
        -target.activities[kind]!.needChanges[needId]!,
      ),
    };
  }
}
