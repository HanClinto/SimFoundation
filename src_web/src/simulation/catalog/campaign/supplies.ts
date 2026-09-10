import type { EntityTemplate } from "../../core/entity/EntityTemplate";

export const SurveyKit: EntityTemplate = {
  id: "survey-kit",
  name: "Field comparison kit",
  description:
    "A portable set of measuring tools used by the Kestrel field study. Carry it to the field station and keep it nearby during work; it competes with recovered cargo for a carrier.",
  defaults: {
    kind: "item",
    materialId: "steel",
    amount: 1,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
    integrity: 100,
  },
};

export const KestrelStation: EntityTemplate = {
  id: "kestrel-station",
  name: "Kestrel survey station",
  description:
    "Compare the retained field register with real measuring equipment. The depot and its finite supplies persist after departure.",
  defaults: {
    kind: "facility",
    materialId: "steel",
    amount: 1,
    carryable: false,
    blocksMovement: true,
    blocksSight: false,
    integrity: 100,
    activities: {},
    study: {
      plans: [
        {
          id: "depot-survey",
          title: "Kestrel depot survey",
          ticks: 10,
          requires: ["survey-kit"],
          finding:
            "The kit measurements agree with the retained register. The depot remains suitable for a staffed follow-up. Its supplies are finite; removing them does not restock the site. This is an original campaign survey, not an SCP article event.",
        },
      ],
      findings: [],
    },
  },
};
