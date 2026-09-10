import type { EntityTemplate } from "../../core/entity/EntityTemplate";
import { Bed } from "../entities/furniture/Bed";

export const ClinicalBed: EntityTemplate = {
  id: "clinical-bed",
  name: "Clinical recovery bed",
  description:
    "After bleeding is stabilized, a medic and a grounded patient must remain beside this bed. One physical clinical pack funds sixteen ticks of care and recovers up to twenty-five blood-loss points. Wounds remain; severe wound incapacity is not cured. Game-scale care, not a real medical procedure.",
  defaults: {
    ...Bed.defaults,
    materialId: "steel",
    carryable: false,
    care: { supplyDefinitionId: "clinical-pack", ticks: 16, bloodRecovery: 25 },
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
