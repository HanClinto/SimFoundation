import type { EntityTemplate } from "../../core/entity/EntityTemplate";
import { KineticLoadingStudy } from "./KineticEngineering";

export const ContainmentCharge: EntityTemplate = {
  id: "containment-charge",
  name: "Sealed containment power units",
  description:
    "Finite fictional power units for the kinetic holding cell. One is consumed by a real worker per service interval; no power-grid or battery recipe is implied.",
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

export const KineticHoldingCell: EntityTemplate = {
  id: "kinetic-holding-cell",
  name: "Kinetic holding cell",
  description:
    "Repair with one maintenance pack, then physically service with a containment power unit for 120 ticks of coverage. Warning begins forty ticks early. A compatible restrained subject can be admitted over four ticks, retaining its identity inside the cell. Safe containment pauses restraint struggle and permits removing/reusing the transport band. Expired coverage releases the subject at the hatch. Physical emergency lockdown costs one maintenance pack and three ticks, buying eighty ticks to restore service.",
  defaults: {
    kind: "facility",
    materialId: "steel",
    amount: 1,
    integrity: 40,
    carryable: false,
    blocksMovement: true,
    blocksSight: true,
    activities: {},
    service: {
      supplyDefinitionId: ContainmentCharge.id,
      amount: 1,
      ticks: 6,
      interval: 120,
      leadTime: 40,
      repair: { supplyDefinitionId: "maintenance-parts", amount: 1, ticks: 6 },
      history: [],
    },
    containment: {
      accepts: ["kinetic-specimen"],
      intakeTicks: 4,
      exitOffset: { x: -1, y: 0 },
      lockdown: {
        supplyDefinitionId: "maintenance-parts",
        ticks: 3,
        duration: 80,
        untilTick: null,
      },
    },
    study: {
      plans: [
        KineticLoadingStudy,
        {
          id: "kinetic-intake",
          containedSources: true,
          title: "Living kinetic subject: controlled intake",
          ticks: 8,
          requires: ["kinetic-specimen"],
          finding:
            "The same living subject is physically present inside the holding cell. Recovery did not turn hostility into consent. Transport restraint, finite cell coverage, warning and fallback remain real ongoing management obligations.",
        },
      ],
      findings: [],
    },
  },
};
