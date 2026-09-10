import type { Action, ActionContext, ActionResult } from "./Action";
import type { Position } from "../../Entity";
import {
  distance,
  positionOf,
  samePosition,
  traversalAt,
} from "../../../site/TileMap";
import { Move } from "./Move";
import { route } from "../../../site/Pathfinding";

export interface EscortState {
  kind: "escort";
  targetId: string;
  destination: Position;
}

export interface FollowState {
  kind: "follow";
  targetId: string;
  escortActionId: string;
}

export class Escort implements Action {
  constructor(readonly state: EscortState) {}

  canStart(context: ActionContext): string | null {
    const reason = new Move(this.state.destination).canStart(context);
    if (reason) return reason;
    const { pawn, site } = context;
    const person = site.entities[this.state.targetId];
    if (
      person?.kind !== "pawn" ||
      person.id === pawn.id ||
      !person.acceptsEscort
    )
      return "Choose another person who explicitly accepts cooperative escort.";
    if (!person.canAct || !person.mobile || person.location.kind !== "ground")
      return "The person cannot walk; stabilize and carry them instead.";
    const current = person.queue[0]?.action;
    if (
      person.queue.length &&
      !(
        current?.kind === "follow" &&
        current.targetId === pawn.id &&
        current.escortActionId === pawn.queue[0]?.id
      )
    )
      return "The person is already committed to other work or an escort.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const { pawn, site } = context;
    const person = site.entities[this.state.targetId]!;
    if (person.kind !== "pawn")
      return {
        status: "failed",
        reason: "The escorted person is no longer present.",
      };
    const escortActionId = pawn.queue[0]!.id;
    if (samePosition(positionOf(site, person.id)!, this.state.destination))
      return { status: "completed" };
    const separation = distance(
      positionOf(site, pawn.id)!,
      positionOf(site, person.id)!,
    );
    if (!person.queue.length) {
      if (separation > 1) return Move.approach(context, person)!;
      person.queue.push({
        id: `follow:${escortActionId}:${person.id}`,
        source: "script",
        action: { kind: "follow", targetId: pawn.id, escortActionId },
        elapsed: 0,
        blockedReason: null,
      });
    }
    if (samePosition(positionOf(site, pawn.id)!, this.state.destination)) {
      const { x, y } = this.state.destination;
      const aside = [
        { x: x + 1, y },
        { x, y: y + 1 },
        { x: x - 1, y },
        { x, y: y - 1 },
      ].find((point) => {
        if (traversalAt(site, point, pawn.id).kind === "blocked") return false;
        const yielded = {
          ...site,
          entities: {
            ...site.entities,
            [pawn.id]: {
              ...pawn,
              location: { kind: "ground" as const, position: point },
            },
          },
        };
        return (
          route(
            yielded,
            positionOf(site, person.id)!,
            this.state.destination,
            person.id,
          ) !== null
        );
      });
      if (!aside)
        return {
          status: "blocked",
          reason: "No space to step aside for the escorted person.",
        };
      const result = new Move(aside).tick(context);
      return result.status === "completed" ? { status: "running" } : result;
    }
    if (distance(positionOf(site, pawn.id)!, this.state.destination) === 1) {
      if (
        route(
          site,
          positionOf(site, person.id)!,
          this.state.destination,
          person.id,
        )
      )
        return { status: "running" };
      const result = new Move(this.state.destination).tick(context);
      return result.status === "completed" ? { status: "running" } : result;
    }
    if (separation > 1)
      return {
        status: "blocked",
        reason: `Waiting for ${person.name} to catch up${person.queue[0]?.blockedReason ? `: ${person.queue[0].blockedReason}` : "."}`,
      };
    const result = new Move(this.state.destination).tick(context);
    return result.status === "completed" ? { status: "running" } : result;
  }
}

export class Follow implements Action {
  constructor(readonly state: FollowState) {}

  canStart({ pawn }: ActionContext): string | null {
    return pawn.acceptsEscort && pawn.mobile
      ? null
      : "Cooperative following is no longer available.";
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "interrupted", reason };
    const leader = context.site.entities[this.state.targetId];
    const current = leader?.kind === "pawn" ? leader.queue[0] : undefined;
    if (
      !current ||
      current.id !== this.state.escortActionId ||
      current.action.kind !== "escort" ||
      current.action.targetId !== context.pawn.id ||
      leader?.kind !== "pawn" ||
      !leader.canAct ||
      leader.location.kind !== "ground" ||
      (current.source === "player" && !leader.playerControllable)
    )
      return { status: "completed" };
    if (
      distance(
        positionOf(context.site, leader.id)!,
        current.action.destination,
      ) <= 1
    ) {
      const result = new Move(current.action.destination).tick(context);
      return result.status === "completed" ? { status: "running" } : result;
    }
    return Move.approach(context, leader) ?? { status: "running" };
  }
}
