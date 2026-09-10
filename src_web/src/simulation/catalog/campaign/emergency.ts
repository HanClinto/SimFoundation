import type { SiteTemplate } from "../../core/site/Site";
import type { EntityTemplate } from "../../core/entity/EntityTemplate";
import { FieldAgent } from "../actors/staff/FieldAgent";

export const AccidentCasualty: EntityTemplate = {
  id: "accident-casualty",
  name: "Rowan",
  description:
    "An original injured outpost worker. Uncontrolled bleeding raises blood loss to 100; twenty consecutive critical ticks then cause permanent death. Stabilization stops that clock, not existing injury. The body and carried recorder remain physical if rescue is late. No peaceful mission silently enables this mortality rule.",
  defaults: {
    ...FieldAgent.defaults,
    playerControllable: false,
    acceptsEscort: true,
    autonomy: false,
    health: {
      wounds: [{ id: "accident", severity: 20, bleeding: 1 }],
      bloodLoss: 20,
      mortality: { criticalTicks: 0, fatalAfterTicks: 20 },
    },
  },
};

export const accidentSite: SiteTemplate = {
  name: "Outpost accident: finite rescue interval",
  terrain: [
    "##########",
    "#........#",
    "#........#",
    "#........#",
    "#........#",
    "#........#",
    "##########",
  ],
  entities: [
    {
      id: "rowan",
      definitionId: AccidentCasualty.id,
      location: { kind: "ground", position: { x: 7, y: 3 } },
    },
    {
      id: "recorder",
      definitionId: "survey-kit",
      location: { kind: "carried", carrierId: "rowan" },
      overrides: { name: "Rowan's field recorder" },
    },
  ],
};
