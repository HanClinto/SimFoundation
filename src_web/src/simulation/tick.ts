import { observeSite } from "./observations";
import { trackActionTimes, recordDoorOpening } from "./action-progress";
import { advanceActionQueues } from "./action-queue";
import { advanceExpedition, awayPersonnel } from "./expeditions";
import { advanceCombat, observeCombat, tacticallyUnavailable } from "./combat";
import { closeAutomaticDoors } from "./world";
import { objectFootprint } from "./objects";
import { discoverStorageWork, refreshMealSummary } from "./storage";
import { advanceObjectWork } from "./object-work";
import { advanceVesselWork } from "./vessel-work";
import { observeFacilityIncidents } from "./facility-incidents";
import {
  advanceExposure,
  advanceSurfaceWork,
  discoverSurfaceWork,
} from "./environment";
import { advanceJobs } from "./jobs";
import { advancePersonnel } from "./personnel";
import { advanceScp999 } from "./scp-999";
import type { GameState } from "./state";
import { discoverClinicalWork } from "./clinical";
import { advanceRoutines, routineUnavailableIds } from "./routines";

export function advanceSimulation(state: GameState): GameState {
  state = trackActionTimes(advanceActionQueues(state));
  const away = awayPersonnel(state);
  if (!away.length)
    return trackActionTimes(
      advanceActionQueues(advanceExpedition(advanceSiteSimulation(state))),
    );
  const roster = state.personnel;
  const local = advanceSiteSimulation({
    ...state,
    personnel: roster.filter((person) => !away.includes(person.id)),
  });
  return trackActionTimes(
    advanceActionQueues(
      advanceExpedition({
        ...local,
        personnel: roster.map(
          (person) =>
            local.personnel.find((other) => other.id === person.id) ?? person,
        ),
      }),
    ),
  );
}

function advanceSiteSimulation(state: GameState): GameState {
  const tick = state.tick + 1;
  state = {
    ...state,
    world: closeAutomaticDoors(state.world, [
      ...(state.combat.adversary ? [state.combat.adversary.position] : []),
      ...state.objects.items.flatMap((item) =>
        item.location.kind === "ground" &&
        !(item.kind === "cable" && item.installed)
          ? item.installed
            ? objectFootprint(item, item.location.position)
            : [item.location.position]
          : [],
      ),
    ]),
  };
  state = advanceCombat({ ...state, tick, gameMinute: state.gameMinute + 1 });
  state = advanceRoutines(
    refreshMealSummary(
      discoverClinicalWork({
        ...state,
        tick,
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
    (actorId, position, jobId) => {
      state = recordDoorOpening(
        state,
        actorId,
        position,
        `job:${jobId}:${actorId}`,
      );
    },
  );
  const scp999Result = advanceScp999(
    state.scp999,
    jobResult.personnel,
    tick,
    jobResult.world,
    [
      ...state.personnel
        .filter((person) => tacticallyUnavailable(state, person.id))
        .map((person) => person.id),
      ...Object.entries(state.routines.activities)
        .filter(([, activity]) => activity.kind !== "break")
        .map(([id]) => id),
    ],
  );
  return refreshMealSummary(
    discoverStorageWork(
      discoverSurfaceWork(
        observeFacilityIncidents(
          observeCombat(
            observeSite(
              advanceExposure(
                advanceVesselWork(
                  advanceObjectWork(
                    advanceSurfaceWork({
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
    ),
  );
}
