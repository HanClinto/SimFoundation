import { createInitialState as createSimulationState } from "../../src/simulation/state";
import type { SiteJob } from "../../src/simulation/jobs";
export { GAME_STATE_VERSION, type GameState } from "../../src/simulation/state";

export function createTestJobs(): readonly SiteJob[] {
  return [
    {
      id: "job-test-survey",
      title: "Survey site",
      description: "Test work fixture",
      workSite: { x: 57, y: 55 },
      skillId: "research",
      priority: 50,
      xpPerTick: 1,
      preferredBiases: { mindMight: -1, receptiveResolute: -1 },
      status: "proposed",
      progress: 0,
      requiredProgress: 64,
      assignedPersonId: null,
      requiredWorkerId: null,
      assignmentReason: null,
      authorizedTick: null,
      completedTick: null,
    },
  ];
}
export function createInitialState(seed?: number) {
  return { ...createSimulationState(seed), jobs: createTestJobs() };
}
