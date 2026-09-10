import type { SiteTemplate } from "../../core/site/Site";
import { CorroborationBench } from "../quests/scp1867/collection";
import { courierInspection } from "./courier";

export const homeLoading = { x: 2, y: 7 };
export const homePads = [homeLoading, { x: 3, y: 7 }];

export const home: SiteTemplate = {
  name: "Provisional Site: home",
  terrain: [
    "################",
    "#..............#",
    "#..........gggg#",
    "#.............g#",
    "#..........g..g#",
    "#..........gggg#",
    "#..............#",
    "#..............#",
    "#..............#",
    "################",
  ],
  tiles: { g: { blocksMovement: true, blocksSight: false } },
  entities: [
    {
      id: "medical-kit",
      definitionId: "field-medical-kit",
      location: { kind: "ground", position: { x: 5, y: 2 } },
    },
    {
      id: "field-medical-units",
      definitionId: "field-medical-unit",
      location: { kind: "ground", position: { x: 5, y: 1 } },
      overrides: { amount: 3 },
    },
    {
      id: "workshop",
      definitionId: "equipment-bench",
      location: { kind: "ground", position: { x: 7, y: 1 } },
    },
    {
      id: "suppression-units",
      definitionId: "suppression-unit",
      location: { kind: "ground", position: { x: 1, y: 2 } },
      overrides: { amount: 3 },
    },
    {
      id: "wound-packs",
      definitionId: "wound-care-pack",
      location: { kind: "ground", position: { x: 4, y: 1 } },
      overrides: { amount: 3 },
    },
    {
      id: "holding",
      definitionId: "kinetic-holding-cell",
      location: { kind: "ground", position: { x: 14, y: 7 } },
    },
    {
      id: "power-units",
      definitionId: "containment-charge",
      location: { kind: "ground", position: { x: 14, y: 8 } },
      overrides: { amount: 3 },
    },
    {
      id: "restraint",
      definitionId: "transport-restraint",
      location: { kind: "ground", position: { x: 1, y: 3 } },
    },
    {
      id: "spare-restraint",
      definitionId: "transport-restraint",
      location: { kind: "ground", position: { x: 2, y: 1 } },
    },
    {
      id: "suppressor",
      definitionId: "intervention-tool",
      location: { kind: "ground", position: { x: 1, y: 5 } },
    },
    {
      id: "vest",
      definitionId: "protective-vest",
      location: { kind: "ground", position: { x: 1, y: 4 } },
    },
    {
      id: "parts",
      definitionId: "maintenance-parts",
      location: { kind: "ground", position: { x: 1, y: 6 } },
      overrides: { amount: 4 },
    },
    {
      id: "bear",
      definitionId: "scp-2295",
      location: { kind: "ground", position: { x: 6, y: 7 } },
    },
    {
      id: "textiles",
      definitionId: "textile-bundle",
      location: { kind: "ground", position: { x: 7, y: 7 } },
      overrides: { amount: 2 },
    },
    {
      id: "clinic",
      definitionId: "clinical-bed",
      location: { kind: "ground", position: { x: 4, y: 1 } },
    },
    {
      id: "clinical-packs",
      definitionId: "clinical-pack",
      location: { kind: "ground", position: { x: 5, y: 1 } },
      overrides: { amount: 4 },
    },
    {
      id: "guest-bed",
      definitionId: "bed",
      location: { kind: "ground", position: { x: 10, y: 2 } },
      overrides: { name: "Guest bed" },
    },
    {
      id: "review",
      definitionId: "returnee-review-station",
      location: { kind: "ground", position: { x: 10, y: 5 } },
    },
    {
      id: "case",
      definitionId: "specimen-case",
      location: { kind: "ground", position: { x: 4, y: 7 } },
    },
    {
      id: "machine",
      definitionId: "scp-294",
      location: { kind: "ground", position: { x: 8, y: 7 } },
    },
    {
      id: "coins",
      definitionId: "coin-allocation",
      location: { kind: "ground", position: { x: 7, y: 7 } },
      overrides: { amount: 8 },
    },
    {
      id: "sample-bench",
      definitionId: "sample-comparison-bench",
      location: { kind: "ground", position: { x: 8, y: 4 } },
    },
    {
      id: "water",
      definitionId: "water-reservoir",
      location: { kind: "ground", position: { x: 6, y: 4 } },
      overrides: { amount: 4 },
    },
    {
      id: "coffee",
      definitionId: "coffee-reservoir",
      location: { kind: "ground", position: { x: 6, y: 5 } },
      overrides: { amount: 3 },
    },
    {
      id: "tracer",
      definitionId: "tracer-reservoir",
      location: { kind: "ground", position: { x: 6, y: 3 } },
      overrides: { amount: 2 },
    },
    {
      id: "alex",
      definitionId: "field-agent",
      location: { kind: "ground", position: { x: 2, y: 2 } },
      overrides: { name: "alex", autonomy: false },
    },
    {
      id: "ben",
      definitionId: "researcher",
      location: { kind: "ground", position: { x: 3, y: 2 } },
      overrides: { name: "ben", autonomy: false },
    },
    {
      id: "casey",
      definitionId: "medic",
      location: { kind: "ground", position: { x: 4, y: 2 } },
      overrides: { name: "casey", autonomy: false },
    },
    {
      id: "bench",
      definitionId: "corroboration-bench",
      location: { kind: "ground", position: { x: 3, y: 4 } },
      overrides: {
        study: {
          plans: [
            ...CorroborationBench.defaults.study.plans,
            courierInspection,
          ],
          findings: [],
        },
      },
    },
    {
      id: "survey",
      definitionId: "independent-survey",
      location: { kind: "ground", position: { x: 2, y: 4 } },
    },
    {
      id: "lab",
      definitionId: "laboratory-dossier",
      location: { kind: "ground", position: { x: 4, y: 4 } },
    },
    {
      id: "display",
      definitionId: "exhibit-observation-station",
      location: { kind: "ground", position: { x: 13, y: 4 } },
    },
    {
      id: "display-door",
      definitionId: "automatic-steel-door",
      location: { kind: "ground", position: { x: 11, y: 3 } },
      overrides: { name: "Display bay door", blocksSight: false },
    },
    {
      id: "bed",
      definitionId: "bed",
      location: { kind: "ground", position: { x: 7, y: 2 } },
    },
    {
      id: "chair",
      definitionId: "armchair",
      location: { kind: "ground", position: { x: 11, y: 8 } },
    },
    {
      id: "meals",
      definitionId: "packaged-meal",
      location: { kind: "ground", position: { x: 5, y: 6 } },
      overrides: { amount: 8 },
    },
    {
      id: "transport",
      definitionId: "transport-docket",
      location: { kind: "ground", position: { x: 1, y: 7 } },
      overrides: { amount: 4 },
    },
    {
      id: "kit",
      definitionId: "survey-kit",
      location: { kind: "ground", position: { x: 5, y: 7 } },
    },
  ],
};
