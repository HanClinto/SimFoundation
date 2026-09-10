import type { SiteTemplate } from "../../../core/site/Site";
import { quest } from "./quest";

const site: SiteTemplate = {
  name: "Blackwood collection: temporary intake and vault",
  terrain: [
    "###############",
    "#.............#",
    "#......#......#",
    "#......#......#",
    "#.............#",
    "#......#......#",
    "#......#......#",
    "#.............#",
    "###############",
  ],
  entities: [
    {
      id: "investigator",
      definitionId: "researcher",
      location: { kind: "ground", position: { x: 2, y: 4 } },
      overrides: { autonomy: false },
    },
    {
      id: "bench",
      definitionId: "corroboration-bench",
      location: { kind: "ground", position: { x: 3, y: 4 } },
    },
    {
      id: "journal",
      definitionId: "blackwood-journal",
      location: { kind: "ground", position: { x: 10, y: 3 } },
    },
    {
      id: "specimen",
      definitionId: "blackwood-specimen",
      location: { kind: "ground", position: { x: 11, y: 6 } },
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
      id: "device",
      definitionId: "unverified-device",
      location: { kind: "ground", position: { x: 11, y: 2 } },
    },
    {
      id: "meals",
      definitionId: "packaged-meal",
      location: { kind: "ground", position: { x: 2, y: 6 } },
      overrides: { amount: 2 },
    },
  ],
};

export const scp1867Scenario = { site, quest };
