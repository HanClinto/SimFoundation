import { observeSite } from "./observations";
import { discoverStorageWork, refreshMealSummary } from "./storage";
import { advanceObjectWork } from "./object-work";
import {
  advanceExposure,
  advanceSurfaceWork,
  discoverSurfaceWork,
  observeStructuralDamage,
} from "./environment";
import { advanceJobs } from "./jobs";
import { advancePersonnel } from "./personnel";
import { advanceScp999 } from "./scp-999";
import { advanceConstruction } from "./construction";
import type { GameState } from "./state";
import { discoverClinicalWork } from "./clinical";
import { advanceRoutines, routineUnavailableIds } from "./routines";

export function advanceSimulation(state: GameState): GameState {
  const tick = state.tick + 1;
  state = advanceRoutines(
    refreshMealSummary(
      discoverClinicalWork({
        ...state,
        tick,
        gameMinute: state.gameMinute + 1,
        personnel: state.personnel.map((person) =>
          advancePersonnel(person, tick),
        ),
      }),
    ),
  );
  const jobResult = advanceJobs(
    state.jobs,
    state.personnel,
    tick,
    state.world,
    state.clinicalCare.clinicianIds,
    routineUnavailableIds(state),
    Object.fromEntries(
      state.objects.items.flatMap((item) =>
        item.location.kind === "carried" && item.reservedBy
          ? [[item.location.personId, item.reservedBy]]
          : [],
      ),
    ),
  );
  const scp999Result = advanceScp999(
    state.scp999,
    jobResult.personnel,
    tick,
    jobResult.world,
    Object.entries(state.routines.activities)
      .filter(([, activity]) => activity.kind !== "break")
      .map(([id]) => id),
  );
  return refreshMealSummary(
    discoverStorageWork(
      discoverSurfaceWork(
        observeStructuralDamage(
          observeSite(
            advanceExposure(
              advanceObjectWork(
                advanceSurfaceWork(
                  advanceConstruction({
                    ...state,
                    tick,
                    gameMinute: state.gameMinute,
                    jobs: jobResult.jobs,
                    personnel: scp999Result.personnel,
                    scp999: scp999Result.anomaly,
                    world: scp999Result.world,
                  }),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
