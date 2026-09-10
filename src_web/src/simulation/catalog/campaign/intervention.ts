import type { EntityTemplate } from "../../core/entity/EntityTemplate";
import type { SiteTemplate } from "../../core/site/Site";
import { FieldAgent } from "../actors/staff/FieldAgent";

export const InterventionTool: EntityTemplate = {
  id: "intervention-tool",
  name: "Fictional suppression instrument",
  description:
    "A bounded game instrument, not a real device: two charges, two adjacent work ticks per intervention, eighty ticks of temporary subdual. Must be worn in the tool slot. Charges and condition remain attached to this item through transfer or death. Subdual does not mean consent or permanent containment.",
  defaults: {
    kind: "item",
    materialId: "steel",
    amount: 1,
    integrity: 100,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
    equipment: {
      slot: "tool",
      worn: false,
      subdual: {
        charges: 2,
        ticks: 2,
        duration: 80,
        rearm: {
          supplyDefinitionId: "suppression-unit",
          capacity: 2,
          ticks: 6,
        },
      },
    },
  },
};

export const ProtectiveVest: EntityTemplate = {
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
};

export const KineticSpecimen: EntityTemplate = {
  id: "kinetic-specimen",
  name: "Kinetic specimen",
  description:
    "An original hostile mobile anomaly used to prove intervention and live recovery. It strikes nearby people with damaging, bleeding impacts; it does not consent to escort. Temporary equipment-backed subdual wears off. This is game-authored content, not an adaptation of an SCP article.",
  defaults: {
    ...FieldAgent.defaults,
    human: false,
    playerControllable: false,
    acceptsEscort: false,
    requiresRestraint: true,
    needs: {},
    diet: [],
    eatingRate: 0,
    response: {
      faction: "hostile",
      hostileTo: ["site"],
      sight: 4,
      threat: "confront",
      attack: { damage: 30, bleeding: 2, windup: 5 },
    },
  },
};

export const TransportRestraint: EntityTemplate = {
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
};

export const interventionSite: SiteTemplate = {
  name: "Intervention yard: lethal-risk authorization",
  terrain: [
    "############",
    "#..........#",
    "#..........#",
    "#..........#",
    "#..........#",
    "#..........#",
    "############",
  ],
  entities: [
    {
      id: "specimen",
      definitionId: KineticSpecimen.id,
      location: { kind: "ground", position: { x: 8, y: 3 } },
    },
  ],
};

export const SuppressionUnit: EntityTemplate = {
  id: "suppression-unit",
  name: "Sealed fictional suppression units",
  description:
    "Finite abstract resupply for the intervention instrument. Six work ticks and one actual unit restore one charge up to capacity two. These game-only units are not ammunition construction or real-world operating instructions. Cancelled funded work does not refund them.",
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
