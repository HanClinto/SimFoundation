import type { Action, ActionContext, ActionResult } from "./Action";
import type { Facility } from "../../Facility";
import { facilityInUse } from "../../Facility";
import { findSupply } from "../../Supply";
import {
  serviceDeadline,
  serviceStatus,
  serviceInputInUse,
} from "../../Service";
import { distance, positionOf } from "../../../site/TileMap";
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
    if (
      target.service.trainingPlanId &&
      !Object.values(site.entities).some(
        (entity) =>
          entity.kind === "facility" &&
          entity.study?.findings.some(
            (finding) =>
              finding.planId === target.service!.trainingPlanId &&
              finding.actorId === pawn.id,
          ),
      )
    )
      return `This worker must complete ${target.service.trainingPlanId} before hosting service.`;
    const participant = target.service.participant;
    if (
      participant &&
      !Object.values(site.entities).some(
        (entity) =>
          entity.kind === "pawn" &&
          entity.canAct &&
          entity.definitionId === participant.definitionId &&
          entity.location.kind === "ground" &&
          distance(entity.location.position, positionOf(site, target.id)!) <=
            participant.range,
      )
    )
      return `Bring ${participant.definitionId} within ${participant.range} tiles of the counter.`;
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
        !repairing && service.distinctInput
          ? service.history
              .filter((entry) => entry.kind === "service")
              .map((entry) => entry.supplyId)
          : [],
      );
      if (!supply)
        return {
          status: "blocked",
          reason: `Bring ${input.amount} ${input.supplyDefinitionId} beside the counter${repairing ? " for repair" : " for service"}${!repairing && service.distinctInput ? "; an unused instance is required" : ""}.`,
        };
      if (repairing || !service.reusableInput) supply.amount -= input.amount;
      this.state.workTicks = 0;
      if (repairing) this.state.repairSupplyId = supply.id;
      else this.state.supplyId = supply.id;
    }
    if (!repairing && service.reusableInput) {
      const supply = site.entities[this.state.supplyId!];
      if (!supply)
        return {
          status: "failed",
          reason: "The active service input is no longer present.",
        };
      if (
        service.distinctInput &&
        service.history.some(
          (entry) => entry.kind === "service" && entry.supplyId === supply.id,
        )
      )
        return {
          status: "failed",
          reason:
            "This programme has already been completed; use an unused print.",
        };
      if (
        supply.definitionId !== service.supplyDefinitionId ||
        supply.amount < service.amount ||
        (supply.integrity ?? 100) <= 0 ||
        (supply.location.kind === "carried"
          ? supply.location.carrierId !== pawn.id
          : distance(supply.location.position, positionOf(site, counter.id)!) >
            1)
      ) {
        this.state.workTicks = 0;
        return {
          status: "blocked",
          reason: "Return the intact active programme beside the counter.",
        };
      }
      if (serviceInputInUse(site, supply.id, pawn.id))
        return {
          status: "blocked",
          reason: "This programme is already in use at another counter.",
        };
    }
    if (++this.state.workTicks < input.ticks) return { status: "running" };
    const deadline = serviceDeadline(service);
    service.history.push({
      kind: repairing ? "repair" : "service",
      tick,
      actorId: pawn.id,
      supplyId: repairing ? this.state.repairSupplyId! : this.state.supplyId!,
      amount: input.amount,
      consumed: repairing || !service.reusableInput,
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
