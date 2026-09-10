import type { Position } from "../../Entity";
import type { Action, ActionContext, ActionResult } from "./Action";
import { positionOf, samePosition } from "../../../site/TileMap";
import { Take } from "./Take";
import { Move } from "./Move";
import { Drop } from "./Drop";

export interface DeliverState {
  kind: "deliver";
  targetId: string;
  destination: Position;
}

export class Deliver implements Action {
  constructor(readonly state: DeliverState) {}

  canStart(context: ActionContext): string | null {
    const reason = new Move(this.state.destination).canStart(context);
    if (reason) return reason;
    const target = context.site.entities[this.state.targetId];
    if (
      target?.location.kind === "carried" &&
      target.location.carrierId === context.pawn.id
    )
      return null;
    if (
      target?.location.kind === "ground" &&
      samePosition(target.location.position, this.state.destination)
    )
      return null;
    return new Take(this.state.targetId).canStart(context);
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const target = context.site.entities[this.state.targetId]!;
    if (target.location.kind === "ground") {
      if (samePosition(target.location.position, this.state.destination))
        return { status: "completed" };
      const result = new Take(target.id).tick(context);
      return result.status === "completed" ? { status: "running" } : result;
    }
    if (
      !samePosition(
        positionOf(context.site, context.pawn.id)!,
        this.state.destination,
      )
    ) {
      const result = new Move(this.state.destination).tick(context);
      return result.status === "completed" ? { status: "running" } : result;
    }
    return new Drop(target.id).tick(context);
  }
}
