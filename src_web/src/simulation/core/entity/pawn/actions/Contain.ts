import type { Action, ActionContext, ActionResult } from "./Action";
import type { Facility } from "../../Facility";
import { facilityInUse } from "../../Facility";
import { secureContainment, containmentFor } from "../../Containment";
import { restraintFor } from "../Custody";
import { Take } from "./Take";
import { Move } from "./Move";
import { positionOf } from "../../../site/TileMap";
import { findSupply } from "../../Supply";
import { serviceStatus } from "../../Service";

export interface ContainState {
  kind: "contain";
  targetId: string;
  cellId: string;
  workTicks: number;
}
export interface LockdownState {
  kind: "lockdown";
  targetId: string;
  workTicks: number;
  supplyId?: string;
}

export class Contain implements Action {
  constructor(readonly state: ContainState) {}
  canStart({ site, pawn, tick }: ActionContext): string | null {
    const subject = site.entities[this.state.targetId];
    if (
      subject?.kind !== "pawn" ||
      !subject.requiresRestraint ||
      subject.health?.death
    )
      return "Choose a living custody subject.";
    if (!restraintFor(site.entities, subject.id))
      return "Apply an effective physical transport restraint before intake.";
    if (
      subject.location.kind === "carried" &&
      subject.location.carrierId !== pawn.id
    )
      return "This worker must own the subject's physical transport.";
    const cell = site.entities[this.state.cellId];
    if (cell?.kind !== "facility" || !secureContainment(cell, tick))
      return "Repair and provision a secure holding cell before intake.";
    if (facilityInUse(site, cell.id, pawn.id))
      return "Finish current cell work before intake.";
    if (!cell.containment!.accepts.includes(subject.definitionId))
      return "The holding cell is incompatible with this subject.";
    if (
      Object.values(site.entities).some(
        (entity) =>
          entity.location.kind === "carried" &&
          entity.location.carrierId === cell.id,
      )
    )
      return "The holding cell is occupied.";
    return null;
  }
  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const subject = context.site.entities[this.state.targetId]!;
    if (subject.location.kind === "ground") {
      const result = new Take(subject.id).tick(context);
      return result.status === "completed" ? { status: "running" } : result;
    }
    const cell = context.site.entities[this.state.cellId] as Facility;
    const approach = Move.approach(context, cell);
    if (approach) {
      this.state.workTicks = 0;
      return approach;
    }
    if (++this.state.workTicks < cell.containment!.intakeTicks)
      return { status: "running" };
    subject.location = { kind: "carried", carrierId: cell.id };
    if (
      (cell.service && serviceStatus(cell.service, context.tick) === "due") ||
      (cell.containment!.lockdown.untilTick ?? Infinity) - context.tick <= 10
    )
      context.events.push({
        siteId: context.site.id,
        entityId: cell.id,
        targetId: subject.id,
        kind: "warning",
        reason:
          "Intake completed with containment coverage already near expiry; service or lockdown is required.",
      });
    return { status: "completed" };
  }
}

export class Unrestrain implements Action {
  constructor(readonly targetId: string) {}
  canStart({ site, tick }: ActionContext): string | null {
    const subject = site.entities[this.targetId];
    if (subject?.kind !== "pawn" || !restraintFor(site.entities, subject.id))
      return "Choose a subject with an effective restraint.";
    const cell = containmentFor(site.entities, subject.id);
    if (!subject.health?.death && !(cell && secureContainment(cell, tick)))
      return "Remove live restraints only inside effective containment.";
    return null;
  }
  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const subject = context.site.entities[this.targetId]!;
    const approach = Move.approach(context, subject);
    if (approach) return approach;
    const band = restraintFor(context.site.entities, subject.id)!;
    band.restraint!.attached = false;
    band.location = {
      kind: "ground",
      position: { ...positionOf(context.site, context.pawn.id)! },
    };
    return { status: "completed" };
  }
}

export class Lockdown implements Action {
  constructor(readonly state: LockdownState) {}
  canStart({ site, tick, pawn }: ActionContext): string | null {
    const cell = site.entities[this.state.targetId];
    if (
      cell?.kind !== "facility" ||
      !cell.containment ||
      cell.location.kind !== "ground" ||
      (cell.integrity ?? 100) <= 0
    )
      return "Choose a standing containment cell.";
    if ((cell.containment.lockdown.untilTick ?? -1) > tick)
      return "Emergency lockdown is already active.";
    if (facilityInUse(site, cell.id, pawn.id))
      return "The containment controls are occupied.";
    return null;
  }
  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const cell = context.site.entities[this.state.targetId] as Facility;
    const approach = Move.approach(context, cell);
    if (approach) return approach;
    const fallback = cell.containment!.lockdown;
    if (!this.state.supplyId) {
      const pack = findSupply(
        context.site,
        fallback.supplyDefinitionId,
        1,
        positionOf(context.site, cell.id)!,
        1,
        context.pawn.id,
      );
      if (!pack)
        return {
          status: "blocked",
          reason: `Bring ${fallback.supplyDefinitionId} for physical emergency lockdown.`,
        };
      pack.amount--;
      this.state.supplyId = pack.id;
    }
    if (++this.state.workTicks < fallback.ticks) return { status: "running" };
    fallback.untilTick = context.tick + fallback.duration;
    return { status: "completed" };
  }
}
