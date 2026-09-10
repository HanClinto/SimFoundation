import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import type { SiteTemplate } from "../../../core/site/Site";
import { FieldAgent } from "../../actors/staff/FieldAgent";

export const TextileBundle: EntityTemplate = {
  id: "textile-bundle",
  name: "Clean textile and stuffing bundles",
  description:
    "Finite prepared cloth and stuffing for patchwork organ work. Lay beside the bear; one bundle funds one attempt. Interrupted work keeps the spent material. No chemistry, crafting chain or instant medical benefit is implied.",
  defaults: {
    kind: "item",
    materialId: "fabric",
    amount: 1,
    integrity: 100,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
  },
};

export const OrganTraumaPatient: EntityTemplate = {
  id: "organ-trauma-patient",
  name: "Adult trauma patient",
  description:
    "An original cooperative adult awaiting supported medical transfer. Lung trauma, ordinary wound severity and blood loss are distinct. Carrying, organ replacement and postoperative bedside care must preserve the same person.",
  defaults: {
    ...FieldAgent.defaults,
    playerControllable: false,
    acceptsEscort: true,
    autonomy: false,
    canAct: false,
    health: {
      wounds: [{ id: "other-injury", severity: 8, bleeding: 0 }],
      bloodLoss: 40,
      organs: { lung: { trauma: 100 } },
      incapacity: "organ-trauma",
    },
  },
};

export const triageSite: SiteTemplate = {
  name: "Urgent adult care transfer",
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
      id: "iris",
      definitionId: OrganTraumaPatient.id,
      location: { kind: "ground", position: { x: 8, y: 2 } },
      overrides: { name: "Iris", ageYears: 29 },
    },
    {
      id: "owen",
      definitionId: OrganTraumaPatient.id,
      location: { kind: "ground", position: { x: 8, y: 4 } },
      overrides: { name: "Owen", ageYears: 54 },
    },
  ],
};
