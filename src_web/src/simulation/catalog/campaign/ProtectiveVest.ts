import type { EntityTemplate } from "../../core/entity/EntityTemplate";

export const ProtectiveVest = {
  id: "protective-vest",
  name: "Protective intervention vest",
  description:
    "Actual worn armor reduces each modeled impact by ten severity and loses twenty condition. At zero condition it offers no protection. It does not erase bleeding or make mortality impossible.",
  defaults: {
    kind: "item",
    materialId: "plastic",
    amount: 1,
    integrity: 100,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
    equipment: {
      slot: "armor",
      worn: false,
      armor: { reduction: 10, wear: 20 },
    },
  },
} satisfies EntityTemplate;

export const ImpactProtectiveVest = {
  ...ProtectiveVest,
  id: "impact-protective-vest",
  name: "Short-burst impact vest",
  description:
    "An original fictional design derived from a real instrument record. Two maintenance packs and sixteen workshop ticks produce one vest. It reduces modeled impacts by twenty severity but loses forty condition per impact, trading greater immediate protection for faster wear. No immunity, healing, ammunition or real-world manufacturing instructions are implied.",
  defaults: {
    ...ProtectiveVest.defaults,
    materialId: "steel",
    equipment: {
      ...ProtectiveVest.defaults.equipment,
      armor: { reduction: 20, wear: 40 },
    },
  },
} satisfies EntityTemplate;
