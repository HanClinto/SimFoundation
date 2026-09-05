import type { GameState } from "./state";
import type { SiteJob } from "./jobs";
import type { TilePosition } from "./world";

export const TRIAL_LOCATION: TilePosition = { x: 70, y: 58 };
export const TRIAL_WORK_SITE: TilePosition = { x: 69, y: 58 };
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
  };
}

function workOrder(
  state: GameState,
  title: string,
  skillId: SiteJob["skillId"],
  work: number,
  phase: TrialPhase,
): GameState {
  const id = `job-trial-${state.containmentTrial.nextOrder}`;
  const job: SiteJob = {
    id,
    title,
    description:
      "AN-001 bench-scale containment study. Secondary catch vessel required.",
    skillId,
    priority: phase === "repairing" ? 85 : 45,
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
    workSite: TRIAL_WORK_SITE,
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
      supplyCredits: state.containmentTrial.supplyCredits - definition.cost,
      spentCredits: state.containmentTrial.spentCredits + definition.cost,
    },
  };
  return {
    code: "accepted",
    state: workOrder(
      next,
      `Fit ${definition.name.toLowerCase()} test barrier`,
      "engineering",
      42,
      state.containmentTrial.phase === "breached" ? "repairing" : "installing",
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
  if (
    trial.workOrderId &&
    state.jobs.some(
      (job) => job.id === trial.workOrderId && job.status === "completed",
    )
  ) {
    trial =
      trial.phase === "preparing"
        ? { ...trial, phase: "running", elapsed: 0, workOrderId: null }
        : {
            ...trial,
            phase: "ready",
            material: trial.pendingMaterial ?? trial.material,
            pendingMaterial: null,
            integrity: 100,
            elapsed: 0,
            workOrderId: null,
          };
    return { ...state, containmentTrial: trial };
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
  return {
    ...state,
    containmentTrial: {
      ...trial,
      integrity,
      elapsed,
      phase: breached ? "breached" : finished ? "ready" : "running",
      breaches: trial.breaches + Number(breached),
      trialsCompleted: trial.trialsCompleted + Number(breached || finished),
    },
  };
}

export function observeContainmentTrial(state: GameState): GameState {
  const trial = state.containmentTrial;
  if (
    trial.phase === "unprepared" ||
    !state.observations.visibleTiles.includes(
      TRIAL_LOCATION.y * state.world.map.width + TRIAL_LOCATION.x,
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
      `Primary ${BARRIER_MATERIALS[trial.material].name.toLowerCase()} barrier failed during ${trial.protocol} exposure. Secondary catch vessel retained the specimen. Previous suitability assumption withdrawn.`,
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
          summary:
            "AN-001 primary test barrier failed; secondary vessel holding",
        }
      : state.incident.summary.startsWith("AN-001") && trial.phase === "ready"
        ? state.scp9620.phase === "feedback-incident"
          ? {
              level: "yellow" as const,
              summary: "SCP-9620 telemetry feedback outside validated limits",
            }
          : { level: "green" as const, summary: "AN-001 test vessel secured" }
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
