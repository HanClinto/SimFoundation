import type { Position } from "../../Entity";
import type { Action, ActionContext, ActionResult } from "./Action";
import { restraintFor } from "../Custody";
import { Subdue, type SubdueState } from "./Subdue";
import { Restrain, type RestrainState } from "./Restrain";
import { Take } from "./Take";
import { Move } from "./Move";

export interface CaptureState {
  kind: "capture";
  targetId: string;
  restraintId: string;
  destination: Position;
  phase?: "subdue" | "restrain" | "take" | "move";
  workTicks: number;
}

export class Capture implements Action {
  constructor(readonly state: CaptureState) {}

  canStart(context: ActionContext): string | null {
    const movement = new Move(this.state.destination).canStart(context);
    if (movement) return movement;
    const { pawn, site } = context;
    const subject = site.entities[this.state.targetId];
    if (
      subject?.kind !== "pawn" ||
      !subject.requiresRestraint ||
      subject.health?.death
    )
      return "Capture requires a living custody subject; use ordinary recovery for bodies.";
    if (
      subject.location.kind === "carried" &&
      subject.location.carrierId !== pawn.id
    )
      return "The subject already belongs to another carrier or containment cell.";
    if (restraintFor(site.entities, subject.id))
      return subject.location.kind === "carried"
        ? null
        : new Take(subject.id).canStart(context);
    const band = site.entities[this.state.restraintId];
    if (
      band?.kind !== "item" ||
      !band.restraint ||
      band.restraint.attached ||
      (band.integrity ?? 100) <= 0 ||
      band.location.kind !== "carried" ||
      band.location.carrierId !== pawn.id ||
      !band.restraint.accepts.includes(subject.definitionId)
    )
      return "Carry the specified serviceable compatible restraint before starting capture.";
    return subject.canAct
      ? new Subdue({
          kind: "subdue",
          targetId: subject.id,
          workTicks: 0,
        }).canStart(context)
      : new Restrain({
          kind: "restrain",
          targetId: subject.id,
          restraintId: band.id,
          workTicks: 0,
        }).canStart(context);
  }

  private phase(phase: CaptureState["phase"]): void {
    if (this.state.phase !== phase) {
      this.state.phase = phase;
      this.state.workTicks = 0;
    }
  }

  private advanceWork(
    context: ActionContext,
    child: SubdueState | RestrainState,
  ): ActionResult {
    const result =
      child.kind === "subdue"
        ? new Subdue(child).tick(context)
        : new Restrain(child).tick(context);
    this.state.workTicks = child.workTicks;
    return result.status === "completed" ? { status: "running" } : result;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const subject = context.site.entities[this.state.targetId]!;
    if (subject.kind !== "pawn")
      return {
        status: "failed",
        reason: "The capture subject is no longer present.",
      };
    if (!restraintFor(context.site.entities, subject.id)) {
      if (subject.canAct) {
        this.phase("subdue");
        return this.advanceWork(context, {
          kind: "subdue",
          targetId: subject.id,
          workTicks: this.state.workTicks,
        });
      }
      this.phase("restrain");
      return this.advanceWork(context, {
        kind: "restrain",
        targetId: subject.id,
        restraintId: this.state.restraintId,
        workTicks: this.state.workTicks,
      });
    }
    if (subject.location.kind === "ground") {
      this.phase("take");
      const result = new Take(subject.id).tick(context);
      return result.status === "completed" ? { status: "running" } : result;
    }
    this.phase("move");
    return new Move(this.state.destination).tick(context);
  }
}
