import { describe, expect, it } from "vitest";
import { createInitialState, type GameState } from "../src/simulation/state";
import { createController } from "../src/application/controller";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { canObserve } from "../src/simulation/observations";
import {
  advanceContainmentTrial,
  observeContainmentTrial,
  discoverTrialMaintenance,
  setTrialMaintenance,
  orderTrialBarrier,
  TRIAL_BARRIER_LOCATION,
  TRIAL_SECONDARY_LOCATION,
} from "../src/simulation/containment-trial";
import { isWalkable } from "../src/simulation/world";

function failPrimary(): GameState {
  const initial = createInitialState();
  return advanceContainmentTrial({
    ...initial,
    containmentTrial: {
      ...initial.containmentTrial,
      phase: "running",
      integrity: 1,
      autoIsolate: false,
    },
  });
}

describe("physical enclosure maintenance", () => {
  it("rejects corrupted hatch conditions, readings, stages, and physical geometry", () => {
    const state = createInitialState();
    for (const patch of [
      { secondaryIntegrity: -1 },
      { supplyStage: "teleport" },
      { automaticRepairs: "yes" },
      {
        barrierReadings: {
          primary: { material: "concrete", integrity: 100, observedTick: 10 },
          secondary: null,
        },
      },
    ]) {
      expect(
        loadGameState({
          getItem: () =>
            JSON.stringify({
              ...state,
              containmentTrial: { ...state.containmentTrial, ...patch },
            }),
          setItem: () => {},
        }).status,
      ).toBe("invalid");
    }
    const tiles = [...state.world.map.tiles];
    tiles[63 * 128 + 70] = "floor";
    expect(
      loadGameState({
        getItem: () =>
          JSON.stringify({
            ...state,
            world: { ...state.world, map: { ...state.world.map, tiles } },
          }),
        setItem: () => {},
      }).status,
    ).toBe("invalid");
  });
  it("recovers from failure of both barriers and survives a better-matched repeat trial", () => {
    let failed = failPrimary();
    for (let tick = 0; tick < 286; tick += 1)
      failed = advanceContainmentTrial(failed);
    const controller = createController(failed);
    expect(controller.orderTrialBarrier("ceramic").code).toBe("accepted");
    for (
      let tick = 0;
      tick < 220 &&
      controller.getSnapshot().game.containmentTrial.phase !== "ready";
      tick += 1
    )
      controller.advance();
    const restored = controller.getSnapshot().game;
    expect(restored.containmentTrial).toMatchObject({
      phase: "ready",
      material: "ceramic",
      integrity: 100,
      secondaryIntegrity: 100,
    });
    expect(isWalkable(restored.world.map, TRIAL_SECONDARY_LOCATION)).toBe(
      false,
    );
    expect(
      restored.containmentTrial.evidence.some((entry) =>
        entry.id.startsWith("secondary-failed"),
      ),
    ).toBe(true);
    expect(
      restored.containmentTrial.evidence.some((entry) =>
        entry.id.startsWith("restored-"),
      ),
    ).toBe(true);
    expect(controller.authorizeContainmentTrial("passive", false).code).toBe(
      "accepted",
    );
    for (
      let tick = 0;
      tick < 120 &&
      controller.getSnapshot().game.containmentTrial.trialsCompleted < 2;
      tick += 1
    )
      controller.advance();
    expect(controller.getSnapshot().game.containmentTrial).toMatchObject({
      phase: "ready",
      breaches: 1,
      trialsCompleted: 2,
    });
    expect(
      controller.getSnapshot().game.containmentTrial.integrity,
    ).toBeGreaterThan(95);
  });
  it("opens sight as well as traversal and keeps unseen damage out of maintenance", () => {
    const initial = createInitialState();
    const origin = { x: 70, y: 60 };
    const target = { x: 70, y: 62 };
    expect(canObserve(initial.world.map, origin, target, 6)).toBe(false);
    const failed = setTrialMaintenance(failPrimary(), true, "composite");
    expect(canObserve(failed.world.map, origin, target, 6)).toBe(true);
    const hidden = observeContainmentTrial({
      ...failed,
      observations: { ...failed.observations, visibleTiles: [] },
    });
    expect(
      discoverTrialMaintenance(hidden).containmentTrial.workOrderId,
    ).toBeNull();
    const observed = observeContainmentTrial(failed);
    const queued = discoverTrialMaintenance(observed);
    expect(queued.containmentTrial).toMatchObject({
      phase: "repairing",
      supplyStage: "collecting",
      supplyCredits: 18,
    });
    expect(queued.jobs.at(-1)).toMatchObject({
      skillId: "logistics",
      priority: 95,
      workSite: failed.construction.stockpile,
    });
    expect(discoverTrialMaintenance(queued).jobs).toHaveLength(
      queued.jobs.length,
    );
  });

  it("gives secondary containment finite response time and exposes failure only when observed", () => {
    let state = failPrimary();
    expect(state.containmentTrial.secondaryIntegrity).toBe(100);
    for (let tick = 0; tick < 100; tick += 1)
      state = advanceContainmentTrial(state);
    expect(state.containmentTrial.secondaryIntegrity).toBe(65);
    expect(isWalkable(state.world.map, TRIAL_SECONDARY_LOCATION)).toBe(false);
    expect(
      canObserve(state.world.map, { x: 70, y: 62 }, { x: 70, y: 64 }, 6),
    ).toBe(false);
    for (let tick = 0; tick < 186; tick += 1)
      state = advanceContainmentTrial(state);
    expect(state.containmentTrial.secondaryIntegrity).toBe(0);
    expect(isWalkable(state.world.map, TRIAL_SECONDARY_LOCATION)).toBe(true);
    expect(
      canObserve(state.world.map, { x: 70, y: 62 }, { x: 70, y: 64 }, 6),
    ).toBe(true);
    const hidden = observeContainmentTrial({
      ...state,
      observations: { ...state.observations, visibleTiles: [] },
    });
    expect(hidden.incident.level).not.toBe("red");
    const visible = observeContainmentTrial({
      ...state,
      observations: { ...state.observations, visibleTiles: [63 * 128 + 70] },
    });
    expect(visible.incident.level).toBe("red");
  });

  it("physically collects, delivers with the same carrier, and rebuilds without restarting", () => {
    const controller = createController(
      discoverTrialMaintenance(
        observeContainmentTrial(
          setTrialMaintenance(failPrimary(), true, "composite"),
        ),
      ),
    );
    const stages = new Set<string>();
    let carrier: string | null = null;
    for (let tick = 0; tick < 220; tick += 1) {
      const state = controller.advance().game;
      const trial = state.containmentTrial;
      if (trial.supplyStage) stages.add(trial.supplyStage);
      const job = state.jobs.find((job) => job.id === trial.workOrderId);
      if (trial.supplyStage === "delivering") {
        expect(job?.requiredWorkerId).toBeTruthy();
        carrier ??= job!.requiredWorkerId;
        expect(job?.requiredWorkerId).toBe(carrier);
        if (job?.assignedPersonId) expect(job.assignedPersonId).toBe(carrier);
      }
      expect(
        loadGameState({
          getItem: () => JSON.stringify(state),
          setItem: () => {},
        }).status,
      ).toBe("loaded");
      if (trial.phase === "ready") break;
    }
    expect(stages).toEqual(new Set(["collecting", "delivering", "fitting"]));
    const repaired = controller.getSnapshot().game;
    expect(repaired.containmentTrial).toMatchObject({
      phase: "ready",
      integrity: 100,
      secondaryIntegrity: 100,
      material: "composite",
      spentCredits: 6,
      supplyCredits: 18,
    });
    expect(isWalkable(repaired.world.map, TRIAL_BARRIER_LOCATION)).toBe(false);
    expect(repaired.incident.level).toBe("green");
  });

  it("leaves an occupied footprint open and reports finite-stock exhaustion", () => {
    let state = orderTrialBarrier(failPrimary(), "composite").state;
    for (let stage = 0; stage < 2; stage += 1)
      state = advanceContainmentTrial({
        ...state,
        jobs: state.jobs.map((job) =>
          job.id === state.containmentTrial.workOrderId
            ? { ...job, status: "completed" }
            : job,
        ),
      });
    const completed = {
      ...state,
      jobs: state.jobs.map((job) =>
        job.id === state.containmentTrial.workOrderId
          ? {
              ...job,
              status: "completed" as const,
              progress: job.requiredProgress,
              completedTick: state.tick,
            }
          : job,
      ),
    };
    const blocked = advanceContainmentTrial({
      ...completed,
      world: {
        ...completed.world,
        positions: {
          ...completed.world.positions,
          "person-caleb-ward": TRIAL_BARRIER_LOCATION,
        },
      },
    });
    expect(blocked.containmentTrial.maintenanceReason).toContain("clearance");
    expect(isWalkable(blocked.world.map, TRIAL_BARRIER_LOCATION)).toBe(true);
    expect(advanceContainmentTrial(completed).containmentTrial.phase).toBe(
      "ready",
    );
    const failed = setTrialMaintenance(failPrimary(), true, "composite");
    const empty = discoverTrialMaintenance(
      observeContainmentTrial({
        ...failed,
        containmentTrial: {
          ...failed.containmentTrial,
          supplyCredits: 0,
          spentCredits: 24,
        },
      }),
    );
    expect(empty.containmentTrial.workOrderId).toBeNull();
    expect(empty.containmentTrial.maintenanceReason).toContain("insufficient");
  });
});
