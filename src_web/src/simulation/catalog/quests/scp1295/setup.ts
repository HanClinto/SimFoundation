import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import type { SiteTemplate } from "../../../core/site/Site";
import { FieldAgent } from "../../actors/staff/FieldAgent";

const attribution = {
  author: "Dmatix",
  source: "https://scp-wiki.wikidot.com/scp-1295",
  license: "CC BY-SA 3.0",
  adaptation:
    "Four retained diner regulars and continuing service adapt SCP-1295. Counter repair, meal batches, staffing duty and tick deadlines are original abstractions. Access remains open; forced removal and the source's broad harmful effects are not simulated. No source dialogue or images are copied.",
};

export const DinerRegular: EntityTemplate = {
  id: "scp-1295-regular",
  name: "SCP-1295 regular",
  description:
    "One of four elderly regulars at Meg's Good Eatin'. The player supports their routine rather than capturing them. They remain at their tables; conversation, forced removal and wide-area anomalous effects are not implemented.",
  attribution,
  defaults: {
    ...FieldAgent.defaults,
    ageYears: 75,
    carryable: false,
    mobile: false,
    playerControllable: false,
    autonomy: false,
    needs: {},
    diet: [],
    eatingRate: 0,
  },
};

export const DinerCounter: EntityTemplate = {
  id: "diner-counter",
  name: "Meg's service counter",
  description:
    "Restore the damaged counter with one maintenance pack, then provide one physical meal batch per service. Assign a worker for recurring service with ordinary meal/rest breaks. Each completion covers 100 ticks; assigned work begins up to 24 ticks early. Late service disables the counter's register activity until restored, not the diner entrance or the whole campaign.",
  attribution,
  defaults: {
    kind: "facility",
    materialId: "steel",
    amount: 1,
    integrity: 40,
    carryable: false,
    blocksMovement: true,
    blocksSight: false,
    activities: { read: { duration: 4, needChanges: { curiosity: -8 } } },
    service: {
      supplyDefinitionId: "packaged-meal",
      amount: 1,
      ticks: 8,
      interval: 100,
      leadTime: 24,
      repair: { supplyDefinitionId: "maintenance-parts", amount: 1, ticks: 6 },
      history: [],
    },
  },
};

export const dinerSite: SiteTemplate = {
  name: "Meg's Good Eatin': retained service outpost",
  terrain: [
    "##############",
    "#...#........#",
    "#...#........#",
    "#...#........#",
    "#............#",
    "#...#........#",
    "#...#........#",
    "#...#........#",
    "##############",
  ],
  entities: [
    {
      id: "entry",
      definitionId: "automatic-steel-door",
      location: { kind: "ground", position: { x: 4, y: 4 } },
      overrides: {
        name: "Open diner entrance",
        open: true,
        policy: "held-open",
      },
    },
    {
      id: "counter",
      definitionId: DinerCounter.id,
      location: { kind: "ground", position: { x: 8, y: 4 } },
    },
    {
      id: "bed",
      definitionId: "bed",
      location: { kind: "ground", position: { x: 7, y: 6 } },
    },
    {
      id: "chair",
      definitionId: "armchair",
      location: { kind: "ground", position: { x: 10, y: 6 } },
    },
    ...["Warren", "Frederick", "Pat", "Dwight"].map((name, index) => ({
      id: `regular-${index + 1}`,
      definitionId: DinerRegular.id,
      location: { kind: "ground" as const, position: { x: 7 + index, y: 2 } },
      overrides: { name },
    })),
  ],
};
