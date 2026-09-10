import type { EntityTemplate } from "../../core/entity/EntityTemplate";
import type { SiteTemplate } from "../../core/site/Site";
import type { StudyPlan } from "../../core/entity/Study";

export const courierInspection: StudyPlan = {
  id: "courier-inspection",
  title: "Courier: intact vial and accountable case",
  ticks: 6,
  requires: ["courier-specimen", "specimen-case"],
  finding:
    "The physically unpacked survey vial is intact and its case remains available for inspection. The worn equipment is retained rather than replaced on return. This is an original handling rehearsal, not an SCP discovery or automatic case repair.",
};

export const CourierSpecimen: EntityTemplate = {
  id: "courier-specimen",
  name: "Fragile survey vial",
  description:
    "An original nonliving survey specimen in a damaged transport sleeve. Its handling protocol requires a compatible sealed case; bare pickup is refused. Unpack at the home comparison bench before physical inspection.",
  defaults: {
    kind: "item",
    materialId: "stone",
    amount: 1,
    integrity: 100,
    carryable: true,
    requiresCase: true,
    blocksMovement: false,
    blocksSight: false,
  },
};

export const SpecimenCase: EntityTemplate = {
  id: "specimen-case",
  name: "Padded specimen case",
  description:
    "Holds one nonliving survey vial. Carry this actual case while sealing; five work ticks and ten condition points close it. The case must retain positive condition. Its contents keep their own identity through transport. Unpacking does not restore spent condition.",
  defaults: {
    kind: "item",
    materialId: "plastic",
    amount: 1,
    integrity: 45,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
    case: {
      accepts: ["courier-specimen"],
      sealTicks: 5,
      sealWear: 10,
      sealed: false,
    },
  },
};

export const courierSite: SiteTemplate = {
  name: "Damaged-specimen courier depot",
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
      id: "vial",
      definitionId: CourierSpecimen.id,
      location: { kind: "ground", position: { x: 8, y: 3 } },
    },
    {
      id: "damaged-case",
      definitionId: SpecimenCase.id,
      location: { kind: "ground", position: { x: 7, y: 2 } },
      overrides: { name: "Unserviceable courier case", integrity: 8 },
    },
  ],
};
