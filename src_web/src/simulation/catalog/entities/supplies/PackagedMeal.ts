import type { EntityDefinition } from "../../../core/entity/Definition";
import { PlantFood } from "../../materials/PlantFood";

export const PackagedMeal = {
  id: "packaged-meal",
  name: "Packaged meal",
  description:
    "One portion of prepared plant food. Packaging is not simulated separately.",
  defaults: {
    kind: "item",
    carryable: true,
    materialId: PlantFood.id,
    amount: 1,
  },
} satisfies EntityDefinition;
