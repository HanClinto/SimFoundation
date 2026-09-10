import type { EntityTemplate } from "../../../core/entity/EntityTemplate";

export const scp2295Attribution = {
  author: "K Mota",
  source: "https://scp-wiki.wikidot.com/scp-2295",
  license: "CC BY-SA 3.0",
  adaptation:
    "One lung-replacement adaptation: youngest nearby human with major organ trauma, external textiles or finite self-fabric, patchwork provenance and postoperative care. Original adult patients, abstract range/material units and clinical timing. Brain repair, complete anatomy, generated tools, comfort gifts, stuffing regeneration and self-mending are not modeled.",
};

export const SCP2295: EntityTemplate = {
  id: "scp-2295",
  name: "SCP-2295",
  description:
    "A patchwork bear that responds automatically to the youngest human with major organ trauma within two tiles. This bounded adaptation can replace a damaged lung, not a brain. Lay textile bundles nearby to avoid consuming its finite self-fabric reserve. Completed replacement still leaves postoperative care, other wounds and blood loss.",
  attribution: scp2295Attribution,
  defaults: {
    kind: "pawn",
    materialId: "fabric",
    amount: 3,
    integrity: 100,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
    mobile: false,
    canAct: true,
    autonomy: true,
    playerControllable: false,
    human: false,
    needs: {},
    diet: [],
    eatingRate: 0,
    patrol: [],
    queue: [],
    organMending: {
      range: 2,
      ticks: 8,
      supported: ["lung"],
      materialDefinitionId: "textile-bundle",
      amount: 1,
    },
  },
};
