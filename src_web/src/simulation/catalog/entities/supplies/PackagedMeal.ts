import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { PlantFood } from "../../materials/PlantFood";

export const PackagedMeal = {
  id: "packaged-meal",
  name: "Packaged meal",
  description:
    "One portion of prepared plant food. Packaging is not simulated separately.",
  defaults: {
    kind: "item",
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
    materialId: PlantFood.id,
    amount: 1,
    nutrition: 30,
  },
} satisfies EntityTemplate;
