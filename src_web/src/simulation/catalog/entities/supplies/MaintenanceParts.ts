import type { EntityTemplate } from "../../../core/entity/EntityTemplate";

export const MaintenanceParts = {
  id: "maintenance-parts",
  name: "Maintenance supply packs",
  description:
    "Finite ordinary spare parts for physical repairs, containment fallback and engineered designs. Carry a chosen quantity to the work site; spent parts are not refunded when funded work is cancelled.",
  defaults: {
    kind: "item",
    materialId: "steel",
    amount: 1,
    integrity: 100,
    stackable: true,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
  },
} satisfies EntityTemplate;
