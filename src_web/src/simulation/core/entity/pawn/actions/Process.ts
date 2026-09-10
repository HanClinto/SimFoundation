import type { Action, ActionContext, ActionResult } from "./Action";
import type { Facility } from "../../Facility";
import { facilityInUse } from "../../Facility";
import { processingPorts, portOccupant } from "../../Processor";
import { availableForRecovery, equipmentUnderRepair } from "../../Equipment";
import { floorAt, positionOf, samePosition } from "../../../site/TileMap";
import { Deliver } from "./Deliver";
import { Move } from "./Move";

export interface ProcessState {
  kind: "process";
  targetId: string;
  inputId: string;
  recipeId: string;
  workTicks: number;
}

export class Process implements Action {
  constructor(readonly state: ProcessState) {}

  canStart(context: ActionContext): string | null {
    const { site, pawn } = context;
    const machine = site.entities[this.state.targetId];
    if (
      machine?.kind !== "facility" ||
      !machine.processor ||
      machine.location.kind !== "ground" ||
      (machine.integrity ?? 100) <= 0
    )
      return "Choose an intact installed processing apparatus.";
    if (machine.processor.current)
      return "This apparatus already owns an active processing cycle.";
    if (facilityInUse(site, machine.id, pawn.id))
      return "The processing controls are occupied.";
    const recipe = machine.processor.recipes.find(
      (entry) => entry.id === this.state.recipeId,
    );
    if (
      !recipe ||
      !Number.isSafeInteger(recipe.ticks) ||
      recipe.ticks < 1 ||
      !Number.isSafeInteger(machine.processor.activationTicks) ||
      machine.processor.activationTicks < 1
    )
      return "Choose an approved processing recipe.";
    const input = site.entities[this.state.inputId];
    if (
      input?.kind !== "item" ||
      input.definitionId !== recipe.inputDefinitionId ||
      input.amount !== 1
    )
      return `This approved trial requires one actual ${recipe.inputDefinitionId}, not another item, stack or living subject.`;
    if (input.equipment?.worn || input.restraint?.attached)
      return "Recover and unequip the actual input before processing it.";
    if (equipmentUnderRepair(site, input.id))
      return "Resolve funded equipment repair before committing this input.";
    if (!availableForRecovery(site, input, pawn.id))
      return "The input belongs to another active holder or machine.";
    const ports = processingPorts(machine)!;
    if (
      !floorAt(site, ports.intake) ||
      !floorAt(site, ports.operator) ||
      !floorAt(site, ports.output)
    )
      return "The processing ports must remain usable floor.";
    const positions = [
      ports.intake,
      ports.operator,
      ports.output,
      machine.location.position,
    ];
    if (
      positions.some((position, index) =>
        positions
          .slice(index + 1)
          .some((other) => samePosition(position, other)),
      )
    )
      return "Use distinct intake, control, output and machine positions.";
    const intake = portOccupant(site, ports.intake, [input.id, pawn.id]);
    if (intake)
      return `Clear the intake port: ${intake.name} [${intake.id}] is present.`;
    const output = portOccupant(site, ports.output, [pawn.id]);
    if (output)
      return `Clear the output port: ${output.name} [${output.id}] is present.`;
    return new Deliver({
      kind: "deliver",
      targetId: input.id,
      destination: ports.intake,
    }).canStart(context);
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) {
      this.state.workTicks = 0;
      return { status: "blocked", reason };
    }
    const { site, pawn, tick } = context;
    const machine = site.entities[this.state.targetId] as Facility;
    const processor = machine.processor!;
    const ports = processingPorts(machine)!;
    const input = site.entities[this.state.inputId]!;
    if (
      input.location.kind !== "ground" ||
      !samePosition(input.location.position, ports.intake)
    ) {
      this.state.workTicks = 0;
      const delivered = new Deliver({
        kind: "deliver",
        targetId: input.id,
        destination: ports.intake,
      }).tick(context);
      return delivered.status === "completed"
        ? { status: "running" }
        : delivered;
    }
    if (!samePosition(positionOf(site, pawn.id)!, ports.operator)) {
      this.state.workTicks = 0;
      const moved = new Move(ports.operator).tick(context);
      return moved.status === "completed" ? { status: "running" } : moved;
    }
    if (++this.state.workTicks < processor.activationTicks)
      return { status: "running" };
    const recipe = processor.recipes.find(
      (entry) => entry.id === this.state.recipeId,
    )!;
    const id = `${machine.id}:process-${processor.nextRunId}`;
    input.location = { kind: "carried", carrierId: machine.id };
    processor.current = {
      id,
      recipeId: recipe.id,
      inputId: input.id,
      inputDefinitionId: input.definitionId,
      inputCondition: input.integrity ?? 100,
      actorId: pawn.id,
      startedTick: tick,
      completesAt: tick + recipe.ticks,
    };
    processor.nextRunId++;
    return { status: "completed" };
  }
}
