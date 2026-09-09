import { authorizeJob } from "./jobs";
import type { GameState } from "./state";
import type { TilePosition } from "./world";

export interface MaterialStock {
  readonly availableMaterials: number;
  readonly stockpile: TilePosition;
}

export function createMaterialStock(): MaterialStock {
  return { availableMaterials: 160, stockpile: { x: 67, y: 68 } };
}

export function authorizeSiteWork(state: GameState, jobId: string): GameState {
  const job = state.jobs.find(({ id }) => id === jobId);
  if (!job) throw new Error(`Unknown job: ${jobId}`);
  if (job.status !== "proposed") return state;
  const objectOrder = state.objectOrders.find((order) => order.jobId === jobId);
  if (
    objectOrder &&
    Object.values(state.routines.activities).some(
      (activity) => activity.stationId === objectOrder.objectId,
    )
  )
    return state;
  return {
    ...state,
    jobs: state.jobs.map((entry) =>
      entry.id === job.id ? authorizeJob(entry, state.tick) : entry,
    ),
  };
}
