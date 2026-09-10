import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import type { SiteTemplate } from "../../../core/site/Site";
import { FieldAgent } from "../../actors/staff/FieldAgent";

export const scp173Attribution = {
  title: "SCP-173",
  author: "Moto42",
  source: "https://scp-wiki.wikidot.com/scp-173",
  license: "CC-BY-SA-3.0",
  adaptation:
    "Text-only bounded direct-attention maintenance scene, based on archived revision57. No image/sculpture adaptation. A fixed viewing gallery, slow turn-based movement, fatigue cutoff, finite cleaning supplies and local work protocol are original game abstractions. Automatic blinking, exact source attack speed, relocation and wider source behavior are not modeled.",
};

const {
  health: _health,
  ageYears: _ageYears,
  ...inanimateActor
} = FieldAgent.defaults;
export const SCP173: EntityTemplate = {
  id: "scp-173",
  name: "SCP-173",
  attribution: scp173Attribution,
  description:
    "Hostile concrete entity immobilized by active conscious direct watch, not passive visibility or an impact recorder. One active observer stops motion; two separate observers protect the third worker's local maintenance protocol. If every watcher stops, it can move and inflict a lethal modeled neck injury. Generic subdual instruments and portable transport do not apply.",
  defaults: {
    ...inanimateActor,
    carryable: false,
    playerControllable: false,
    human: false,
    stillWhenWatched: true,
    materialId: "stone",
    needs: {},
    diet: [],
    eatingRate: 0,
    response: {
      faction: "hostile",
      hostileTo: ["site"],
      sight: 8,
      threat: "confront",
      attack: { damage: 200, bleeding: 0, windup: 1, fatalAfterTicks: 1 },
    },
  },
};

export const CleaningPack: EntityTemplate = {
  id: "cleaning-pack",
  name: "Sealed cleaning packs",
  description:
    "Finite ordinary supplies for the bounded annex cleaning task. One is spent per physical service; retained work never restocks them.",
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

export const SCP173Maintenance: EntityTemplate = {
  id: "scp-173-maintenance",
  name: "Annex cleaning and protocol station",
  attribution: scp173Attribution,
  description:
    "A third worker may clean or study only while two other active observers keep direct watch on the nearby subject. Eight cleaning work ticks spend one actual pack for200 ticks of local coverage; an overdue notice does not magically release the locked door. Twelve study ticks record the actual subject and local protocol. This short cadence is an authored abstraction, not the article's biweekly interval.",
  defaults: {
    kind: "facility",
    materialId: "steel",
    amount: 1,
    integrity: 100,
    carryable: false,
    blocksMovement: true,
    blocksSight: false,
    activities: {},
    supervision: { targetDefinitionId: SCP173.id, range: 1, observers: 2 },
    service: {
      supplyDefinitionId: CleaningPack.id,
      amount: 1,
      ticks: 8,
      interval: 200,
      leadTime: 40,
      repair: { supplyDefinitionId: "maintenance-parts", amount: 1, ticks: 6 },
      history: [],
    },
    study: {
      plans: [
        {
          id: "direct-watch-protocol",
          title: "Direct-watch maintenance protocol",
          ticks: 12,
          requires: [SCP173.id],
          finding:
            "The actual subject remained immobilized during a third worker's physical protocol study with two active observers. Conscious watch and overlapping relief, not passive line of sight or a camera recording, provided coverage. Locked-door withdrawal remains a separate physical fallback.",
        },
      ],
      findings: [],
    },
  },
};

export const scp173Site: SiteTemplate = {
  name: "SCP-173 bounded observation annex",
  tiles: { g: { blocksMovement: true, blocksSight: false } },
  terrain: [
    "############",
    "#....g.....#",
    "#....g.....#",
    "#..........#",
    "#....g.....#",
    "#....g.....#",
    "############",
  ],
  entities: [
    {
      id: "subject",
      definitionId: SCP173.id,
      location: { kind: "ground", position: { x: 8, y: 3 } },
    },
    {
      id: "gate",
      definitionId: "automatic-steel-door",
      location: { kind: "ground", position: { x: 5, y: 3 } },
      overrides: {
        name: "Annex locked entry",
        policy: "held-closed",
        open: false,
      },
    },
    {
      id: "station",
      definitionId: SCP173Maintenance.id,
      location: { kind: "ground", position: { x: 9, y: 3 } },
    },
    {
      id: "cleaning",
      definitionId: CleaningPack.id,
      location: { kind: "ground", position: { x: 9, y: 4 } },
      overrides: { amount: 3 },
    },
  ],
};
