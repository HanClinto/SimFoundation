import type { Action, ActionContext, ActionResult } from "./Action";
import type { Facility } from "../../Facility";
import { facilityInUse } from "../../Facility";
import type { Item } from "../../Item";
import { distance, positionOf } from "../../../site/TileMap";
import { Move } from "./Move";

export interface DispenseState {
  kind: "dispense";
  targetId: string;
  requestId: string;
  sourceId?: string;
  workTicks: number;
  paymentId?: string;
}

export class Dispense implements Action {
  constructor(readonly state: DispenseState) {}

  canStart({ site, pawn }: ActionContext): string | null {
    const machine = site.entities[this.state.targetId];
    if (
      machine?.kind !== "facility" ||
      !machine.dispenser ||
      machine.location.kind !== "ground" ||
      (machine.integrity ?? 100) <= 0
    )
      return "A usable dispensing machine is required.";
    const request = machine.dispenser.requests.find(
      (entry) => entry.id === this.state.requestId,
    );
    if (!request)
      return "Unknown request; inspect the machine's approved requests.";
    if (request.rejection && this.state.sourceId)
      return "This request does not accept a source.";
    if (!request.rejection && !this.state.sourceId)
      return "Choose the physical source for this request.";
    if (facilityInUse(site, machine.id, pawn.id))
      return "The dispensing machine is occupied.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const { site, pawn, tick } = context;
    const machine = site.entities[this.state.targetId] as Facility;
    const dispenser = machine.dispenser!;
    const request = dispenser.requests.find(
      (entry) => entry.id === this.state.requestId,
    )!;
    const approach = Move.approach(context, machine);
    if (approach) {
      this.state.workTicks = 0;
      return approach;
    }
    const position = positionOf(site, machine.id)!;
    if (
      Object.values(site.entities).some(
        (entity) =>
          entity.kind === "item" &&
          entity.sample?.machineId === machine.id &&
          entity.location.kind === "ground" &&
          distance(entity.location.position, position) <= 1,
      )
    )
      return {
        status: "blocked",
        reason:
          "Clear the previous sample from beside the machine before requesting another.",
      };
    const source = this.state.sourceId
      ? site.entities[this.state.sourceId]
      : undefined;
    if (!request.rejection) {
      if (!source)
        return {
          status: "failed",
          reason: "The named liquid source is no longer at this site.",
        };
      if (
        source.kind !== "item" ||
        source.definitionId !== request.sourceDefinitionId ||
        (source.integrity ?? 100) <= 0 ||
        source.location.kind !== "ground"
      )
        return {
          status: "blocked",
          reason: "Use the intact, grounded source specified by this request.",
        };
      if (source.amount < dispenser.portion)
        return {
          status: "blocked",
          reason: "The named source has less than one portion remaining.",
        };
    }
    if (!this.state.paymentId) {
      const payment = Object.values(site.entities)
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .find(
          (entity) =>
            entity.kind === "item" &&
            entity.definitionId === dispenser.paymentDefinitionId &&
            entity.amount >= 1 &&
            (entity.integrity ?? 100) > 0 &&
            (entity.location.kind === "ground" ||
              entity.location.carrierId === pawn.id) &&
            distance(positionOf(site, entity.id)!, position) <= 1,
        );
      if (!payment)
        return {
          status: "blocked",
          reason: `Bring ${dispenser.paymentDefinitionId} beside the machine (or carry it while operating).`,
        };
      payment.amount--;
      this.state.paymentId = payment.id;
    }
    if (++this.state.workTicks < request.ticks) return { status: "running" };
    if (request.rejection) {
      dispenser.records.push({
        requestId: request.id,
        actorId: pawn.id,
        tick,
        paymentId: this.state.paymentId,
        amount: 0,
        result: request.rejection,
      });
      return { status: "completed" };
    }
    const id = `${machine.id}:sample-${dispenser.nextSampleId}`;
    if (site.entities[id])
      return {
        status: "blocked",
        reason: "The sample identity is already in use.",
      };
    const sample: Item = {
      kind: "item",
      id,
      definitionId: request.sampleDefinitionId!,
      name: `${request.title} sample ${dispenser.nextSampleId}`,
      materialId: source!.materialId,
      amount: dispenser.portion,
      nutrition: source!.nutrition,
      integrity: 100,
      carryable: true,
      blocksMovement: false,
      blocksSight: false,
      location: { kind: "ground", position: { ...position } },
      sample: {
        machineId: machine.id,
        requestId: request.id,
        sourceId: source!.id,
        actorId: pawn.id,
        tick,
        amount: dispenser.portion,
      },
    };
    source!.amount -= dispenser.portion;
    dispenser.nextSampleId++;
    site.entities[id] = sample;
    dispenser.records.push({
      requestId: request.id,
      actorId: pawn.id,
      tick,
      paymentId: this.state.paymentId,
      sourceId: source!.id,
      sampleId: id,
      amount: dispenser.portion,
      result: "Dispensed",
    });
    return { status: "completed" };
  }
}
