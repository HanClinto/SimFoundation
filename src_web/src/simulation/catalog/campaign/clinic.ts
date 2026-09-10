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

export const FieldMedicalKit: EntityTemplate = {
  id: "field-medical-kit",
  name: "Field stabilization kit",
  description:
    "A real worn tool-slot kit for a trained medic. Three finite supplies, four work ticks per stabilized wound. Empty or broken worn kits do not silently spend the medic's separate initial charges. Rearm physically from finite field-medical units. Wearing it does not create medical training or compete with the loose cargo slot.",
  defaults: {
    kind: "item",
    materialId: "plastic",
    amount: 1,
    integrity: 100,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
    equipment: {
      slot: "tool",
      worn: false,
      medicine: {
        supplies: 3,
        ticks: 4,
        rearm: {
          supplyDefinitionId: "field-medical-unit",
          capacity: 3,
          ticks: 6,
        },
      },
    },
  },
};

export const FieldMedicalUnit: EntityTemplate = {
  id: "field-medical-unit",
  name: "Sealed field medical units",
  description:
    "Finite abstract restocking units for the actual stabilization kit. One spent unit and six work ticks restore one kit supply, not training, lost blood or wound severity. No real medical recipe or procedure is represented.",
  defaults: {
    kind: "item",
    materialId: "plastic",
    amount: 1,
    integrity: 100,
    stackable: true,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
  },
};
