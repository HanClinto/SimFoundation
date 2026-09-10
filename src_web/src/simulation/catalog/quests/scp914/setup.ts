import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import type { SiteTemplate } from "../../../core/site/Site";
import { ProtectiveVest } from "../../campaign/ProtectiveVest";
import { MaintenanceParts } from "../../entities/supplies/MaintenanceParts";

export const scp914Attribution = {
  author: "Dr Gears",
  source: "https://scp-wiki.wikidot.com/scp-914",
  license: "CC-BY-SA-3.0",
  adaptation:
    "Text-only bounded pre-approved nonliving trials based on revision53. Coarse/Very Fine vest results, ports, sixty-tick cycles and research authorization are original game abstractions, not canonical recipe claims. Other settings, biological/weapon/medical trials, full guarding/authorization procedures and internal mechanism are not simulated. No image is used.",
};

export const LatticeShell = {
  ...ProtectiveVest,
  id: "clockwork-lattice-shell",
  name: "Clockwork lattice shell",
  attribution: scp914Attribution,
  description:
    "An original bounded Very Fine result: thirty modeled severity reduction but one hundred condition lost per impact. It can absorb one kinetic impact while serviceable, then fails; low-damage repeated hits still exhaust it quickly. It does not heal old wounds, provide charges or qualify as another processing input. This is not a universal SCP-914 recipe.",
  defaults: {
    ...ProtectiveVest.defaults,
    equipment: {
      ...ProtectiveVest.defaults.equipment,
      armor: { reduction: 30, wear: 100 },
    },
  },
} satisfies EntityTemplate;

export const SCP914: EntityTemplate = {
  id: "scp-914",
  name: "SCP-914 approved trial apparatus",
  attribution: scp914Attribution,
  description:
    "The bounded machine accepts only one actual unequipped protective-vest. Coarse yields two maintenance packs; very-fine yields one short-lived lattice shell. Process physically delivers to intake, reaches the panel and winds for two ticks, then the machine owns a sixty-tick irreversible cycle. Staff may leave; clear output for release. No other requests or biological tests are approved in this cut.",
  defaults: {
    kind: "facility",
    materialId: "steel",
    amount: 1,
    integrity: 100,
    carryable: false,
    blocksMovement: true,
    blocksSight: true,
    activities: {},
    processor: {
      activationTicks: 2,
      intakeOffset: { x: -2, y: 0 },
      operatorOffset: { x: -1, y: 0 },
      outputOffset: { x: 2, y: 0 },
      nextRunId: 1,
      current: null,
      recipes: [
        {
          id: "coarse",
          title: "Coarse: recover components",
          inputDefinitionId: ProtectiveVest.id,
          ticks: 60,
          output: {
            ...MaintenanceParts.defaults,
            definitionId: MaintenanceParts.id,
            name: MaintenanceParts.name,
            amount: 2,
          },
        },
        {
          id: "very-fine",
          title: "Very Fine: lattice shell",
          inputDefinitionId: ProtectiveVest.id,
          ticks: 60,
          output: {
            ...LatticeShell.defaults,
            definitionId: LatticeShell.id,
            name: LatticeShell.name,
          },
        },
      ],
    },
  },
};

export const clockworkSite: SiteTemplate = {
  name: "SCP-914 bounded nonliving trial cell",
  terrain: [
    "############",
    "#..........#",
    "#..........#",
    "#..........#",
    "#..........#",
    "#..........#",
    "############",
  ],
  entities: [
    {
      id: "machine",
      definitionId: SCP914.id,
      location: { kind: "ground", position: { x: 6, y: 3 } },
    },
  ],
};
