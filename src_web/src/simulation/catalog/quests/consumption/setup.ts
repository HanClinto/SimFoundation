import type { SiteTemplate } from "../../../core/site/Site";
import { ConsumptionTrial } from "./quest";

const site: SiteTemplate = {
  name: "A meal for later",
  terrain: ["#######", "#.....#", "#.....#", "#.....#", "#######"],
  entities: [
    {
      id: "daniel",
      definitionId: "field-agent",
      location: { kind: "ground", position: { x: 1, y: 1 } },
      overrides: {
        name: "Daniel",
        autonomy: false,
        needs: { hunger: { value: 45, increasePerTick: 0 } },
      },
    },
    {
      id: "meal",
      definitionId: "packaged-meal",
      location: { kind: "ground", position: { x: 2, y: 1 } },
      overrides: { amount: 2 },
    },
  ],
};

export const consumptionScenario = {
  site,
  quest: ConsumptionTrial,
  bindings: { diner: "daniel", meal: "meal" },
};
