import type { EntityTemplate } from "../../../core/entity/EntityTemplate";

export const ExhibitObservationStation: EntityTemplate = {
  id: "exhibit-observation-station",
  name: "Exhibit observation station",
  description:
    "A controlled, non-destructive inspection of SCP-1370's recovered body and its ineffective threats. This is not a combat challenge.",
  attribution: {
    author: "Sorts",
    source: "https://scp-wiki.wikidot.com/scp-1370",
    license: "CC BY-SA 3.0",
    adaptation:
      "Original recovery mission and controlled observation; the oversized glass bay stands in for a display enclosure without a container-volume simulation.",
  },
  defaults: {
    kind: "facility",
    carryable: false,
    blocksMovement: true,
    blocksSight: false,
    materialId: "steel",
    amount: 1,
    integrity: 100,
    activities: {},
    study: {
      plans: [
        {
          id: "safe-exhibit",
          title: "SCP-1370: intact recovered exhibit",
          ticks: 6,
          requires: ["scp-1370"],
          finding:
            "The recovered exhibit remains intact, articulates without an external power supply and poses no modeled injury threat. Its belligerence is not grounds for destructive handling. Keep it in the display enclosure after inspection. This finding summarizes a bounded adaptation of the source, not simulated dialogue or a powered-device experiment.",
        },
      ],
      findings: [],
    },
  },
};
