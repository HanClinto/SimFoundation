export interface PersonnelNeeds {
  readonly satiety: number;
  readonly rest: number;
}

export type EquipmentSlot =
  | "head"
  | "body"
  | "primaryHand"
  | "offHand"
  | "accessory";

export interface PersonnelItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface PersonnelEquipment {
  readonly head: PersonnelItem | null;
  readonly body: PersonnelItem | null;
  readonly primaryHand: PersonnelItem | null;
  readonly offHand: PersonnelItem | null;
  readonly accessory: PersonnelItem | null;
}

export interface PersonnelSkill {
  readonly id:
    | "research"
    | "engineering"
    | "medical"
    | "security"
    | "logistics";
  readonly level: number;
}

export type BodyRegion =
  | "head"
  | "torso"
  | "leftArm"
  | "rightArm"
  | "leftHand"
  | "rightHand"
  | "leftLeg"
  | "rightLeg"
  | "leftFoot"
  | "rightFoot";

export interface PersonnelEffect {
  readonly id: string;
  readonly name: string;
  readonly kind: "injury" | "condition";
  readonly severity: "minor" | "moderate" | "serious";
  readonly bodyRegions: readonly BodyRegion[];
  readonly physicalHealthPenalty: number;
}

export interface AssessmentConclusion {
  readonly subjectEffectId: string;
  readonly label: string;
  readonly status: "suspected" | "confirmed" | "ruled-out";
  readonly confidence: number;
  readonly bodyRegions: readonly BodyRegion[];
}

export interface PhysicalObservation {
  readonly id: string;
  readonly observedTick: number;
  readonly source: string;
  readonly label: string;
  readonly bodyRegions: readonly BodyRegion[];
}

export interface PhysicalAssessment {
  readonly id: string;
  readonly assessedTick: number;
  readonly assessor: string;
  readonly method: string;
  readonly confidence: number;
  readonly estimate: {
    readonly minimum: number;
    readonly maximum: number;
  };
  readonly conclusions: readonly AssessmentConclusion[];
}

export interface PersonnelRecord {
  readonly id: string;
  readonly name: string;
  readonly assignment: string;
  readonly activity: string;
  readonly clearance: number;
  readonly resilience: number;
  readonly stress: number;
  readonly fear: number;
  readonly needs: PersonnelNeeds;
  readonly traits: readonly string[];
  readonly skills: readonly PersonnelSkill[];
  readonly equipment: PersonnelEquipment;
  readonly inventory: readonly PersonnelItem[];
  readonly effects: readonly PersonnelEffect[];
  readonly physicalObservations: readonly PhysicalObservation[];
  readonly physicalAssessments: readonly PhysicalAssessment[];
}

export interface DerivedMeasure {
  readonly score: number;
  readonly band: "critical" | "poor" | "strained" | "stable" | "strong";
  readonly contributors: readonly string[];
}

const MAX_PHYSICAL_ASSESSMENTS = 50;

const STARTING_PERSONNEL: readonly PersonnelRecord[] = [
  {
    id: "person-mara-voss",
    name: "Dr. Mara Voss",
    assignment: "Research",
    activity: "Reviewing SCP-9620 telemetry",
    clearance: 3,
    resilience: 72,
    stress: 18,
    fear: 6,
    needs: { satiety: 82, rest: 76 },
    traits: ["Methodical", "Psychically Dense"],
    skills: [
      { id: "research", level: 8 },
      { id: "medical", level: 3 },
      { id: "logistics", level: 2 },
    ],
    equipment: {
      head: null,
      body: {
        id: "item-lab-coat-mara",
        name: "Research Lab Coat",
        description: "Standard issue coat with a Level 3 badge clip.",
      },
      primaryHand: {
        id: "item-tablet-mara",
        name: "Telemetry Tablet",
        description: "Displays buffered SCP-9620 sensor readings.",
      },
      offHand: null,
      accessory: {
        id: "item-dosimeter-mara",
        name: "Anomalous Dosimeter",
        description: "Passive exposure monitor; calibration provisional.",
      },
    },
    inventory: [
      {
        id: "item-notebook-mara",
        name: "Bound Research Notes",
        description: "Handwritten observations and unresolved questions.",
      },
      {
        id: "item-coffee-mara",
        name: "Coffee Thermos",
        description: "Still warm.",
      },
    ],
    effects: [],
    physicalObservations: [],
    physicalAssessments: [],
  },
  {
    id: "person-caleb-ward",
    name: "Caleb Ward",
    assignment: "Engineering",
    activity: "Inspecting generator relays",
    clearance: 2,
    resilience: 61,
    stress: 24,
    fear: 4,
    needs: { satiety: 69, rest: 71 },
    traits: ["Practical", "Light Sleeper"],
    skills: [
      { id: "engineering", level: 7 },
      { id: "logistics", level: 4 },
      { id: "security", level: 2 },
    ],
    equipment: {
      head: {
        id: "item-hardhat-caleb",
        name: "Utility Hard Hat",
        description: "Impact-rated with a mounted work lamp.",
      },
      body: {
        id: "item-coveralls-caleb",
        name: "Engineering Coveralls",
        description: "Insulated Foundation maintenance uniform.",
      },
      primaryHand: {
        id: "item-multimeter-caleb",
        name: "Diagnostic Multimeter",
        description: "Rated for Site 828 generator relays.",
      },
      offHand: null,
      accessory: {
        id: "item-toolbelt-caleb",
        name: "Tool Belt",
        description: "Common repair tools in labeled loops.",
      },
    },
    inventory: [
      {
        id: "item-fuse-caleb",
        name: "Replacement Fuse",
        description: "Industrial 80A fuse.",
      },
    ],
    effects: [],
    physicalObservations: [],
    physicalAssessments: [],
  },
  {
    id: "person-priya-shah",
    name: "Priya Shah",
    assignment: "Medical",
    activity: "Restocking the infirmary",
    clearance: 2,
    resilience: 78,
    stress: 15,
    fear: 3,
    needs: { satiety: 74, rest: 83 },
    traits: ["Compassionate", "Steady Hands"],
    skills: [
      { id: "medical", level: 8 },
      { id: "research", level: 4 },
      { id: "logistics", level: 3 },
    ],
    equipment: {
      head: null,
      body: {
        id: "item-scrubs-priya",
        name: "Medical Scrubs",
        description: "Foundation infirmary uniform.",
      },
      primaryHand: null,
      offHand: null,
      accessory: {
        id: "item-medkit-priya",
        name: "Trauma Kit",
        description: "Compact first-response supplies.",
      },
    },
    inventory: [
      {
        id: "item-sedative-priya",
        name: "Sedative Ampoule",
        description: "Controlled medical stock.",
      },
    ],
    effects: [],
    physicalObservations: [],
    physicalAssessments: [],
  },
  {
    id: "person-lena-ortiz",
    name: "Lena Ortiz",
    assignment: "Security",
    activity: "Patrolling Sector B1",
    clearance: 2,
    resilience: 84,
    stress: 21,
    fear: 2,
    needs: { satiety: 77, rest: 68 },
    traits: ["Iron-Willed", "Alert"],
    skills: [
      { id: "security", level: 8 },
      { id: "medical", level: 2 },
      { id: "logistics", level: 3 },
    ],
    equipment: {
      head: {
        id: "item-helmet-lena",
        name: "Security Helmet",
        description: "Light ballistic helmet with radio mount.",
      },
      body: {
        id: "item-vest-lena",
        name: "Security Vest",
        description: "Standard protective vest.",
      },
      primaryHand: {
        id: "item-baton-lena",
        name: "Containment Baton",
        description: "Less-lethal security baton.",
      },
      offHand: {
        id: "item-radio-lena",
        name: "Site Radio",
        description: "Encrypted facility communications.",
      },
      accessory: null,
    },
    inventory: [
      {
        id: "item-restraints-lena",
        name: "Restraints",
        description: "Two reusable restraint sets.",
      },
    ],
    effects: [
      {
        id: "effect-right-forearm-laceration-lena",
        name: "Deep right forearm laceration",
        kind: "injury",
        severity: "serious",
        bodyRegions: ["rightArm"],
        physicalHealthPenalty: 14,
      },
    ],
    physicalObservations: [
      {
        id: "observation-profuse-bleeding-lena",
        observedTick: 0,
        source: "Supervisor report",
        label: "Profuse bleeding observed",
        bodyRegions: ["rightArm"],
      },
    ],
    physicalAssessments: [],
  },
  {
    id: "person-jon-bell",
    name: "Jon Bell",
    assignment: "Facilities",
    activity: "Cleaning the west corridor",
    clearance: 1,
    resilience: 53,
    stress: 27,
    fear: 9,
    needs: { satiety: 63, rest: 59 },
    traits: ["Sociable", "Superstitious"],
    skills: [
      { id: "logistics", level: 6 },
      { id: "engineering", level: 4 },
      { id: "security", level: 2 },
    ],
    equipment: {
      head: null,
      body: {
        id: "item-coveralls-jon",
        name: "Facilities Coveralls",
        description: "Durable gray work uniform.",
      },
      primaryHand: {
        id: "item-mop-jon",
        name: "Utility Mop",
        description: "Color-coded for low-risk corridors.",
      },
      offHand: null,
      accessory: {
        id: "item-keys-jon",
        name: "Service Key Ring",
        description: "Access keys for permitted maintenance areas.",
      },
    },
    inventory: [
      {
        id: "item-cleaner-jon",
        name: "Cleaning Compound",
        description: "Non-reactive general-purpose concentrate.",
      },
    ],
    effects: [
      {
        id: "effect-sprained-left-ankle-jon",
        name: "Sprained left ankle",
        kind: "injury",
        severity: "moderate",
        bodyRegions: ["leftFoot"],
        physicalHealthPenalty: 9,
      },
    ],
    physicalObservations: [],
    physicalAssessments: [],
  },
  {
    id: "person-emil-novak",
    name: "Emil Novak",
    assignment: "Logistics",
    activity: "Taking a scheduled break",
    clearance: 1,
    resilience: 47,
    stress: 31,
    fear: 12,
    needs: { satiety: 58, rest: 64 },
    traits: ["Resourceful", "Psychically Attuned"],
    skills: [
      { id: "logistics", level: 7 },
      { id: "engineering", level: 3 },
      { id: "research", level: 2 },
    ],
    equipment: {
      head: null,
      body: {
        id: "item-jacket-emil",
        name: "Logistics Jacket",
        description: "High-visibility Foundation issue.",
      },
      primaryHand: null,
      offHand: null,
      accessory: {
        id: "item-scanner-emil",
        name: "Inventory Scanner",
        description: "Tracks ordinary material transfers.",
      },
    },
    inventory: [
      {
        id: "item-manifest-emil",
        name: "Receiving Manifest",
        description: "Today's expected deliveries.",
      },
      {
        id: "item-snack-emil",
        name: "Wrapped Snack",
        description: "Saved for later.",
      },
    ],
    effects: [],
    physicalObservations: [],
    physicalAssessments: [],
  },
];

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function bandFor(score: number): DerivedMeasure["band"] {
  if (score < 20) return "critical";
  if (score < 40) return "poor";
  if (score < 60) return "strained";
  if (score < 80) return "stable";
  return "strong";
}

export function createStartingPersonnel(): readonly PersonnelRecord[] {
  return structuredClone(STARTING_PERSONNEL);
}

export function derivePhysicalHealth(person: PersonnelRecord): number {
  return clamp(
    100 -
      person.effects.reduce(
        (total, effect) => total + effect.physicalHealthPenalty,
        0,
      ),
  );
}

export function latestPhysicalAssessment(
  person: PersonnelRecord,
): PhysicalAssessment | null {
  return person.physicalAssessments.at(-1) ?? null;
}

export function assessPhysicalHealth(
  person: PersonnelRecord,
  assessedTick: number,
): PersonnelRecord {
  const physicalHealth = derivePhysicalHealth(person);
  const assessment: PhysicalAssessment = {
    id: `physical-${person.id}-${assessedTick}`,
    assessedTick,
    assessor: "Site 828 Medical",
    method: "Basic physical examination",
    confidence: 0.9,
    estimate: {
      minimum: Math.max(0, physicalHealth - 2),
      maximum: Math.min(100, physicalHealth + 2),
    },
    conclusions: person.effects.map((effect) => ({
      subjectEffectId: effect.id,
      label: effect.name,
      status: "confirmed",
      confidence: 0.9,
      bodyRegions: effect.bodyRegions,
    })),
  };

  return {
    ...person,
    physicalAssessments: [
      ...person.physicalAssessments
        .filter(
          ({ assessedTick: previousTick }) => previousTick !== assessedTick,
        )
        .slice(-(MAX_PHYSICAL_ASSESSMENTS - 1)),
      assessment,
    ],
  };
}

export function advancePersonnel(person: PersonnelRecord): PersonnelRecord {
  const lowRestPressure = person.needs.rest < 40 ? 0.035 : 0;
  const restorativeActivity = person.activity.toLowerCase().includes("break");
  return {
    ...person,
    stress: round(
      clamp(
        person.stress + (restorativeActivity ? -0.04 : 0.008 + lowRestPressure),
      ),
    ),
    fear: round(clamp(person.fear - 0.01)),
    needs: {
      satiety: round(clamp(person.needs.satiety - 0.035)),
      rest: round(clamp(person.needs.rest - 0.02)),
    },
  };
}

export function deriveMood(person: PersonnelRecord): DerivedMeasure {
  const physicalCondition =
    person.needs.satiety * 0.35 +
    person.needs.rest * 0.4 +
    derivePhysicalHealth(person) * 0.25;
  const score = Math.round(
    clamp(physicalCondition - person.stress * 0.28 - person.fear * 0.12),
  );
  const contributors = [
    person.needs.satiety < 45 ? "Hunger is lowering mood" : "Recently fed",
    person.needs.rest < 45 ? "Fatigue is lowering mood" : "Adequately rested",
    person.activity.toLowerCase().includes("break")
      ? "Restorative break"
      : person.stress > 50
        ? "Sustained stress"
        : "Manageable workload",
  ];
  return { score, band: bandFor(score), contributors };
}

export function deriveSanity(person: PersonnelRecord): DerivedMeasure {
  const acutePressure =
    person.fear * 0.45 + Math.max(0, 45 - person.needs.rest) * 0.25;
  const sustainedPressure = person.stress * 0.4;
  const resilienceBuffer = (person.resilience - 50) * 0.35;
  const score = Math.round(
    clamp(100 - acutePressure - sustainedPressure + resilienceBuffer),
  );
  const contributors = [
    person.resilience >= 70
      ? "High mental resilience"
      : "Limited resilience reserve",
    person.stress > 50
      ? "Sustained stress pressure"
      : "Stress within coping capacity",
    person.fear > 35 ? "Acute fear response" : "No acute fear response",
  ];
  return { score, band: bandFor(score), contributors };
}
