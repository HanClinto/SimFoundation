import type { Material } from "../../core/material/Material";

export const Water: Material = {
  id: "water",
  name: "Aqueous liquid",
  description:
    "Cup-equivalent liquid used in the bounded dispensing trial. No thirst, temperature, chemical reaction or nutritional effect is modeled.",
  tags: ["liquid"],
  nutrition: 0,
};
