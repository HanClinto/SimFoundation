import type { Action, ActionContext, ActionResult } from "./Action";

export class Wait implements Action {
  constructor(readonly ticks: number) {}

  canStart(): string | null {
    return Number.isSafeInteger(this.ticks) && this.ticks > 0
      ? null
      : "Wait duration must be positive whole ticks.";
  }

  tick(_context: ActionContext, elapsed: number): ActionResult {
    const reason = this.canStart();
    return reason
      ? { status: "blocked", reason }
      : { status: elapsed + 1 >= this.ticks ? "completed" : "running" };
  }
}
