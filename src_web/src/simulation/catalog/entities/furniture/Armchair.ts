import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { Wood } from "../../materials/Wood";

export const Armchair = {
  id: "armchair",
  name: "Armchair",
  description:
    "A quiet seat for six work ticks of relaxation, reducing stress and a little fatigue.",
  defaults: {
    kind: "facility",
    carryable: true,
    blocksMovement: true,
    blocksSight: false,
    materialId: Wood.id,
    amount: 1,
    activities: {
      relax: { duration: 6, needChanges: { stress: -6, fatigue: -1 } },
    },
  },
} satisfies EntityTemplate;
