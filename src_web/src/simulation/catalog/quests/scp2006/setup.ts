import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import type { SiteTemplate } from "../../../core/site/Site";
import { scp2006Attribution } from "../../actors/anomalies/SCP2006";

export const ActingGuide: EntityTemplate = {
  id: "acting-guide",
  name: "Surprise and fear rehearsal guide",
  description:
    "An original physical course guide for staged expressions, not a universal psychology skill. Keep it beside the rehearsal desk; each host must complete their own practical work.",
  attribution: scp2006Attribution,
  defaults: {
    kind: "item",
    materialId: "wood",
    amount: 1,
    integrity: 100,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
  },
};

export const RehearsalDesk: EntityTemplate = {
  id: "rehearsal-desk",
  name: "Practical acting rehearsal",
  description:
    "Eight ticks of physical rehearsal with the guide records a dated finding for this actor only. Another host must rehearse independently.",
  attribution: scp2006Attribution,
  defaults: {
    kind: "facility",
    materialId: "wood",
    amount: 1,
    integrity: 100,
    carryable: false,
    blocksMovement: true,
    blocksSight: false,
    activities: {},
    study: {
      plans: [
        {
          id: "acting-rehearsal",
          title: "Practical surprise/fear rehearsal",
          ticks: 8,
          requires: ["acting-guide"],
          perActor: true,
          finding:
            "This host completed the local practical rehearsal with the physical guide. The record authorizes the bounded curated-hosting routine, not arbitrary manipulation or a general acting skill.",
        },
      ],
      findings: [],
    },
  },
};

export const ApprovedProgramme: EntityTemplate = {
  id: "approved-programme",
  name: "Approved low-budget programme",
  description:
    "An original, deliberately poor horror/science-fiction programme. The physical print is reusable, but the same print counts as a new programme only once at a rig. Completed screening keeps the original object and records its ID.",
  attribution: scp2006Attribution,
  defaults: {
    kind: "item",
    materialId: "plastic",
    amount: 1,
    integrity: 100,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
  },
};

export const UnreviewedProgramme: EntityTemplate = {
  id: "unreviewed-programme",
  name: "Unreviewed footage",
  description:
    "An unapproved print. This bounded protocol will not present it; no harmful footage or arbitrary media ingestion is implemented.",
  defaults: {
    kind: "item",
    materialId: "plastic",
    amount: 1,
    integrity: 100,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
  },
};

export const ScreeningRig: EntityTemplate = {
  id: "screening-rig",
  name: "Curated screening rig",
  description:
    "A rehearsed host and the actual audience must be present. Bring an unused approved programme beside the rig, then perform service or assign a hosting duty. The print is retained and claimed during presentation. A complete showing covers 160 ticks; the next new programme becomes due 32 ticks early. Unapproved/repeated prints do not count.",
  attribution: scp2006Attribution,
  defaults: {
    kind: "facility",
    materialId: "steel",
    amount: 1,
    integrity: 100,
    carryable: false,
    blocksMovement: true,
    blocksSight: false,
    activities: { read: { duration: 4, needChanges: { curiosity: -8 } } },
    service: {
      supplyDefinitionId: "approved-programme",
      amount: 1,
      ticks: 10,
      interval: 160,
      leadTime: 32,
      trainingPlanId: "acting-rehearsal",
      participant: { definitionId: "scp-2006", range: 2 },
      reusableInput: true,
      distinctInput: true,
      repair: { supplyDefinitionId: "maintenance-parts", amount: 1, ticks: 6 },
      history: [],
    },
  },
};

export const screeningSite: SiteTemplate = {
  name: "SCP-2006 curated screening annex",
  terrain: [
    "##############",
    "#............#",
    "#............#",
    "#............#",
    "#............#",
    "#............#",
    "#............#",
    "#............#",
    "##############",
  ],
  entities: [
    {
      id: "audience",
      definitionId: "scp-2006",
      location: { kind: "ground", position: { x: 8, y: 4 } },
    },
    {
      id: "rig",
      definitionId: ScreeningRig.id,
      location: { kind: "ground", position: { x: 8, y: 5 } },
    },
    {
      id: "rehearsal",
      definitionId: RehearsalDesk.id,
      location: { kind: "ground", position: { x: 3, y: 3 } },
    },
    {
      id: "guide",
      definitionId: ActingGuide.id,
      location: { kind: "ground", position: { x: 3, y: 2 } },
    },
    {
      id: "teapot",
      definitionId: ApprovedProgramme.id,
      location: { kind: "ground", position: { x: 11, y: 2 } },
      overrides: { name: "The Terrible Teapot (original programme)" },
    },
    {
      id: "moon",
      definitionId: ApprovedProgramme.id,
      location: { kind: "ground", position: { x: 11, y: 3 } },
      overrides: { name: "The Cardboard Moon (original programme)" },
    },
    {
      id: "fog",
      definitionId: ApprovedProgramme.id,
      location: { kind: "ground", position: { x: 11, y: 6 } },
      overrides: { name: "Fog from the Cupboard (original programme)" },
    },
    {
      id: "unreviewed",
      definitionId: UnreviewedProgramme.id,
      location: { kind: "ground", position: { x: 11, y: 7 } },
    },
    {
      id: "bed",
      definitionId: "bed",
      location: { kind: "ground", position: { x: 5, y: 6 } },
    },
    {
      id: "chair",
      definitionId: "armchair",
      location: { kind: "ground", position: { x: 5, y: 7 } },
    },
    {
      id: "meals",
      definitionId: "packaged-meal",
      location: { kind: "ground", position: { x: 4, y: 6 } },
      overrides: { amount: 2 },
    },
  ],
};
