import type { GameState } from "./state";
import type { SiteJob } from "./jobs";
import { sameTile, type TilePosition } from "./world";

export const TRIAL_LOCATION: TilePosition = { x: 70, y: 58 };
export const TRIAL_WORK_SITE: TilePosition = { x: 70, y: 60 };
export const TRIAL_BARRIER_LOCATION: TilePosition = { x: 70, y: 61 };
export const TRIAL_SECONDARY_LOCATION: TilePosition = { x: 70, y: 63 };

function updateTrialBarrier(state: GameState): GameState {
  const tiles = [...state.world.map.tiles];
  tiles[
    TRIAL_BARRIER_LOCATION.y * state.world.map.width + TRIAL_BARRIER_LOCATION.x
  ] = state.containmentTrial.integrity === 0 ? "floor" : "wall";
  tiles[
    TRIAL_SECONDARY_LOCATION.y * state.world.map.width +
      TRIAL_SECONDARY_LOCATION.x
  ] = state.containmentTrial.secondaryIntegrity === 0 ? "floor" : "closed-door";
  return {
    ...state,
    world: { ...state.world, map: { ...state.world.map, tiles } },
  };
}
export const BARRIER_MATERIALS = {
  concrete: {
    name: "Concrete",
    corrosionResistance: 1,
    impactResistance: 9,
    cost: 2,
  },
  ceramic: {
    name: "Vitrified ceramic",
    corrosionResistance: 9,
    impactResistance: 2,
    cost: 3,
  },
  composite: {
    name: "Layered composite",
    corrosionResistance: 7,
    impactResistance: 7,
    cost: 6,
  },
} as const;
export type BarrierMaterial = keyof typeof BARRIER_MATERIALS;
export type TrialProtocol = "passive" | "stimulated";
export type TrialPhase =
  | "unprepared"
  | "installing"
  | "ready"
  | "preparing"
  | "running"
  | "breached"
  | "repairing";
export interface TrialEvidence {
  readonly id: string;
  readonly recordedTick: number;
  readonly label: string;
  readonly certainty: "observed" | "provisional";
  readonly supersedes: string | null;
}
export interface TrialReading {
  readonly observedTick: number;
  readonly phase: TrialPhase;
  readonly integrity: number;
  readonly elapsed: number;
  readonly material: BarrierMaterial;
  readonly protocol: TrialProtocol;
}
export interface ContainmentTrial {
  readonly specimenId: "AN-001";
  readonly phase: TrialPhase;
  readonly material: BarrierMaterial;
  readonly protocol: TrialProtocol;
  readonly integrity: number;
  readonly pendingMaterial: BarrierMaterial | null;
  readonly elapsed: number;
  readonly supplyCredits: number;
  readonly spentCredits: number;
  readonly nextOrder: number;
  readonly workOrderId: string | null;
  readonly trialsCompleted: number;
  readonly breaches: number;
  readonly autoIsolate: boolean;
  readonly lastReading: TrialReading | null;
  readonly evidence: readonly TrialEvidence[];
  readonly secondaryIntegrity: number;
  readonly supplyStage: "collecting" | "delivering" | "fitting" | null;
  readonly automaticRepairs: boolean;
  readonly repairMaterial: BarrierMaterial;
  readonly maintenanceReason: string | null;
  readonly barrierReadings: Readonly<
    Record<
      "primary" | "secondary",
      {
        readonly material: BarrierMaterial;
        readonly integrity: number;
        readonly observedTick: number;
      } | null
    >
  >;
}

export type TrialCommandCode =
  | "accepted"
  | "busy"
  | "not-ready"
  | "insufficient-supplies"
  | "invalid-material"
  | "invalid-protocol";
export interface TrialCommandResult {
  readonly state: GameState;
  readonly code: TrialCommandCode;
}

export function createContainmentTrial(): ContainmentTrial {
  return {
    specimenId: "AN-001",
    phase: "unprepared",
    material: "concrete",
    protocol: "passive",
    integrity: 100,
    pendingMaterial: null,
    elapsed: 0,
    supplyCredits: 24,
    spentCredits: 0,
    nextOrder: 1,
    workOrderId: null,
    trialsCompleted: 0,
    breaches: 0,
    autoIsolate: true,
    lastReading: null,
    evidence: [],
    secondaryIntegrity: 100,
    supplyStage: null,
    automaticRepairs: false,
    repairMaterial: "composite",
    maintenanceReason: null,
    barrierReadings: { primary: null, secondary: null },
  };
}

function workOrder(
  state: GameState,
  title: string,
  skillId: SiteJob["skillId"],
  work: number,
  phase: TrialPhase,
  workSite: TilePosition = TRIAL_WORK_SITE,
): GameState {
  const id = `job-trial-${state.containmentTrial.nextOrder}`;
  const job: SiteJob = {
    id,
    title,
    description:
      "AN-001 enclosure work package. Materials must be delivered before fitting; restore the primary panel and secondary lining.",
    skillId,
    priority: phase === "repairing" ? 95 : 45,
    xpPerTick: 1,
    preferredBiases: {
      mindMight: skillId === "engineering" ? 1 : -1,
      receptiveResolute: 1,
    },
    status: "available",
    progress: 0,
    requiredProgress: work,
    assignedPersonId: null,
    assignmentReason: null,
    authorizedTick: state.tick,
    completedTick: null,
    workSite,
    requiredWorkerId: null,
  };
  return {
    ...state,
    jobs: [...state.jobs, job],
    containmentTrial: {
      ...state.containmentTrial,
      phase,
      workOrderId: id,
      nextOrder: state.containmentTrial.nextOrder + 1,
    },
  };
}

export function orderTrialBarrier(
  state: GameState,
  material: BarrierMaterial,
): TrialCommandResult {
  if (!Object.hasOwn(BARRIER_MATERIALS, material))
    return { state, code: "invalid-material" };
  if (
    !["unprepared", "ready", "breached"].includes(state.containmentTrial.phase)
  )
    return { state, code: "busy" };
  const definition = BARRIER_MATERIALS[material];
  if (state.containmentTrial.supplyCredits < definition.cost)
    return { state, code: "insufficient-supplies" };
  const next = {
    ...state,
    containmentTrial: {
      ...state.containmentTrial,
      pendingMaterial: material,
      supplyStage: "collecting" as const,
      maintenanceReason: null,
      supplyCredits: state.containmentTrial.supplyCredits - definition.cost,
      spentCredits: state.containmentTrial.spentCredits + definition.cost,
    },
  };
  return {
    code: "accepted",
    state: workOrder(
      next,
      `Collect ${definition.name.toLowerCase()} enclosure repair kit`,
      "logistics",
      8,
      state.containmentTrial.phase === "breached" ? "repairing" : "installing",
      state.construction.stockpile,
    ),
  };
}

export function authorizeContainmentTrial(
  state: GameState,
  protocol: TrialProtocol,
  autoIsolate: boolean,
): TrialCommandResult {
  if (protocol !== "passive" && protocol !== "stimulated")
    return { state, code: "invalid-protocol" };
  if (state.containmentTrial.phase !== "ready")
    return { state, code: "not-ready" };
  if (typeof autoIsolate !== "boolean")
    return { state, code: "invalid-protocol" };
  const next = {
    ...state,
    containmentTrial: {
      ...state.containmentTrial,
      protocol,
      autoIsolate,
      elapsed: 0,
    },
  };
  return {
    code: "accepted",
    state: workOrder(
      next,
      protocol === "passive"
        ? "Prepare passive contact trial"
        : "Prepare mechanical stimulus trial",
      "research",
      32,
      "preparing",
    ),
  };
}

export function isolateContainmentTrial(state: GameState): GameState {
  if (state.containmentTrial.phase !== "running") return state;
  return {
    ...state,
    containmentTrial: {
      ...state.containmentTrial,
      phase: "ready",
      trialsCompleted: state.containmentTrial.trialsCompleted + 1,
    },
  };
}

export function advanceContainmentTrial(state: GameState): GameState {
  let trial = state.containmentTrial;
  if (trial.integrity === 0 && trial.secondaryIntegrity > 0) {
    const loss =
      Math.max(0.1, 9 - BARRIER_MATERIALS.composite.corrosionResistance) *
      0.175;
    trial = {
      ...trial,
      secondaryIntegrity: Math.max(
        0,
        Math.round((trial.secondaryIntegrity - loss) * 100) / 100,
      ),
    };
    state = updateTrialBarrier({ ...state, containmentTrial: trial });
  }
  const completedWork = state.jobs.find(
    (job) => job.id === trial.workOrderId && job.status === "completed",
  );
  if (completedWork) {
    if (trial.supplyStage === "collecting") {
      return {
        ...state,
        jobs: state.jobs.map((job) =>
          job.id === completedWork.id
            ? {
                ...job,
                title: job.title.replace("Collect", "Deliver"),
                status: "in-progress",
                progress: 0,
                completedTick: null,
                workSite: TRIAL_WORK_SITE,
                requiredWorkerId: completedWork.assignedPersonId,
              }
            : job,
        ),
        personnel: state.personnel.map((person) =>
          person.id === completedWork.assignedPersonId
            ? {
                ...person,
                currentJobId: completedWork.id,
                activity: "Delivering AN-001 enclosure materials",
              }
            : person,
        ),
        containmentTrial: { ...trial, supplyStage: "delivering" },
      };
    }
    if (trial.supplyStage === "delivering") {
      return workOrder(
        { ...state, containmentTrial: { ...trial, supplyStage: "fitting" } },
        `Fit ${BARRIER_MATERIALS[trial.pendingMaterial!].name.toLowerCase()} enclosure barrier`,
        "engineering",
        42,
        trial.phase,
      );
    }
    if (
      trial.supplyStage === "fitting" &&
      Object.values(state.world.positions).some(
        (position) =>
          sameTile(position, TRIAL_BARRIER_LOCATION) ||
          sameTile(position, TRIAL_SECONDARY_LOCATION),
      )
    ) {
      return {
        ...state,
        containmentTrial: {
          ...trial,
          maintenanceReason:
            "Final assembly awaits clearance of the barrier footprint.",
        },
      };
    }
    trial =
      trial.phase === "preparing"
        ? { ...trial, phase: "running", elapsed: 0, workOrderId: null }
        : {
            ...trial,
            phase: "ready",
            material: trial.pendingMaterial ?? trial.material,
            pendingMaterial: null,
            integrity: 100,
            secondaryIntegrity: 100,
            supplyStage: null,
            maintenanceReason: null,
            elapsed: 0,
            workOrderId: null,
          };
    return updateTrialBarrier({ ...state, containmentTrial: trial });
  }
  if (trial.phase !== "running") return state;
  const material = BARRIER_MATERIALS[trial.material];
  const chemicalLoss = Math.max(0.1, 9 - material.corrosionResistance) * 0.7;
  const impactLoss =
    trial.protocol === "stimulated"
      ? Math.max(0, 9 - material.impactResistance) * 0.9
      : 0;
  const integrity = Math.max(
    0,
    Math.round((trial.integrity - chemicalLoss - impactLoss) * 100) / 100,
  );
  const elapsed = trial.elapsed + 1;
  const breached = integrity === 0;
  const isolated = trial.autoIsolate && integrity <= 30;
  const finished = elapsed >= 24 || isolated;
  return updateTrialBarrier({
    ...state,
    containmentTrial: {
      ...trial,
      integrity,
      elapsed,
      phase: breached ? "breached" : finished ? "ready" : "running",
      breaches: trial.breaches + Number(breached),
      trialsCompleted: trial.trialsCompleted + Number(breached || finished),
    },
  });
}

export function setTrialMaintenance(
  state: GameState,
  automaticRepairs: boolean,
  repairMaterial: BarrierMaterial,
): GameState {
  if (
    typeof automaticRepairs !== "boolean" ||
    !Object.hasOwn(BARRIER_MATERIALS, repairMaterial)
  )
    return state;
  return {
    ...state,
    containmentTrial: {
      ...state.containmentTrial,
      automaticRepairs,
      repairMaterial,
      maintenanceReason: null,
    },
  };
}

export function discoverTrialMaintenance(state: GameState): GameState {
  const trial = state.containmentTrial;
  const reading = trial.barrierReadings.primary;
  if (
    !trial.automaticRepairs ||
    trial.workOrderId ||
    !reading ||
    reading.observedTick !== state.tick ||
    reading.integrity > 55 ||
    !["ready", "breached"].includes(trial.phase)
  )
    return state;
  const result = orderTrialBarrier(state, trial.repairMaterial);
  return result.code === "accepted"
    ? result.state
    : {
        ...state,
        containmentTrial: {
          ...trial,
          maintenanceReason:
            "Automatic repair blocked: insufficient enclosure materials.",
        },
      };
}

export function observeContainmentTrial(state: GameState): GameState {
  const barrierReadings = { ...state.containmentTrial.barrierReadings };
  for (const [id, position] of [
    ["primary", TRIAL_BARRIER_LOCATION],
    ["secondary", TRIAL_SECONDARY_LOCATION],
  ] as const) {
    if (
      state.observations.visibleTiles.includes(
        position.y * state.world.map.width + position.x,
      )
    ) {
      barrierReadings[id] = {
        observedTick: state.tick,
        material:
          id === "primary" ? state.containmentTrial.material : "composite",
        integrity:
          id === "primary"
            ? state.containmentTrial.integrity
            : state.containmentTrial.secondaryIntegrity,
      };
    }
  }
  state = {
    ...state,
    containmentTrial: { ...state.containmentTrial, barrierReadings },
  };
  const secondary = barrierReadings.secondary;
  if (secondary?.observedTick === state.tick && secondary.integrity < 95) {
    const id = `secondary-${secondary.integrity === 0 ? "failed" : "damaged"}-${state.containmentTrial.breaches}`;
    if (!state.containmentTrial.evidence.some((entry) => entry.id === id))
      state = {
        ...state,
        containmentTrial: {
          ...state.containmentTrial,
          evidence: [
            ...state.containmentTrial.evidence,
            {
              id,
              recordedTick: state.tick,
              certainty: "observed" as const,
              supersedes: null,
              label:
                secondary.integrity === 0
                  ? "Secondary hatch failed after continued contact. Both barriers are open; localized spill remains at the enclosure."
                  : "Secondary composite lining is losing integrity after primary wall failure. The catch enclosure provides limited response time.",
            },
          ].slice(-50),
        },
      };
  }
  if (secondary?.observedTick === state.tick && secondary.integrity === 0) {
    state = {
      ...state,
      incident: {
        level: "red",
        summary:
          "AN-001 secondary enclosure failed; localized spill requires rebuilding",
      },
    };
  }
  const trial = state.containmentTrial;
  if (
    trial.phase === "unprepared" ||
    !state.observations.visibleTiles.includes(
      TRIAL_BARRIER_LOCATION.y * state.world.map.width +
        TRIAL_BARRIER_LOCATION.x,
    )
  )
    return state;
  const evidence = [...trial.evidence];
  const add = (
    id: string,
    label: string,
    certainty: TrialEvidence["certainty"],
    supersedes: string | null = null,
  ) => {
    if (!evidence.some((entry) => entry.id === id))
      evidence.push({
        id,
        label,
        certainty,
        recordedTick: state.tick,
        supersedes,
      });
  };
  if (trial.phase === "ready" && trial.elapsed === 0)
    add(
      `baseline-${trial.material}`,
      `${BARRIER_MATERIALS[trial.material].name} test barrier installed. Suitability for AN-001 exposure remains provisional.`,
      "provisional",
    );
  if (trial.phase === "ready" && trial.elapsed === 0 && trial.breaches > 0)
    add(
      `restored-${trial.nextOrder}`,
      `Enclosure restored after material delivery and engineering assembly. Primary panel: ${BARRIER_MATERIALS[trial.material].name}. Secondary lining renewed; previous failure observations remain on record.`,
      "observed",
    );
  if (
    ["running", "ready", "breached"].includes(trial.phase) &&
    trial.elapsed > 0 &&
    trial.integrity < 95
  ) {
    if (trial.protocol === "passive")
      add(
        `contact-${trial.material}`,
        `Barrier loss observed during passive contact with ${BARRIER_MATERIALS[trial.material].name.toLowerCase()}. Mechanism unresolved.`,
        "observed",
        `baseline-${trial.material}`,
      );
    else
      add(
        `stimulus-${trial.material}`,
        `Barrier loss observed under mechanical stimulation with ${BARRIER_MATERIALS[trial.material].name.toLowerCase()}. Impact and chemical contributions require separate trials.`,
        "observed",
        `baseline-${trial.material}`,
      );
  }
  if (trial.phase === "breached")
    add(
      `breach-${trial.material}-${trial.protocol}`,
      `Primary ${BARRIER_MATERIALS[trial.material].name.toLowerCase()} barrier failed during ${trial.protocol} exposure, opening the room wall. Secondary containment now requires inspection. Previous suitability assumption withdrawn.`,
      "observed",
      `baseline-${trial.material}`,
    );
  if (trial.phase === "ready" && trial.elapsed >= 24)
    add(
      `survived-${trial.material}-${trial.protocol}`,
      `${BARRIER_MATERIALS[trial.material].name} barrier retained the specimen for the completed ${trial.protocol} trial. This does not establish indefinite containment.`,
      "observed",
    );
  if (
    trial.phase === "running" &&
    trial.integrity <= 55 &&
    state.incident.level === "green"
  ) {
    state = {
      ...state,
      incident: {
        level: "yellow",
        summary:
          "AN-001 test barrier degradation observed; isolation available",
      },
    };
  }
  const incident =
    trial.phase === "breached" && state.incident.level !== "red"
      ? {
          level: "orange" as const,
          summary: "AN-001 primary wall failed; inspect secondary containment",
        }
      : state.incident.summary.startsWith("AN-001") && trial.phase === "ready"
        ? state.scp9620.phase === "feedback-incident"
          ? {
              level: "yellow" as const,
              summary: "SCP-9620 telemetry feedback outside validated limits",
            }
          : trial.integrity <= 55
            ? {
                level: "yellow" as const,
                summary: "AN-001 observed barrier damage requires replacement",
              }
            : {
                level: "green" as const,
                summary: "AN-001 enclosure restored and secured",
              }
        : state.incident;
  return {
    ...state,
    incident,
    containmentTrial: {
      ...trial,
      lastReading: {
        observedTick: state.tick,
        phase: trial.phase,
        material: trial.material,
        protocol: trial.protocol,
        integrity: trial.integrity,
        elapsed: trial.elapsed,
      },
      evidence: evidence.slice(-50),
    },
  };
}
