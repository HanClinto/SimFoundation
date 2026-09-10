import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { Wood } from "../../materials/Wood";

export const Bookshelf = {
  id: "bookshelf",
  name: "Bookshelf",
  description:
    "A small reference and leisure collection. Reading satisfies curiosity and restlessness without generating research progress.",
  defaults: {
    kind: "facility",
    carryable: true,
    blocksMovement: true,
    blocksSight: true,
    materialId: Wood.id,
    amount: 1,
    activities: {
      read: {
        duration: 6,
        needChanges: { curiosity: -3, restlessness: -4, stress: -1 },
      },
    },
  },
} satisfies EntityTemplate;
