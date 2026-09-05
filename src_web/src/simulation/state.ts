import { createStartingJobs, type SiteJob } from "./jobs";
import { createStartingPersonnel, type PersonnelRecord } from "./personnel";
import { createScp999State, type Scp999State } from "./scp-999";

export const GAME_STATE_VERSION = 11;

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
}

export function createInitialState(seed = 9620): GameState {
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
    personnel: createStartingPersonnel(),
    scp999: createScp999State(),
  };
}
