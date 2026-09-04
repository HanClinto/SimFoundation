import type { GameState } from "./state";

export function advanceSimulation(state: GameState): GameState {
  return {
    ...state,
    tick: state.tick + 1,
    gameMinute: state.gameMinute + 1,
  };
}
