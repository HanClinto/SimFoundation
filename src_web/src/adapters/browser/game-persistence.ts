import {
  GAME_STATE_VERSION,
  type GameState,
} from "../../simulation_legacy/state";

export const GAME_STATE_STORAGE_KEY = "scp-site-manager.game-state.v1";

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type GameLoadResult =
  | { readonly status: "loaded"; readonly state: GameState }
  | {
      readonly status: "empty" | "invalid" | "incompatible" | "unavailable";
      readonly state: null;
    };

export function loadGameState(storage: StoragePort): GameLoadResult {
  let serialized: string | null;
  try {
    serialized = storage.getItem(GAME_STATE_STORAGE_KEY);
  } catch {
    return { status: "unavailable", state: null };
  }
  if (serialized === null) return { status: "empty", state: null };

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return { status: "invalid", state: null };
    if (!("version" in parsed) || parsed.version !== GAME_STATE_VERSION)
      return { status: "incompatible", state: null };
    return { status: "loaded", state: parsed as GameState };
  } catch {
    return { status: "invalid", state: null };
  }
}

export function saveGameState(storage: StoragePort, state: GameState): boolean {
  try {
    storage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
