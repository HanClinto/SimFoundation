import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { Steel } from "../../materials/Steel";

export const ResearchDesk = {
  id: "research-desk",
  name: "Research desk",
  description:
    "A six-tick study session produces one local progress unit per work tick. Study satisfies curiosity but raises stress and fatigue; no unlocks or specimen research are modeled yet.",
  defaults: {
    kind: "facility",
    carryable: true,
    blocksMovement: true,
    blocksSight: false,
    materialId: Steel.id,
    amount: 1,
    activities: {
      research: {
        duration: 6,
        needChanges: { curiosity: -4, stress: 3, fatigue: 1 },
      },
    },
    research: { progress: 0 },
  },
} satisfies EntityTemplate;
