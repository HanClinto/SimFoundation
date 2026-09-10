import type { Action, ActionContext, ActionResult } from "./Action";
import type { Facility } from "../../Facility";
import type { CraftFunding } from "../../Crafting";
import { facilityInUse } from "../../Facility";
import { recordedFinding } from "../../Study";
import { findSupplyPortions } from "../../Supply";
import { distance, positionOf } from "../../../site/TileMap";
import { Move } from "./Move";

export interface CraftState {
  kind: "craft";
  targetId: string;
  recipeId: string;
  workTicks: number;
  funding?: CraftFunding;
}

export class Craft implements Action {
  constructor(readonly state: CraftState) {}

  canStart({ site, pawn }: ActionContext): string | null {
    const station = site.entities[this.state.targetId];
    if (
      station?.kind !== "facility" ||
      !station.crafting ||
      station.location.kind !== "ground" ||
      (station.integrity ?? 100) <= 0
    )
      return "A usable crafting bench is required.";
    const recipe = station.crafting.recipes.find(
      (entry) => entry.id === this.state.recipeId,
    );
    if (
      !recipe ||
      !Number.isSafeInteger(recipe.ticks) ||
      recipe.ticks < 1 ||
      !Number.isFinite(recipe.amount) ||
      recipe.amount <= 0
    )
      return "Unknown or invalid design; inspect the bench's recipes.";
    if (facilityInUse(site, station.id, pawn.id))
      return "The crafting bench is occupied; resolve its existing funded work first.";
    if (!recordedFinding(site, recipe.requiresFinding))
      return `Research required: ${recipe.requiresFinding}. Record the actual study before crafting.`;
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) {
      this.state.workTicks = 0;
      return { status: "blocked", reason };
    }
    const { site, pawn, tick } = context;
    const station = site.entities[this.state.targetId] as Facility;
    const crafting = station.crafting!;
    const recipe = crafting.recipes.find(
      (entry) => entry.id === this.state.recipeId,
    )!;
    const approach = Move.approach(context, station);
    if (approach) {
      this.state.workTicks = 0;
      return approach;
    }
    const position = positionOf(site, station.id)!;
    if (
      Object.values(site.entities).some(
        (entity) =>
          entity.kind === "item" &&
          entity.crafted?.stationId === station.id &&
          entity.location.kind === "ground" &&
          distance(entity.location.position, position) <= 1,
      )
    )
      return {
        status: "blocked",
        reason: "Clear the previous crafted item from beside the bench.",
      };
    if (!this.state.funding) {
      const research = recordedFinding(site, recipe.requiresFinding)!;
      const portions = findSupplyPortions(
        site,
        recipe.supplyDefinitionId,
        recipe.amount,
        position,
        1,
        pawn.id,
      );
      if (!portions)
        return {
          status: "blocked",
          reason: `Bring ${recipe.amount} ${recipe.supplyDefinitionId} beside the bench or carry it while working.`,
        };
      for (const { source, amount } of portions) source.amount -= amount;
      this.state.funding = {
        inputs: portions.map(({ source, amount }) => ({
          sourceId: source.id,
          amount,
        })),
        startedTick: tick,
        research: structuredClone(research),
      };
    }
    if (++this.state.workTicks < recipe.ticks) return { status: "running" };
    const id = `${station.id}:crafted-${crafting.nextItemId}`;
    if (site.entities[id])
      return {
        status: "blocked",
        reason: "The crafted item identity is already in use.",
      };
    site.entities[id] = {
      ...structuredClone(recipe.output),
      id,
      location: { kind: "ground", position: { ...position } },
      crafted: {
        ...structuredClone(this.state.funding),
        stationId: station.id,
        recipeId: recipe.id,
        actorId: pawn.id,
        tick,
      },
    };
    crafting.nextItemId++;
    return { status: "completed" };
  }
}
