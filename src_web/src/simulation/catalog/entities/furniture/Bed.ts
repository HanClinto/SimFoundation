import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { Wood } from "../../materials/Wood";

export const Bed = {
  id: "bed",
  name: "Bed",
  description:
    "A single-user resting place. Sleep relieves fatigue and some stress over eight work ticks.",
  defaults: {
    kind: "facility",
    carryable: true,
    blocksMovement: true,
    blocksSight: false,
    materialId: Wood.id,
    amount: 1,
    activities: {
      sleep: { duration: 8, needChanges: { fatigue: -8, stress: -2 } },
    },
  },
} satisfies EntityTemplate;
