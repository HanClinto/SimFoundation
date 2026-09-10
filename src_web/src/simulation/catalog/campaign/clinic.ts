import type { EntityTemplate } from "../../core/entity/EntityTemplate";
import { Bed } from "../entities/furniture/Bed";

export const ClinicalBed: EntityTemplate = {
  id: "clinical-bed",
  name: "Clinical recovery bed",
  description:
    "After bleeding is stabilized, a medic works beside a grounded patient at this bed. Default care spends a clinical pack for sixteen ticks and up to twenty-five blood-loss recovery. The explicit wounds course spends a wound-care pack for twenty ticks and up to forty severity reduction, retaining injury and treatment records. Neither course cures death or major organ trauma. Game-scale care, not a real procedure.",
  defaults: {
    ...Bed.defaults,
    materialId: "steel",
    carryable: false,
    care: {
      supplyDefinitionId: "clinical-pack",
      ticks: 16,
      bloodRecovery: 25,
      woundCourse: {
        supplyDefinitionId: "wound-care-pack",
        ticks: 20,
        recovery: 40,
      },
    },
  },
};

export const ClinicalPack: EntityTemplate = {
  id: "clinical-pack",
  name: "Clinical supply packs",
  description:
    "Finite abstract supplies for a bedside recovery course. One is consumed when care starts, not on admission. Cancellation retains both spent supplies and earned partial recovery. These are not a drug recipe or an infinite medic charge refill.",
  defaults: {
    kind: "item",
    stackable: true,
    materialId: "plastic",
    amount: 1,
    integrity: 100,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
  },
};

export const WoundCarePack: EntityTemplate = {
  id: "wound-care-pack",
  name: "Wound-care supply packs",
  description:
    "Finite abstract supplies for a distinct bedside wound recovery course. Spent on the first productive tick; partial severity recovery persists on each original wound with actor and supply provenance. No drug recipe, organ cure or resurrection.",
  defaults: {
    kind: "item",
    stackable: true,
    materialId: "plastic",
    amount: 1,
    integrity: 100,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
  },
};
