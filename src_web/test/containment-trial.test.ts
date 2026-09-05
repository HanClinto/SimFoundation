import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  advanceContainmentTrial,
  observeContainmentTrial,
  orderTrialBarrier,
  authorizeContainmentTrial,
  isolateContainmentTrial,
  BARRIER_MATERIALS,
  TRIAL_BARRIER_LOCATION,
  type BarrierMaterial,
  type TrialProtocol,
} from "../src/simulation/containment-trial";
import { advanceSimulation } from "../src/simulation/tick";
import { createController } from "../src/application/controller";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { findRoute, isWalkable } from "../src/simulation/world";

describe("authored material containment trial", () => {
  it("opens a real route on failure and closes it only after rebuilding", () => {
    const initial = createInitialState();
    expect(isWalkable(initial.world.map, TRIAL_BARRIER_LOCATION)).toBe(false);
    const failed = advanceContainmentTrial({
      ...initial,
      containmentTrial: {
        ...initial.containmentTrial,
        phase: "running",
        integrity: 1,
        autoIsolate: false,
      },
    });
    expect(isWalkable(failed.world.map, TRIAL_BARRIER_LOCATION)).toBe(true);
    expect(
      findRoute(failed.world.map, { x: 70, y: 60 }, { x: 70, y: 62 }),
    ).toEqual([TRIAL_BARRIER_LOCATION, { x: 70, y: 62 }]);
    const ordered = orderTrialBarrier(failed, "composite").state;
    expect(isWalkable(ordered.world.map, TRIAL_BARRIER_LOCATION)).toBe(true);
    let rebuilt = ordered;
    for (let stage = 0; stage < 3; stage += 1)
      rebuilt = advanceContainmentTrial({
        ...rebuilt,
        jobs: rebuilt.jobs.map((job) =>
          job.id === rebuilt.containmentTrial.workOrderId
            ? { ...job, status: "completed", progress: job.requiredProgress }
            : job,
        ),
      });
    expect(isWalkable(rebuilt.world.map, TRIAL_BARRIER_LOCATION)).toBe(false);
    expect(rebuilt.containmentTrial.material).toBe("composite");
  });
  it("does not attribute old damage to a replacement material before installation", () => {
    const initial = createInitialState();
    const failed = {
      ...initial,
      containmentTrial: {
        ...initial.containmentTrial,
        phase: "breached" as const,
        integrity: 0,
        elapsed: 18,
        breaches: 1,
        trialsCompleted: 1,
      },
    };
    const replacing = orderTrialBarrier(failed, "ceramic").state;
    expect(replacing.containmentTrial).toMatchObject({
      material: "concrete",
      pendingMaterial: "ceramic",
      phase: "repairing",
    });
    const observed = observeContainmentTrial(replacing);
    expect(
      observed.containmentTrial.evidence.some(({ id }) =>
        id.includes("ceramic"),
      ),
    ).toBe(false);
  });
  it("manual isolation arrests degradation without restoring the barrier or fabricating evidence", () => {
    const initial = createInitialState();
    const running = {
      ...initial,
      containmentTrial: {
        ...initial.containmentTrial,
        phase: "running" as const,
        integrity: 45,
        elapsed: 10,
      },
    };
    const isolated = isolateContainmentTrial(running);
    expect(advanceContainmentTrial(isolated).containmentTrial).toMatchObject({
      phase: "ready",
      integrity: 45,
      elapsed: 10,
      trialsCompleted: 1,
      evidence: [],
    });
    expect(observeContainmentTrial(running).incident.level).toBe("yellow");
  });
  it("rejects corrupted trial allowances and dangling work orders", () => {
    const initial = createInitialState();
    for (const patch of [
      { supplyCredits: 500 },
      { workOrderId: "missing", phase: "installing" },
      { material: "magic" },
      { lastReading: { integrity: 100 } },
    ]) {
      const value = {
        ...initial,
        containmentTrial: { ...initial.containmentTrial, ...patch },
      };
      expect(
        loadGameState({
          getItem: () => JSON.stringify(value),
          setItem: () => {},
        }).status,
      ).toBe("invalid");
    }
  });
  it("round-trips ongoing trials, learns from failure, and repairs using real work", () => {
    const controller = createController(createInitialState());
    controller.orderTrialBarrier("concrete");
    for (
      let tick = 0;
      tick < 120 &&
      controller.getSnapshot().game.containmentTrial.phase !== "ready";
      tick += 1
    )
      controller.advance();
    controller.authorizeContainmentTrial("passive", false);
    for (
      let tick = 0;
      tick < 100 &&
      controller.getSnapshot().game.containmentTrial.phase !== "breached";
      tick += 1
    ) {
      const state = controller.advance().game;
      const loaded = loadGameState({
        getItem: () => JSON.stringify(state),
        setItem: () => {},
      });
      expect(loaded.status).toBe("loaded");
      if (loaded.status !== "loaded") throw new Error("trial save rejected");
      expect(advanceSimulation(loaded.state)).toEqual(advanceSimulation(state));
    }
    expect(controller.getSnapshot().game.containmentTrial.breaches).toBe(1);
    expect(
      controller
        .getSnapshot()
        .game.containmentTrial.evidence.some(
          ({ id }) => id === "breach-concrete-passive",
        ),
    ).toBe(true);
    controller.orderTrialBarrier("ceramic");
    for (
      let tick = 0;
      tick < 120 &&
      controller.getSnapshot().game.containmentTrial.phase !== "ready";
      tick += 1
    )
      controller.advance();
    const repaired = controller.getSnapshot().game;
    expect(repaired.containmentTrial).toMatchObject({
      phase: "ready",
      integrity: 100,
      material: "ceramic",
      supplyCredits: 19,
      spentCredits: 5,
    });
    expect(repaired.incident.level).toBe("green");
  });
  it("requires physical installation and preparation before running", () => {
    const initial = createInitialState();
    expect(authorizeContainmentTrial(initial, "passive", true).code).toBe(
      "not-ready",
    );
    let state = orderTrialBarrier(initial, "ceramic").state;
    expect(state.containmentTrial.supplyCredits).toBe(21);
    expect(orderTrialBarrier(state, "concrete").code).toBe("busy");
    for (
      let tick = 0;
      tick < 120 && state.containmentTrial.phase !== "ready";
      tick += 1
    )
      state = advanceSimulation(state);
    expect(state.containmentTrial.phase).toBe("ready");
    state = authorizeContainmentTrial(state, "passive", true).state;
    expect(state.containmentTrial.phase).toBe("preparing");
    for (
      let tick = 0;
      tick < 120 && state.containmentTrial.trialsCompleted === 0;
      tick += 1
    )
      state = advanceSimulation(state);
    expect(state.containmentTrial.phase).toBe("ready");
    expect(state.containmentTrial.integrity).toBeGreaterThan(90);
  });
  it("supports alternative material and protocol choices rather than a universal cheap barrier", () => {
    const trial = (
      material: BarrierMaterial,
      protocol: TrialProtocol,
      autoIsolate: boolean,
    ) => {
      const initial = createInitialState();
      let state = {
        ...initial,
        containmentTrial: {
          ...initial.containmentTrial,
          phase: "running" as const,
          material,
          protocol,
          autoIsolate,
        },
      } as ReturnType<typeof createInitialState>;
      for (let tick = 0; tick < 24; tick += 1)
        state = advanceContainmentTrial(state);
      return state.containmentTrial;
    };
    expect(trial("concrete", "passive", false).phase).toBe("breached");
    expect(trial("ceramic", "passive", false).phase).toBe("ready");
    expect(trial("ceramic", "stimulated", false).phase).toBe("breached");
    expect(trial("composite", "stimulated", true).breaches).toBe(0);
    expect(trial("concrete", "passive", true).breaches).toBe(0);
    expect(BARRIER_MATERIALS.composite.cost).toBeGreaterThan(
      BARRIER_MATERIALS.ceramic.cost,
    );
  });
  it("records observed failures and supersedes assumptions without learning from unseen changes", () => {
    const initial = createInitialState();
    const failed = {
      ...initial,
      containmentTrial: {
        ...initial.containmentTrial,
        phase: "breached" as const,
        integrity: 0,
        elapsed: 18,
        breaches: 1,
      },
    };
    const hidden = observeContainmentTrial({
      ...failed,
      observations: { ...failed.observations, visibleTiles: [] },
    });
    expect(hidden.containmentTrial.evidence).toEqual([]);
    expect(hidden.containmentTrial.lastReading).toBeNull();
    const recorded = observeContainmentTrial(failed);
    expect(
      recorded.containmentTrial.evidence.some(
        (entry) =>
          entry.id === "breach-concrete-passive" &&
          entry.supersedes === "baseline-concrete",
      ),
    ).toBe(true);
    expect(recorded.incident.level).toBe("orange");
  });
});
