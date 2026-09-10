import type { Action, ActionContext, ActionResult } from "./Action";
import type { Item } from "../../Item";
import { restraintFor } from "../Custody";
import { Move } from "./Move";

export interface RestrainState {
  kind: "restrain";
  targetId: string;
  restraintId: string;
  workTicks: number;
}

export class Restrain implements Action {
  constructor(readonly state: RestrainState) {}
  canStart({ site, pawn }: ActionContext): string | null {
    const subject = site.entities[this.state.targetId];
    if (
      subject?.kind !== "pawn" ||
      !subject.requiresRestraint ||
      subject.health?.death
    )
      return "Choose a living subject requiring restraint.";
    if (subject.canAct) return "Subdue the subject before applying restraints.";
    if (restraintFor(site.entities, subject.id))
      return "The subject already has an effective restraint.";
    const restraint = site.entities[this.state.restraintId];
    if (
      restraint?.kind !== "item" ||
      !restraint.restraint ||
      restraint.restraint.attached ||
      (restraint.integrity ?? 100) <= 0 ||
      restraint.location.kind !== "carried" ||
      restraint.location.carrierId !== pawn.id
    )
      return "Carry a serviceable unattached restraint.";
    if (!restraint.restraint.accepts.includes(subject.definitionId))
      return "This restraint is incompatible with the subject.";
    return null;
  }
  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const subject = context.site.entities[this.state.targetId]!;
    const approach = Move.approach(context, subject);
    if (approach) {
      this.state.workTicks = 0;
      return approach;
    }
    const restraint = context.site.entities[this.state.restraintId] as Item;
    if (++this.state.workTicks < restraint.restraint!.ticks)
      return { status: "running" };
    restraint.restraint!.attached = true;
    restraint.location = { kind: "carried", carrierId: subject.id };
    return { status: "completed" };
  }
}
