import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import type { SiteTemplate } from "../../../core/site/Site";
import { FieldAgent } from "../../actors/staff/FieldAgent";

export const scp3008Attribution = {
  author: "Mortos",
  source: "https://scp-wiki.wikidot.com/scp-3008",
  license: "CC BY-SA 3.0",
  adaptation:
    "One original store sector, two survivors, shelter work and a fixed cyclic exit. Night employees use bounded nonlethal impacts, not the source's lethal violence. Infinite/changing topology, wandering exits, automatic restocking, corpse handling and branded artwork are not modeled.",
};

export const StoreEmployee: EntityTemplate = {
  id: "scp-3008-employee",
  name: "Store employee figure",
  description:
    "A faceless employee figure. It patrols by day and confronts visible people at night. This rescue prototype caps its impacts at sixty total wound severity so the unimplemented death/rescue system cannot strand every responder. Dawn ends aggression and patrol resumes; source-level lethal attacks are not claimed.",
  attribution: scp3008Attribution,
  defaults: {
    kind: "pawn",
    materialId: "plastic",
    amount: 1,
    carryable: false,
    blocksMovement: true,
    blocksSight: false,
    mobile: true,
    canAct: true,
    autonomy: true,
    playerControllable: false,
    human: false,
    needs: {},
    diet: [],
    eatingRate: 0,
    queue: [],
    patrol: [],
    response: {
      faction: "hostile",
      hostileTo: ["site"],
      sight: 5,
      threat: "confront",
      hostileDuring: "night",
      attack: { damage: 4, windup: 6, maximumSeverity: 60 },
    },
  },
};

export const StoreSurvivor: EntityTemplate = {
  id: "store-survivor",
  name: "Store survivor",
  description:
    "An original adult survivor awaiting cooperative evacuation. Walking and carried people retain their own identity, health and needs; the return does not create a rescued-person token or recruit.",
  attribution: scp3008Attribution,
  defaults: {
    ...FieldAgent.defaults,
    playerControllable: false,
    acceptsEscort: true,
    autonomy: false,
  },
};

export const StoreShelter: EntityTemplate = {
  id: "store-shelter",
  name: "Shelter care station",
  description:
    "Repair with a maintenance pack and serve a real meal batch before field clinical care. One local clinical pack can restore supported blood-loss incapacity. Restoring the shelter costs time before closing; carrying the casualty out instead preserves field supplies but leaves home treatment to do.",
  attribution: scp3008Attribution,
  defaults: {
    kind: "facility",
    materialId: "wood",
    amount: 1,
    integrity: 40,
    carryable: false,
    blocksMovement: true,
    blocksSight: false,
    activities: { sleep: { duration: 8, needChanges: { fatigue: -8 } } },
    service: {
      supplyDefinitionId: "packaged-meal",
      amount: 1,
      ticks: 8,
      interval: 240,
      leadTime: 32,
      repair: { supplyDefinitionId: "maintenance-parts", amount: 1, ticks: 6 },
      history: [],
    },
    care: { supplyDefinitionId: "clinical-pack", ticks: 16, bloodRecovery: 25 },
  },
};

export const storeSite: SiteTemplate = {
  name: "SCP-3008: bounded evacuation sector",
  cycle: { dayTicks: 120, nightTicks: 60 },
  terrain: [
    "##################",
    "#................#",
    "#.....#..........#",
    "#.....#..........#",
    "#................#",
    "#.....#..........#",
    "#.....#..........#",
    "#................#",
    "#.....#..........#",
    "#................#",
    "##################",
  ],
  entities: [
    {
      id: "nora",
      definitionId: StoreSurvivor.id,
      location: { kind: "ground", position: { x: 9, y: 4 } },
      overrides: { name: "Nora", ageYears: 34 },
    },
    {
      id: "eli",
      definitionId: StoreSurvivor.id,
      location: { kind: "ground", position: { x: 10, y: 3 } },
      overrides: {
        name: "Eli",
        ageYears: 41,
        canAct: false,
        health: {
          wounds: [{ id: "old-injury", severity: 10, bleeding: 0 }],
          bloodLoss: 100,
          incapacity: "blood-loss",
        },
      },
    },
    {
      id: "shelter",
      definitionId: StoreShelter.id,
      location: { kind: "ground", position: { x: 10, y: 2 } },
    },
    {
      id: "clinical-pack",
      definitionId: "clinical-pack",
      location: { kind: "ground", position: { x: 11, y: 2 } },
    },
    {
      id: "employee-a",
      definitionId: StoreEmployee.id,
      location: { kind: "ground", position: { x: 13, y: 7 } },
      overrides: {
        patrol: [
          { x: 12, y: 7 },
          { x: 14, y: 7 },
        ],
      },
    },
    {
      id: "employee-b",
      definitionId: StoreEmployee.id,
      location: { kind: "ground", position: { x: 15, y: 4 } },
      overrides: {
        patrol: [
          { x: 14, y: 4 },
          { x: 15, y: 6 },
        ],
      },
    },
  ],
};
