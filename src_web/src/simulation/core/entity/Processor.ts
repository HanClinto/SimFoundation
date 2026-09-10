import type { ItemBlueprint } from "./Item";
import type { Facility } from "./Facility";
import type { Position } from "./Entity";
import type { Site } from "../site/Site";
import type { TickEvent } from "../Simulation";
import { floorAt, samePosition } from "../site/TileMap";

export interface ProcessingRecipe {
  id: string;
  title: string;
  inputDefinitionId: string;
  ticks: number;
  output: ItemBlueprint;
}

export interface ProcessingRun {
  id: string;
  recipeId: string;
  inputId: string;
  inputDefinitionId: string;
  inputCondition: number;
  actorId: string;
  startedTick: number;
  completesAt: number;
  blockedReason?: string;
}

export interface ProcessedProvenance {
  runId: string;
  machineId: string;
  recipeId: string;
  inputId: string;
  inputDefinitionId: string;
  inputCondition: number;
  actorId: string;
  startedTick: number;
  tick: number;
}

export interface Processor {
  activationTicks: number;
  intakeOffset: Position;
  operatorOffset: Position;
  outputOffset: Position;
  recipes: readonly ProcessingRecipe[];
  nextRunId: number;
  current: ProcessingRun | null;
}

export function processingPorts(machine: Facility) {
  if (!machine.processor || machine.location.kind !== "ground") return null;
  const origin = machine.location.position;
  const offset = (position: Position): Position => ({
    x: origin.x + position.x,
    y: origin.y + position.y,
  });
  return {
    intake: offset(machine.processor.intakeOffset),
    operator: offset(machine.processor.operatorOffset),
    output: offset(machine.processor.outputOffset),
  };
}

export function portOccupant(
  site: Site,
  position: Position,
  allowedIds: readonly string[] = [],
) {
  return Object.values(site.entities)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .find(
      (entity) =>
        !allowedIds.includes(entity.id) &&
        entity.amount > 0 &&
        entity.location.kind === "ground" &&
        samePosition(entity.location.position, position),
    );
}

export function advanceProcessor(
  site: Site,
  machine: Facility,
  tick: number,
  events: TickEvent[],
): void {
  const processor = machine.processor;
  const run = processor?.current;
  if (!processor || !run || tick < run.completesAt) return;
  const block = (reason: string) => {
    if (run.blockedReason !== reason)
      events.push({
        siteId: site.id,
        entityId: machine.id,
        targetId: run.inputId,
        kind: "warning",
        reason,
      });
    run.blockedReason = reason;
  };
  const ports = processingPorts(machine);
  if (
    !ports ||
    (machine.integrity ?? 100) <= 0 ||
    !floorAt(site, ports.output)
  ) {
    block(
      "Processing output requires an intact installed machine and usable output port.",
    );
    return;
  }
  const input = site.entities[run.inputId];
  if (
    input?.kind !== "item" ||
    input.amount !== 1 ||
    input.definitionId !== run.inputDefinitionId ||
    input.location.kind !== "carried" ||
    input.location.carrierId !== machine.id
  ) {
    block(
      "The committed processing input is missing or no longer whole in machine custody.",
    );
    return;
  }
  const recipe = processor.recipes.find((entry) => entry.id === run.recipeId);
  if (!recipe || recipe.inputDefinitionId !== input.definitionId) {
    block("The committed processing recipe is unavailable.");
    return;
  }
  const obstruction = portOccupant(site, ports.output);
  if (obstruction) {
    block(
      `Clear the output port: ${obstruction.name} [${obstruction.id}] is present.`,
    );
    return;
  }
  const outputId = `${run.id}:output`;
  if (site.entities[outputId]) {
    block("The processing output identity is already in use.");
    return;
  }
  input.amount = 0;
  site.entities[outputId] = {
    ...structuredClone(recipe.output),
    id: outputId,
    location: { kind: "ground", position: { ...ports.output } },
    processed: {
      runId: run.id,
      machineId: machine.id,
      recipeId: run.recipeId,
      inputId: run.inputId,
      inputDefinitionId: run.inputDefinitionId,
      inputCondition: run.inputCondition,
      actorId: run.actorId,
      startedTick: run.startedTick,
      tick,
    },
  };
  processor.current = null;
  events.push({
    siteId: site.id,
    entityId: machine.id,
    targetId: outputId,
    kind: "processed",
    reason: `${recipe.title} completed; the actual input was consumed and ${outputId} is at the output port.`,
  });
}
