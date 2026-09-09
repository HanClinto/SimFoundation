import type { Action, ActionContext, ActionResult } from "./Action";
import type { Entity, Position } from "../../Entity";
import {
  floorAt,
  positionOf,
  samePosition,
  traversalAt,
} from "../../../site/TileMap";
import { interactionRoute, route } from "../../../site/Pathfinding";
import { openDoor } from "../../Door";

export class Move implements Action {
  constructor(readonly destination: Position) {}

  canStart({ site, pawn }: ActionContext): string | null {
    if (!pawn.mobile) return "This pawn cannot move independently.";
    return floorAt(site, this.destination)
      ? null
      : "Invalid movement destination.";
  }

  tick(context: ActionContext): ActionResult {
    const { site, pawn, events } = context;
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const origin = positionOf(site, pawn.id)!;
    const destination = traversalAt(site, this.destination, pawn.id);
    if (destination.kind === "blocked")
      return { status: "blocked", reason: destination.reason };
    const path = route(site, origin, this.destination, pawn.id);
    if (!path)
      return { status: "blocked", reason: "No route to the destination." };
    const step = path[0];
    if (!step) return { status: "completed" };
    const traversal = traversalAt(site, step, pawn.id);
    if (traversal.kind === "blocked")
      return { status: "blocked", reason: traversal.reason };
    if (traversal.kind === "open-door") {
      return openDoor(site, traversal.door, events)
        ? { status: "running" }
        : { status: "blocked", reason: "The door is closed." };
    }
    pawn.location = { kind: "ground", position: { ...step } };
    return {
      status: samePosition(step, this.destination) ? "completed" : "running",
    };
  }

  static approach(context: ActionContext, target: Entity): ActionResult | null {
    const path = interactionRoute(context.site, context.pawn.id, target.id);
    if (!path)
      return {
        status: "blocked",
        reason: "The target has no reachable location.",
      };
    if (!path.length) return null;
    const result = new Move(path[path.length - 1]!).tick(context);
    return result.status === "completed" ? { status: "running" } : result;
  }
}
