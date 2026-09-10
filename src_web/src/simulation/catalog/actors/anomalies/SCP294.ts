import type { EntityTemplate } from "../../../core/entity/EntityTemplate";

export const scp294Attribution = {
  author: "Arcibi",
  source: "https://scp-wiki.wikidot.com/scp-294",
  license: "CC BY-SA 3.0",
  adaptation:
    "Four approved requests only. Coin payment, liquid retrieval, solid-request failure and equal source depletion adapt SCP-294. Local reservoirs, harmless tracer, timings and the provisional home installation are original game abstractions. No hazardous liquids, bodily extraction, abstract effects, automatic restocking or source images.",
};

export const SCP294: EntityTemplate = {
  id: "scp-294",
  name: "SCP-294",
  description:
    "A keyboard-equipped vending machine. Approved requests: water, coffee, tracer and diamond. Bring a fifty-cent allocation beside it. Liquid requests name a real, grounded source at this site, not an invented reservoir. Each completed pour transfers one cup-equivalent; clear the output before repeating. Paid work is not refunded on cancellation.",
  attribution: scp294Attribution,
  defaults: {
    kind: "facility",
    materialId: "steel",
    amount: 1,
    integrity: 100,
    carryable: false,
    blocksMovement: true,
    blocksSight: true,
    activities: {},
    dispenser: {
      paymentDefinitionId: "coin-allocation",
      portion: 1,
      nextSampleId: 1,
      requests: [
        {
          id: "water",
          title: "Water",
          ticks: 4,
          sourceDefinitionId: "water-reservoir",
          sampleDefinitionId: "water-sample",
        },
        {
          id: "coffee",
          title: "Coffee",
          ticks: 4,
          sourceDefinitionId: "coffee-reservoir",
          sampleDefinitionId: "coffee-sample",
        },
        {
          id: "tracer",
          title: "Harmless tracer",
          ticks: 6,
          sourceDefinitionId: "tracer-reservoir",
          sampleDefinitionId: "tracer-sample",
        },
        {
          id: "diamond",
          title: "Diamond",
          ticks: 3,
          rejection: "OUT OF RANGE: the requested solid is not dispensed.",
        },
      ],
      records: [],
    },
  },
};
