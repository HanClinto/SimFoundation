import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { scp294Attribution } from "../../actors/anomalies/SCP294";

export const CoinAllocation: EntityTemplate = {
  id: "coin-allocation",
  name: "Fifty-cent test allocations",
  description:
    "Finite ordinary coins for approved machine trials. Each paid attempt spends one allocation, including a solid-request refusal or a cancelled paid action.",
  defaults: {
    kind: "item",
    materialId: "steel",
    amount: 1,
    integrity: 100,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
  },
};

function liquid(id: string, name: string, carryable: boolean): EntityTemplate {
  return {
    id,
    name,
    description:
      "A labeled cup-equivalent liquid quantity. Source reservoirs are fixed for this bounded experiment. Samples retain source provenance; no taste, temperature or medical effect is modeled.",
    attribution: scp294Attribution,
    defaults: {
      kind: "item",
      materialId: "water",
      amount: 1,
      nutrition: 0,
      integrity: 100,
      carryable,
      blocksMovement: false,
      blocksSight: false,
    },
  };
}

export const WaterReservoir = liquid(
  "water-reservoir",
  "Water reservoir",
  false,
);
export const CoffeeReservoir = liquid(
  "coffee-reservoir",
  "Coffee reservoir",
  false,
);
export const TracerReservoir = liquid(
  "tracer-reservoir",
  "Harmless tracer reservoir",
  false,
);
export const WaterSample = liquid(
  "water-sample",
  "Identified water sample",
  true,
);
export const CoffeeSample = liquid(
  "coffee-sample",
  "Identified coffee sample",
  true,
);
export const TracerSample = liquid(
  "tracer-sample",
  "Identified tracer sample",
  true,
);

export const SampleBench: EntityTemplate = {
  id: "sample-comparison-bench",
  name: "Sample comparison bench",
  description:
    "Bring two distinct tracer cups within one tile, then study repeated-tracer. Records actual sample IDs after physical work. Machine inspection records their source volumes and paid attempts.",
  attribution: scp294Attribution,
  defaults: {
    kind: "facility",
    materialId: "steel",
    amount: 1,
    carryable: false,
    blocksMovement: true,
    blocksSight: false,
    integrity: 100,
    activities: {},
    study: {
      plans: [
        {
          id: "repeated-tracer",
          title: "SCP-294: repeated identified tracer retrieval",
          ticks: 8,
          requires: ["tracer-sample", "tracer-sample"],
          finding:
            "Two distinct identified samples are available for comparison. Their dispensing records name the source, operator, paid attempt and equal removed volume. This bounded observation supports repeatable retrieval from the authored source, not unlimited synthesis or arbitrary requests.",
        },
      ],
      findings: [],
    },
  },
};
