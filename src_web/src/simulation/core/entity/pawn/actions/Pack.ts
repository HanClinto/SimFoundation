import type { Action, ActionContext, ActionResult } from "./Action";
import type { Item } from "../../Item";
import { positionOf } from "../../../site/TileMap";
import { Move } from "./Move";

export interface PackState {
  kind: "pack";
  targetId: string;
  caseId: string;
  workTicks: number;
}

export interface UnpackState {
  kind: "unpack";
  targetId: string;
  workTicks: number;
}

export class Pack implements Action {
  constructor(readonly state: PackState) {}

  canStart({ site, pawn }: ActionContext): string | null {
    const target = site.entities[this.state.targetId];
    const container = site.entities[this.state.caseId];
    if (
      target?.kind !== "item" ||
      target.case ||
      target.location.kind !== "ground" ||
      target.amount <= 0 ||
      (target.integrity ?? 100) <= 0
    )
      return "Choose an intact, loose nonliving specimen.";
    if (
      container?.kind !== "item" ||
      !container.case ||
      container.location.kind !== "carried" ||
      container.location.carrierId !== pawn.id
    )
      return "Carry an actual protective case before sealing the specimen.";
    if (!container.case.accepts.includes(target.definitionId))
      return "This case is incompatible with the specimen.";
    if (
      container.case.sealed ||
      Object.values(site.entities).some(
        (entity) =>
          entity.location.kind === "carried" &&
          entity.location.carrierId === container.id,
      )
    )
      return "Empty and open the case before loading another specimen.";
    if ((container.integrity ?? 100) <= container.case.sealWear)
      return "The case is too worn to complete another safe seal.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const target = context.site.entities[this.state.targetId]!;
    const container = context.site.entities[this.state.caseId] as Item;
    const approach = Move.approach(context, target);
    if (approach) {
      this.state.workTicks = 0;
      return approach;
    }
    if (++this.state.workTicks < container.case!.sealTicks)
      return { status: "running" };
    container.integrity =
      (container.integrity ?? 100) - container.case!.sealWear;
    container.case!.sealed = true;
    target.location = { kind: "carried", carrierId: container.id };
    return { status: "completed" };
  }
}

export class Unpack implements Action {
  constructor(readonly state: UnpackState) {}

  canStart({ site, pawn }: ActionContext): string | null {
    const container = site.entities[this.state.targetId];
    if (
      container?.kind !== "item" ||
      !container.case?.sealed ||
      (container.location.kind === "carried" &&
        container.location.carrierId !== pawn.id)
    )
      return "Choose a sealed case on the ground or carried by this worker.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const container = context.site.entities[this.state.targetId] as Item;
    const approach = Move.approach(context, container);
    if (approach) {
      this.state.workTicks = 0;
      return approach;
    }
    if (++this.state.workTicks < 2) return { status: "running" };
    for (const entity of Object.values(context.site.entities)) {
      if (
        entity.location.kind === "carried" &&
        entity.location.carrierId === container.id
      )
        entity.location = {
          kind: "ground",
          position: { ...positionOf(context.site, context.pawn.id)! },
        };
    }
    container.case!.sealed = false;
    return { status: "completed" };
  }
}
