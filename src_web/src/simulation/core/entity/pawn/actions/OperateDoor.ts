import type { Action, ActionContext, ActionResult } from "./Action";
import type { Door } from "../../Door";
import { Move } from "./Move";
import { samePosition } from "../../../site/TileMap";

export interface OperateDoorState {
  kind: "door";
  targetId: string;
  policy: Door["policy"];
  workTicks: number;
}

export class OperateDoor implements Action {
  constructor(readonly state: OperateDoorState) {}
  canStart({ site }: ActionContext): string | null {
    const door = site.entities[this.state.targetId];
    if (
      door?.kind !== "door" ||
      door.location.kind !== "ground" ||
      (door.integrity ?? 100) <= 0
    )
      return "Choose a usable installed door.";
    if (!["automatic", "held-open", "held-closed"].includes(this.state.policy))
      return "Choose open, closed or automatic door policy.";
    return null;
  }
  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const door = context.site.entities[this.state.targetId] as Door;
    const approach = Move.approach(context, door);
    if (approach) {
      this.state.workTicks = 0;
      return approach;
    }
    if (
      this.state.policy === "held-closed" &&
      Object.values(context.site.entities).some(
        (entity) =>
          entity.id !== door.id &&
          entity.location.kind === "ground" &&
          door.location.kind === "ground" &&
          samePosition(entity.location.position, door.location.position),
      )
    ) {
      this.state.workTicks = 0;
      return {
        status: "blocked",
        reason: "Clear the doorway before closing it.",
      };
    }
    if (++this.state.workTicks < 2) return { status: "running" };
    door.policy = this.state.policy;
    if (this.state.policy !== "automatic") {
      const open = this.state.policy === "held-open";
      if (door.open !== open) {
        door.open = open;
        context.events.push({
          siteId: context.site.id,
          entityId: door.id,
          targetId: context.pawn.id,
          kind: open ? "opened" : "closed",
          reason: `Physical policy set to ${this.state.policy}.`,
        });
      }
    }
    return { status: "completed" };
  }
}
