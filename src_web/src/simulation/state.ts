import { createStartingJobs, type SiteJob } from "./jobs";
import { createStartingPersonnel, type PersonnelRecord } from "./personnel";
import { createScp999State, type Scp999State } from "./scp-999";
import { createScp9620State, type Scp9620State } from "./scp-9620";
import { createStartingWorld, type SiteWorld } from "./world";
import {
  createConstructionState,
  type ConstructionState,
} from "./construction";

export const GAME_STATE_VERSION = 16;

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
  readonly scp9620: Scp9620State;
  readonly world: SiteWorld;
  readonly construction: ConstructionState;
}

export function createInitialState(seed = 9620): GameState {
  const personnel = createStartingPersonnel();
  return {
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
    jobs: createStartingJobs(),
    personnel,
    scp999: createScp999State(),
    scp9620: createScp9620State(),
    world: createStartingWorld(personnel.map(({ id }) => id)),
    construction: createConstructionState(),
  };
}
