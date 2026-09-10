import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import type { SiteTemplate } from "../../../core/site/Site";
import { FieldAgent } from "../../actors/staff/FieldAgent";

export const scp131Attribution = {
  author: "Unknown Author (official SCP Wiki attribution metadata)",
  source: "https://scp-wiki.wikidot.com/scp-131",
  license: "CC-BY-SA-3.0",
  adaptation:
    "Text-only supervised companion trial based on revision38 and the specific SCP-173 incident. No image. Supplemental gaze is local, requires a nearby visible conscious human, and does not replace human work protocol. Full bonding, roaming, climbing, momentum, injuries and generalized warden duties are outside this cut; no eating or sleeping is added.",
};

const {
  health: _health,
  ageYears: _ageYears,
  ...creature
} = FieldAgent.defaults;
export const EyePod: EntityTemplate = {
  id: "scp-131",
  name: "SCP-131 Eye Pod",
  attribution: scp131Attribution,
  description:
    "A small cooperative visitor with unblinking attention, not a controllable staff member or camera. In this bounded trial it can supplement gaze on SCP-173 while on the ground, capable, seeing the source and accompanied by a visible conscious human within six tiles. Moving/carrying it out of view or leaving it without nearby humans removes this support. Human observers are still required for maintenance. No food, sleep or body-care loop is modeled.",
  defaults: {
    ...creature,
    playerControllable: false,
    human: false,
    carryable: false,
    blocksMovement: false,
    acceptsEscort: true,
    needs: {},
    diet: [],
    eatingRate: 0,
    response: { faction: "companion", hostileTo: [], sight: 8, threat: "flee" },
    attentionSupport: { targets: ["scp-173"], humanRange: 6 },
  },
};

export const eyePodSite: SiteTemplate = {
  name: "SCP-131 supervised visit staging",
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
      id: "pod-a",
      definitionId: EyePod.id,
      location: { kind: "ground", position: { x: 6, y: 2 } },
      overrides: { name: "SCP-131-A" },
    },
    {
      id: "pod-b",
      definitionId: EyePod.id,
      location: { kind: "ground", position: { x: 7, y: 4 } },
      overrides: { name: "SCP-131-B" },
    },
  ],
};
