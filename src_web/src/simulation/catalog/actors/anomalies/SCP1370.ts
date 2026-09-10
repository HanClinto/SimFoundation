import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { FieldAgent } from "../staff/FieldAgent";

export const SCP1370 = {
  id: "scp-1370",
  name: "SCP-1370",
  description:
    "A self-aware, self-powered assemblage that announces extravagant threats but cannot harm living beings. Currently toppled and unable to right itself; careful carrying is possible. It needs no battery or fuel.",
  attribution: {
    author: "Sorts",
    source: "https://scp-wiki.wikidot.com/scp-1370",
    license: "CC BY-SA 3.0",
    adaptation:
      "Bounded recovery of a toppled instance; speech, independent locomotion and its ineffective wrestling are not simulated.",
  },
  defaults: {
    ...FieldAgent.defaults,
    materialId: "steel",
    mobile: false,
    playerControllable: false,
    integrity: 100,
    needs: {},
    diet: [],
    eatingRate: 0,
    response: { faction: "exhibit", hostileTo: [], sight: 8, threat: "flee" },
  },
} satisfies EntityTemplate;
