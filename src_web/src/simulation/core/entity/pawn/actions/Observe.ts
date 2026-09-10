import type { Action, ActionContext, ActionResult } from "./Action";
import { heldRecorder } from "../../ImpactRecording";
import { canSee } from "../../../site/Visibility";

export interface ObserveState {
  kind: "observe";
  targetId: string;
  recorderId: string;
  workTicks: number;
}

export class Observe implements Action {
  constructor(readonly state: ObserveState) {}

  canStart({ site, pawn }: ActionContext): string | null {
    const target = site.entities[this.state.targetId];
    if (
      target?.kind !== "pawn" ||
      target.id === pawn.id ||
      target.health?.death
    )
      return "Choose a different living actor to observe.";
    const recorder = heldRecorder(site, pawn.id, this.state.recorderId);
    if (!recorder) return "Carry an intact impact recorder while observing.";
    if (
      recorder.impactRecorder!.records.length >=
      recorder.impactRecorder!.capacity
    )
      return "This recorder is full; its existing physical records are retained.";
    if (!canSee(site, pawn, target.id))
      return "No clear view of the actor. Choose a visible vantage; observation does not walk into danger.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const recorder = heldRecorder(
      context.site,
      context.pawn.id,
      this.state.recorderId,
    );
    const actionId = context.pawn.queue[0]?.id;
    if (
      actionId &&
      recorder?.impactRecorder!.records.some(
        (record) => record.actionId === actionId,
      )
    )
      return { status: "completed" };
    const reason = this.canStart(context);
    if (reason) {
      this.state.workTicks = 0;
      return { status: "blocked", reason };
    }
    this.state.workTicks++;
    return { status: "running" };
  }
}
