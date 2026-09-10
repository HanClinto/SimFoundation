import type { EntityTemplate } from "../../core/entity/EntityTemplate";

export const TransportRestraint = {
  id: "transport-restraint",
  name: "Fictional transport restraint",
  description:
    "A physical bounded-game restraint fitted to the subdued kinetic specimen over four ticks. Two hundred condition points wear by one each conscious tick, including transit. Breakage leaves the broken item and permits escape. This is not consent, a case, or an indefinite cure.",
  defaults: {
    kind: "item",
    materialId: "steel",
    amount: 1,
    integrity: 200,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
    restraint: {
      attached: false,
      ticks: 4,
      wearPerTick: 1,
      accepts: ["kinetic-specimen"],
    },
  },
} satisfies EntityTemplate;

export const DampedTransportRestraint = {
  ...TransportRestraint,
  id: "damped-kinetic-restraint",
  name: "Damped kinetic restraint",
  description:
    "An original fictional design derived from a recorded controlled study. Two maintenance packs and sixteen workshop ticks create one actual band. Its two hundred condition wears by one-half per conscious tick, twice the original awake window, without changing consent or preventing eventual escape. Only compatible with the kinetic specimen; no real-world construction instructions are implied.",
  defaults: {
    ...TransportRestraint.defaults,
    restraint: { ...TransportRestraint.defaults.restraint, wearPerTick: 0.5 },
  },
} satisfies EntityTemplate;
