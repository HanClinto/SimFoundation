import type { SiteJob } from "./jobs";
import { createStartingPersonnel, type PersonnelRecord } from "./personnel";
import { createScp999State, type Scp999State } from "./scp-999";
import { createStartingWorld, type SiteWorld } from "./world";
import {
  createConstructionState,
  type ConstructionState,
} from "./construction";
import type { ClinicalCarePolicy } from "./clinical";
import { createRoutineState, type RoutineState } from "./routines";
import {
  createSiteObservations,
  observeSite,
  type SiteObservations,
} from "./observations";
import { createEnvironment, type EnvironmentState } from "./environment";
import { createObjectStore, objectBlocks, type ObjectStore } from "./objects";
import { type ObjectOrder } from "./object-work";
import { createStorage, type StorageState } from "./storage";
import type { VesselWork } from "./vessel-work";

export const GAME_STATE_VERSION = 33;

export type IncidentLevel = "green" | "yellow" | "orange" | "red";

export interface IncidentState {
  readonly level: IncidentLevel;
  readonly summary: string;
}

export interface GameState {
  readonly version: typeof GAME_STATE_VERSION;
  readonly seed: number;
  readonly tick: number;
  readonly gameMinute: number;
  readonly siteName: string;
  readonly incident: IncidentState;
  readonly capabilities: {
    readonly anomalousPsychometrics: boolean;
  };
  readonly jobs: readonly SiteJob[];
  readonly personnel: readonly PersonnelRecord[];
  readonly scp999: Scp999State;
  readonly world: SiteWorld;
  readonly construction: ConstructionState;
  readonly clinicalCare: ClinicalCarePolicy;
  readonly routines: RoutineState;
  readonly observations: SiteObservations;
  readonly environment: EnvironmentState;
  readonly objects: ObjectStore;
  readonly objectOrders: readonly ObjectOrder[];
  readonly storage: StorageState;
  readonly vesselWork: VesselWork;
}

export function createInitialState(seed = 9620): GameState {
  const personnel = createStartingPersonnel();
  const world = createStartingWorld(personnel.map(({ id }) => id));
  const routines = createRoutineState(personnel);
  const objects = createObjectStore(routines.stations);
  const furnishedWorld = {
    ...world,
    map: { ...world.map, objectBlocks: objectBlocks(objects, world.map.width) },
  };
  return observeSite({
    version: GAME_STATE_VERSION,
    seed,
    tick: 0,
    gameMinute: 8 * 60,
    siteName: "Site 828",
    incident: {
      level: "green",
      summary: "Routine operations",
    },
    capabilities: {
      anomalousPsychometrics: false,
    },
    jobs: [],
    personnel,
    scp999: createScp999State(),
    world: furnishedWorld,
    construction: createConstructionState(),
    clinicalCare: {
      reviewInterval: 0,
      moodReviewInterval: 0,
      psychiatricReviewInterval: 0,
      anomalousReviewInterval: 0,
      clinicianIds: ["person-priya-shah"],
    },
    routines,
    objects,
    objectOrders: [],
    vesselWork: { nextId: 1, orders: [] },
    storage: createStorage(),
    observations: createSiteObservations(world),
    environment: createEnvironment(),
  });
}
