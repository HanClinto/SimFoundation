import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import { advanceSimulation } from "../src/simulation/tick";
import {
  authorizeSiteWork,
  placeLaboratory,
} from "../src/simulation/construction";
import { setClinicalCarePolicy } from "../src/simulation/clinical";
import { installCamera } from "../src/simulation/observations";
import { orderSurfaceWork } from "../src/simulation/environment";
import { loadGameState } from "../src/adapters/browser/game-persistence";

describe("integrated site operations", () => {
  it("operates a full day with research, care, construction, routines and containment while retaining valid saves", () => {
    let state = createInitialState(828);
    state = setClinicalCarePolicy(state, {
      reviewInterval: 480,
      moodReviewInterval: 480,
      psychiatricReviewInterval: 0,
      anomalousReviewInterval: 0,
      clinicianIds: [
        "person-priya-shah",
        "person-mara-voss",
        "person-caleb-ward",
      ],
    });
    state = placeLaboratory(state, { x: 59, y: 80 }).state;
    state = orderSurfaceWork(
      state,
      { x: 61, y: 54 },
      "structure",
      "steel",
    ).state;
    state = installCamera(state, { x: 56, y: 55 }).state;
    for (let minute = 0; minute < 1440; minute += 1) {
      for (const job of state.jobs) {
        if (job.status === "proposed") state = authorizeSiteWork(state, job.id);
      }
      state = advanceSimulation(state);
      const occupied = new Set<string>();
      for (const job of state.jobs.filter(
        ({ status }) => status === "in-progress",
      )) {
        for (const id of [
          job.assignedPersonId,
          job.assessment?.patientId,
        ].filter((id): id is string => Boolean(id))) {
          expect(occupied.has(id)).toBe(false);
          expect(state.routines.activities[id]).toBeUndefined();
          occupied.add(id);
        }
      }
      const stations = Object.values(state.routines.activities).map(
        ({ stationId }) => stationId,
      );
      expect(new Set(stations).size).toBe(stations.length);
      const carried =
        state.routines.supplyOrder?.phase === "delivery"
          ? state.routines.supplyOrder.quantity
          : 0;
      expect(
        state.routines.pantryMeals +
          state.routines.reserveMeals +
          state.routines.mealsConsumed +
          carried,
      ).toBe(108);
      if (minute % 120 === 0) {
        const loaded = loadGameState({
          getItem: () => JSON.stringify(state),
          setItem: () => {},
        });
        expect(loaded.status).toBe("loaded");
        if (loaded.status !== "loaded")
          throw new Error(`Invalid integrated save at minute ${minute}`);
        expect(advanceSimulation(loaded.state)).toEqual(
          advanceSimulation(state),
        );
      }
    }
    expect(state.construction.blueprints[0]?.status).toBe("completed");
    expect(state.environment.orders[0]?.phase).toBe("completed");
    expect(
      state.personnel.every(
        (person) =>
          person.physicalAssessments.length > 0 &&
          person.needs.satiety > 0 &&
          person.needs.rest > 0,
      ),
    ).toBe(true);
    expect(state.routines.mealsConsumed).toBeGreaterThan(6);
  }, 20000);
});
