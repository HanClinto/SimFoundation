import type { SiteTemplate } from "../../core/site/Site";
import type { Position } from "../../core/entity/Entity";
import { scp1867Scenario } from "../quests/scp1867/setup";
import { scp1370Scenario } from "../quests/scp1370/setup";

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
      location: { kind: "ground", position: { x: 8, y: 2 } },
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

export interface Opportunity {
  name: string;
  briefing: string;
  site: SiteTemplate;
  loading: Position;
  pads: readonly Position[];
  duration: number;
  requiresFinding?: string;
}

export const homeLoading = { x: 2, y: 7 };
export const homePads = [homeLoading, { x: 3, y: 7 }];

export const opportunities: Readonly<Record<string, Opportunity>> = {
  blackwood: {
    name: "Blackwood collection outpost",
    briefing:
      "Recover the journal and preserved specimen for home comparison. Two carriers can bring both back in one trip; carried supplies use the same slots. Leave the unverified device isolated: its function is unknown. Home intake: journal (3,3), specimen (3,5), then study bench marsh-lead. Partial returns remain recoverable by revisiting the same outpost.",
    site: {
      ...scp1867Scenario.site,
      name: "Blackwood collection outpost",
      entities: scp1867Scenario.site.entities.filter((entry) =>
        ["journal", "specimen", "device"].includes(entry.id),
      ),
    },
    loading: { x: 2, y: 4 },
    pads: [
      { x: 2, y: 4 },
      { x: 2, y: 5 },
    ],
    duration: 8,
  },
  gallery: {
    name: "SCP-1370 gallery recovery",
    briefing:
      "Recover the intact, toppled exhibit without attacking it. Take it home to the glass bay at (13,3), study display safe-exhibit, and move outside so its door can close. The exhibit keeps its pawn identity. No hostile capture or living escort is required.",
    site: {
      ...scp1370Scenario.site,
      name: "SCP-1370 remote gallery",
      entities: scp1370Scenario.site.entities.filter(
        (entry) => entry.id !== "station",
      ),
    },
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
    duration: 6,
  },
  kestrel: {
    name: "Kestrel Marsh depot",
    briefing:
      "Blackwood's corroborated finding authorizes this visit. Bring the field comparison kit for study station depot-survey. Recover finite meals or transport dockets from the cache; each carrier can hold only one object. The return is already funded. Returned dockets must be delivered beside home pad (2,7) before they fund later departures.",
    requiresFinding: "marsh-lead",
    site: {
      name: "Kestrel Marsh depot",
      terrain: [
        "############",
        "#..........#",
        "#..........#",
        "#....#.....#",
        "#..........#",
        "#..........#",
        "############",
      ],
      entities: [
        {
          id: "station",
          definitionId: "kestrel-station",
          location: { kind: "ground", position: { x: 8, y: 3 } },
        },
        {
          id: "rations",
          definitionId: "packaged-meal",
          location: { kind: "ground", position: { x: 8, y: 1 } },
          overrides: { amount: 8 },
        },
        {
          id: "dockets",
          definitionId: "transport-docket",
          location: { kind: "ground", position: { x: 9, y: 5 } },
          overrides: { amount: 3 },
        },
      ],
    },
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
    duration: 10,
  },
};
