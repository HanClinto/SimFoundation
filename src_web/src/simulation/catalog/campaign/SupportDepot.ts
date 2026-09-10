import type { SiteTemplate } from "../../core/site/Site";

export const supportDepot: SiteTemplate = {
  name: "Regional containment support cache",
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
      id: "library",
      definitionId: "bookshelf",
      location: { kind: "ground", position: { x: 8, y: 1 } },
      overrides: { name: "Donated research library" },
    },
    {
      id: "power",
      definitionId: "containment-charge",
      location: { kind: "ground", position: { x: 8, y: 2 } },
      overrides: { amount: 3 },
    },
    {
      id: "suppression",
      definitionId: "suppression-unit",
      location: { kind: "ground", position: { x: 9, y: 3 } },
      overrides: { amount: 2 },
    },
    {
      id: "medical",
      definitionId: "wound-care-pack",
      location: { kind: "ground", position: { x: 8, y: 4 } },
      overrides: { amount: 2 },
    },
    {
      id: "spares",
      definitionId: "maintenance-parts",
      location: { kind: "ground", position: { x: 9, y: 5 } },
      overrides: { amount: 2 },
    },
  ],
};
