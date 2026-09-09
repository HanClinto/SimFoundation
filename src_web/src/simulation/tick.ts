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
import type { GameState, SimulationClock, SiteSimulationState } from "./state";
import { discoverClinicalWork } from "./clinical";
import { advanceRoutines, routineUnavailableIds } from "./routines";

export function advanceSimulation(state: GameState): GameState {
  state = trackActionTimes(advanceActionQueues(state));
  const clock: SimulationClock = {
    tick: state.tick + 1,
    gameMinute: state.gameMinute + 1,
  };
  const away = awayPersonnel(state);
  if (!away.length)
    return trackActionTimes(
      advanceActionQueues(
        advanceExpedition(advanceSiteSimulation(state, clock)),
      ),
    );
  const roster = state.personnel;
  const local = advanceSiteSimulation(
    {
      ...state,
      personnel: roster.filter((person) => !away.includes(person.id)),
    },
    clock,
  );
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

export function advanceSiteSimulation<State extends SiteSimulationState>(
  state: State,
  clock: SimulationClock,
  withdrawal: "distance" | "explicit" = "distance",
): State {
  const { tick } = clock;
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
  state = advanceCombat({ ...state, ...clock }, withdrawal);
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
  let personnel = jobResult.personnel;
  let world = jobResult.world;
  const unavailable = [
    ...state.personnel
      .filter((person) => tacticallyUnavailable(state, person.id))
      .map((person) => person.id),
    ...Object.entries(state.routines.activities)
      .filter(([, activity]) => activity.kind !== "break")
      .map(([id]) => id),
  ];
  const advanced = new Map(
    [...state.entities]
      .sort((first, second) => first.id.localeCompare(second.id))
      .map((entity) => {
        const result = advanceScp999(
          entity,
          personnel,
          tick,
          world,
          unavailable,
        );
        personnel = result.personnel;
        world = result.world;
        return [entity.id, result.anomaly] as const;
      }),
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
                      personnel,
                      entities: state.entities.map(
                        (entity) => advanced.get(entity.id)!,
                      ),
                      world,
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
