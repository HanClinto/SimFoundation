import type { EntityTemplate } from "../../../core/entity/EntityTemplate";

const attribution = {
  author: "Djoric",
  source: "https://scp-wiki.wikidot.com/scp-1867",
  license: "CC BY-SA 3.0",
  adaptation:
    "The journal/specimen premise comes from SCP-1867; the Kestrel Marsh survey, laboratory findings and mission are original game adaptations, not canonical discoveries.",
};

function collectionItem(
  id: string,
  name: string,
  description: string,
): EntityTemplate {
  return {
    id,
    name,
    description,
    attribution,
    defaults: {
      kind: "item",
      materialId: "wood",
      amount: 1,
      integrity: 100,
      nutrition: 0,
      carryable: true,
      blocksMovement: false,
      blocksSight: false,
    },
  };
}

export const BlackwoodJournal = collectionItem(
  "blackwood-journal",
  "Blackwood's field journal",
  "An account of an unfamiliar marsh insect. It records Blackwood's claim, not an independent corroboration.",
);
export const BlackwoodSpecimen = collectionItem(
  "blackwood-specimen",
  "Preserved collection specimen",
  "A sealed nonliving insect specimen bearing a collection number that matches the journal. Preserve it for physical comparison.",
);
export const IndependentSurvey = collectionItem(
  "independent-survey",
  "Independent Kestrel Marsh survey",
  "An external survey documents the location and matching habitat independently of Blackwood's account. First independent source in this authored case.",
);
export const LaboratoryDossier = collectionItem(
  "laboratory-dossier",
  "Independent laboratory dossier",
  "An independent laboratory's measurements allow comparison against the recovered specimen. Second independent source; unrelated collection objects do not substitute.",
);
export const UnverifiedDevice = collectionItem(
  "unverified-device",
  "Unverified collection instrument",
  "An unidentified device left isolated by the recovery team. This mission does not authorize activating or relocating it; its actual function is not modeled.",
);

export const CorroborationBench: EntityTemplate = {
  id: "corroboration-bench",
  name: "Collection comparison bench",
  description:
    "Compare Blackwood's journal and specimen with independent survey and laboratory records. A generic research score cannot replace these sources.",
  attribution,
  defaults: {
    kind: "facility",
    materialId: "steel",
    amount: 1,
    integrity: 100,
    carryable: false,
    blocksMovement: true,
    blocksSight: false,
    activities: {},
    study: {
      plans: [
        {
          id: "marsh-lead",
          title: "Corroborated lead: Kestrel Marsh",
          ticks: 8,
          requires: [
            BlackwoodJournal.id,
            BlackwoodSpecimen.id,
            IndependentSurvey.id,
            LaboratoryDossier.id,
          ],
          finding:
            "The specimen matches the independent laboratory measurements and the external survey's habitat. Two independent records support a bounded Kestrel Marsh follow-up. This does not validate Blackwood's other claims. The destination is a game-authored lead, not an implemented expedition.",
        },
      ],
      findings: [],
    },
  },
};
