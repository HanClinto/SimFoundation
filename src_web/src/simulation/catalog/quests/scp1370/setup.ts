import type { SiteTemplate } from "../../../core/site/Site";
import { quest } from "./quest";

const site: SiteTemplate = {
  name: "Gallery intake: SCP-1370",
  terrain: [
    "##############",
    "#......gggggg#",
    "#......g....g#",
    "#...........g#",
    "#......g....g#",
    "#......g....g#",
    "#......gggggg#",
    "#............#",
    "##############",
  ],
  tiles: { g: { blocksMovement: true, blocksSight: false } },
  entities: [
    {
      id: "handler",
      definitionId: "field-agent",
      location: { kind: "ground", position: { x: 2, y: 3 } },
      overrides: { autonomy: false },
    },
    {
      id: "exhibit",
      definitionId: "scp-1370",
      location: { kind: "ground", position: { x: 4, y: 5 } },
    },
    {
      id: "door",
      definitionId: "automatic-steel-door",
      location: { kind: "ground", position: { x: 7, y: 3 } },
      overrides: { name: "Glass display door", blocksSight: false },
    },
    {
      id: "station",
      definitionId: "exhibit-observation-station",
      location: { kind: "ground", position: { x: 9, y: 4 } },
    },
  ],
};

export const scp1370Scenario = { site, quest };
