import type { Action, ActionContext, ActionResult } from "./Action";
import type { Facility } from "../../Facility";
import { facilityInUse } from "../../Facility";
import { findSupply } from "../../Supply";
import { serviceDeadline, serviceStatus } from "../../Service";
import { positionOf } from "../../../site/TileMap";
import { Move } from "./Move";

export interface ServiceState {
  kind: "service";
  targetId: string;
  workTicks: number;
  repairSupplyId?: string;
  supplyId?: string;
}

export class Service implements Action {
  constructor(readonly state: ServiceState) {}

  static offer(context: ActionContext): ServiceState | null {
    const target = context.site.entities[context.pawn.serviceDuty ?? ""];
    return target?.kind === "facility" &&
      target.service &&
      ((target.integrity ?? 100) < 100 ||
        serviceStatus(target.service, context.tick) !== "covered")
      ? { kind: "service", targetId: target.id, workTicks: 0 }
      : null;
  }

  canStart({ site, pawn }: ActionContext): string | null {
    const target = site.entities[this.state.targetId];
    if (
      target?.kind !== "facility" ||
      !target.service ||
      target.location.kind !== "ground"
    )
      return "Choose an installed service counter.";
    if (facilityInUse(site, target.id, pawn.id))
      return "The service counter is occupied.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const { pawn, site, tick } = context;
    const counter = site.entities[this.state.targetId] as Facility;
    const service = counter.service!;
    const repairing = (counter.integrity ?? 100) < 100;
    if (
      !repairing &&
      !this.state.supplyId &&
      serviceStatus(service, tick) === "covered"
    )
      return { status: "completed" };
    const approach = Move.approach(context, counter);
    if (approach) return approach;
    const input = repairing ? service.repair : service;
    const paid = repairing ? this.state.repairSupplyId : this.state.supplyId;
    if (!paid) {
      const supply = findSupply(
        site,
        input.supplyDefinitionId,
        input.amount,
        positionOf(site, counter.id)!,
        1,
        pawn.id,
      );
      if (!supply)
        return {
          status: "blocked",
          reason: `Bring ${input.amount} ${input.supplyDefinitionId} beside the counter${repairing ? " for repair" : " for service"}.`,
        };
      supply.amount -= input.amount;
      this.state.workTicks = 0;
      if (repairing) this.state.repairSupplyId = supply.id;
      else this.state.supplyId = supply.id;
    }
    if (++this.state.workTicks < input.ticks) return { status: "running" };
    const deadline = serviceDeadline(service);
    service.history.push({
      kind: repairing ? "repair" : "service",
      tick,
      actorId: pawn.id,
      supplyId: repairing ? this.state.repairSupplyId! : this.state.supplyId!,
      amount: input.amount,
      lateBy: repairing || deadline === null ? 0 : Math.max(0, tick - deadline),
    });
    if (repairing) {
      counter.integrity = 100;
      delete this.state.repairSupplyId;
      this.state.workTicks = 0;
      return { status: "running" };
    }
    return { status: "completed" };
  }
}
