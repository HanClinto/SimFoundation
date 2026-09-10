import type { Action, ActionContext, ActionResult } from "./Action";
import { visibleThreats } from "../../../site/Visibility";
import { distance, positionOf, traversalAt } from "../../../site/TileMap";
import { Move } from "./Move";

export class Flee implements Action {
  constructor(readonly targetId: string) {}

  canStart({ pawn }: ActionContext): string | null {
    return pawn.mobile && pawn.response
      ? null
      : "This pawn cannot withdraw independently.";
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const { site, pawn } = context;
    const threats = visibleThreats(site, pawn);
    if (!threats.length) return { status: "completed" };
    const origin = positionOf(site, pawn.id)!;
    const separation = (position: typeof origin) =>
      Math.min(
        ...threats.map((threat) =>
          distance(position, positionOf(site, threat.id)!),
        ),
      );
    const candidates = [
      { x: origin.x, y: origin.y - 1 },
      { x: origin.x - 1, y: origin.y },
      { x: origin.x + 1, y: origin.y },
      { x: origin.x, y: origin.y + 1 },
    ].filter(
      (position) =>
        traversalAt(site, position, pawn.id).kind !== "blocked" &&
        separation(position) > separation(origin),
    );
    candidates.sort((first, second) => separation(second) - separation(first));
    const destination = candidates[0];
    if (!destination)
      return {
        status: "blocked",
        reason: "No safer adjacent tile is reachable.",
      };
    const result = new Move(destination).tick(context);
    if (result.status === "blocked") return result;
    const current = positionOf(site, pawn.id)!;
    if (distance(origin, current) > 0)
      context.events.push({
        siteId: site.id,
        entityId: pawn.id,
        kind: "fled",
        targetId: this.targetId,
      });
    return { status: "running" };
  }
}
