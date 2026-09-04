import { createStartingPersonnel, type PersonnelRecord } from "./personnel";

export const GAME_STATE_VERSION = 2;

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
  readonly personnel: readonly PersonnelRecord[];
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
    personnel: createStartingPersonnel(),
  };
}
