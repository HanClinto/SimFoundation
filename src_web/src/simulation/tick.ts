import { advanceJobs } from "./jobs";
import { advancePersonnel } from "./personnel";
import type { GameState } from "./state";

export function advanceSimulation(state: GameState): GameState {
  const tick = state.tick + 1;
  const jobResult = advanceJobs(
    state.jobs,
    state.personnel.map(advancePersonnel),
    tick,
  );
  return {
    ...state,
    tick,
    gameMinute: state.gameMinute + 1,
    jobs: jobResult.jobs,
    personnel: jobResult.personnel,
  };
}
