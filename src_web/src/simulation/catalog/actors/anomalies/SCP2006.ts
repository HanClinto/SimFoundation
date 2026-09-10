import type { EntityTemplate } from "../../../core/entity/EntityTemplate";

export const scp2006Attribution = {
  author: "weizhong",
  source: "https://scp-wiki.wikidot.com/scp-2006",
  license: "CC BY-SA 3.0",
  adaptation:
    "Bounded acting preparation and distinct low-quality fictional horror programmes. The rig, original film titles, tick cadence and logged hosting are game abstractions. No source dialogue, movie image, arbitrary shape change, emotion engine, continuous surveillance or global breach effects are implemented.",
};

export const SCP2006: EntityTemplate = {
  id: "scp-2006",
  name: "SCP-2006",
  description:
    "An affable would-be terror, shown here as a fixed audience figure. Containment work is a trained host performing convincing surprise during a curated, deliberately poor horror programme. Its broader shapeshifting and beliefs are not simulated; do not mistake this protocol rehearsal for a full model of the entity.",
  attribution: scp2006Attribution,
  defaults: {
    kind: "pawn",
    materialId: "plastic",
    amount: 1,
    carryable: false,
    blocksMovement: true,
    blocksSight: false,
    mobile: false,
    canAct: true,
    autonomy: false,
    playerControllable: false,
    human: false,
    needs: {},
    diet: [],
    eatingRate: 0,
    queue: [],
    patrol: [],
  },
};
