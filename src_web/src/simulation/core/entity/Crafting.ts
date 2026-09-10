import type { ItemBlueprint } from "./Item";
import type { Finding } from "./Study";

export interface CraftingRecipe {
  id: string;
  title: string;
  requiresFinding: string;
  ticks: number;
  supplyDefinitionId: string;
  amount: number;
  output: ItemBlueprint;
}

export interface Crafting {
  recipes: readonly CraftingRecipe[];
  nextItemId: number;
}

export interface CraftFunding {
  inputs: { sourceId: string; amount: number }[];
  startedTick: number;
  research: { stationId: string; finding: Finding };
}

export interface CraftProvenance extends CraftFunding {
  stationId: string;
  recipeId: string;
  actorId: string;
  tick: number;
}
