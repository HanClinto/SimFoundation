import type { Action, ActionContext, ActionResult } from "./Action";
import type { Entity, Position } from "../../Entity";
import {
  distance,
  doorAt,
  floorAt,
  positionOf,
  samePosition,
} from "../../../site/TileMap";
import { route } from "../../../site/Pathfinding";
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
    const path = route(site, origin, this.destination);
    if (!path)
      return { status: "blocked", reason: "No route to the destination." };
    const step = path[0];
    if (!step) return { status: "completed" };
    if (
      Object.values(site.entities).some(
        (entity) =>
          entity.kind === "pawn" &&
          entity.id !== pawn.id &&
          entity.location.kind === "ground" &&
          samePosition(entity.location.position, step),
      )
    )
      return { status: "blocked", reason: "The destination is occupied." };
    const door = doorAt(site, step);
    if (door && !door.open) {
      return openDoor(site, door, events)
        ? { status: "running" }
        : { status: "blocked", reason: "The door is closed." };
    }
    pawn.location = { kind: "ground", position: { ...step } };
    return {
      status: samePosition(step, this.destination) ? "completed" : "running",
    };
  }

  static approach(context: ActionContext, target: Entity): ActionResult | null {
    const origin = positionOf(context.site, context.pawn.id);
    const destination = positionOf(context.site, target.id);
    if (!origin || !destination)
      return {
        status: "blocked",
        reason: "The target has no reachable location.",
      };
    if (distance(origin, destination) <= 1) return null;
    const result = new Move(destination).tick(context);
    return result.status === "completed" ? { status: "running" } : result;
  }
}
