import { describe, expect, it } from "vitest";
import {
  advanceConstruction,
  cancelLaboratory,
  LABORATORY_MATERIAL_COST,
  placeLaboratory,
  validateLaboratoryPlacement,
} from "../src/simulation/construction";
import { createInitialState } from "../src/simulation/state";
import { advanceSimulation } from "../src/simulation/tick";
import { isWalkable } from "../src/simulation/world";
import { createController } from "../src/application/controller";
import {
  loadGameState,
  saveGameState,
} from "../src/adapters/browser/game-persistence";

describe("laboratory annex construction", () => {
  it("continues the expansion, experiment, and recovery loop identically after reload", () => {
    const original = createController(createInitialState(828));
    original.placeLaboratory({ x: 59, y: 80 });
    original.advance(160);
    original.setResearchLaboratory("room-blueprint-lab-1");
    original.authorizeJob("job-calibrate-9620-sensors");
    const saved = original.advance(3).game;
    const loaded = loadGameState({
      getItem: () => JSON.stringify(saved),
      setItem: () => {},
    });
    if (loaded.status !== "loaded")
      throw new Error("integration save rejected");
    const restored = createController(loaded.state);
    for (const jobId of [
      "job-calibrate-9620-sensors",
      "job-record-9620-baseline",
      "job-run-9620-activation-trial",
      "job-stabilize-9620-feedback",
    ]) {
      original.authorizeJob(jobId);
      restored.authorizeJob(jobId);
      for (
        let tick = 0;
        tick < 160 &&
        original.getSnapshot().game.jobs.find(({ id }) => id === jobId)
          ?.status !== "completed";
        tick += 1
      ) {
        expect(restored.advance().game).toEqual(original.advance().game);
      }
      expect(
        original.getSnapshot().game.jobs.find(({ id }) => id === jobId)?.status,
      ).toBe("completed");
      if (jobId === "job-run-9620-activation-trial")
        expect(original.getSnapshot().game.incident.level).toBe("yellow");
    }
    const recovered = restored.getSnapshot().game;
    expect(recovered.incident.level).toBe("green");
    expect(recovered.scp9620.phase).toBe("stabilized");
    expect(recovered.construction.availableMaterials).toBe(120);
    expect(recovered.world.map.rooms).toHaveLength(9);
  });

  it("uses a commissioned annex for new research without moving active work", () => {
    const controller = createController(
      placeLaboratory(createInitialState(), { x: 59, y: 80 }).state,
    );
    expect(controller.setResearchLaboratory("room-blueprint-lab-1").code).toBe(
      "not-commissioned",
    );
    controller.advance(160);
    expect(controller.setResearchLaboratory("room-blueprint-lab-1").code).toBe(
      "laboratory-selected",
    );
    const authorized = controller.authorizeJob("job-calibrate-9620-sensors");
    expect(authorized.game.jobs[0]?.workSite).toEqual({ x: 63, y: 83 });
    controller.advance();
    controller.setResearchLaboratory("room-laboratory");
    expect(controller.getSnapshot().game.jobs[0]?.workSite).toEqual({
      x: 63,
      y: 83,
    });
    controller.advance(20);
    const baseline = controller
      .authorizeJob("job-record-9620-baseline")
      .game.jobs.find(({ id }) => id === "job-record-9620-baseline");
    expect(baseline?.workSite).toEqual({ x: 57, y: 55 });
    const state = controller.getSnapshot().game;
    expect(
      loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} })
        .status,
    ).toBe("loaded");
  });

  it("rejects corrupt material ledgers, phases, destinations, and job ownership", () => {
    let state = placeLaboratory(createInitialState(), { x: 59, y: 80 }).state;
    while (state.construction.blueprints[0]?.status === "reserved")
      state = advanceSimulation(state);
    const broken = [
      {
        ...state,
        construction: {
          ...state.construction,
          researchLaboratoryId: "room-blueprint-lab-1",
        },
      },
      {
        ...state,
        construction: { ...state.construction, availableMaterials: 160 },
      },
      {
        ...state,
        construction: { ...state.construction, nextBlueprintNumber: 10 },
      },
      {
        ...state,
        construction: {
          ...state.construction,
          blueprints: state.construction.blueprints.map((blueprint) => ({
            ...blueprint,
            status: "completed",
          })),
        },
      },
      {
        ...state,
        jobs: state.jobs.filter(({ id }) => id !== "job-haul-lab-1"),
      },
      {
        ...state,
        jobs: state.jobs.map((job) =>
          job.id === "job-haul-lab-1"
            ? { ...job, workSite: { x: 1, y: 1 } }
            : job,
        ),
      },
      {
        ...state,
        jobs: state.jobs.map((job) =>
          job.id === "job-haul-lab-1"
            ? { ...job, requiredWorkerId: "person-mara-voss" }
            : job,
        ),
      },
    ];
    for (const value of broken)
      expect(
        loadGameState({
          getItem: () => JSON.stringify(value),
          setItem: () => {},
        }).status,
      ).toBe("invalid");
  });

  it("constructs multiple annexes without double booking workers or overspending", () => {
    let state = createInitialState();
    for (const x of [40, 52, 64, 76]) {
      const result = placeLaboratory(state, { x, y: 82 });
      expect(result.code).toBe("placed");
      state = result.state;
    }
    expect(state.construction.availableMaterials).toBe(0);
    for (let tick = 0; tick < 450; tick += 1) {
      state = advanceSimulation(state);
      const workers = state.jobs
        .filter(({ status }) => status === "in-progress")
        .map(({ assignedPersonId }) => assignedPersonId);
      expect(new Set(workers).size).toBe(workers.length);
      if (
        state.construction.blueprints.every(({ commissionJobId }) =>
          state.jobs.some(
            (job) => job.id === commissionJobId && job.status === "completed",
          ),
        )
      )
        break;
    }
    expect(state.world.map.rooms).toHaveLength(12);
    expect(
      state.jobs.filter(
        ({ id, status }) =>
          id.startsWith("job-commission") && status === "completed",
      ),
    ).toHaveLength(4);
    expect(state.construction.availableMaterials).toBe(0);
  });

  it("waits for an occupied wall footprint to clear before final assembly", () => {
    let state = placeLaboratory(createInitialState(), { x: 59, y: 80 }).state;
    while (state.construction.blueprints[0]?.status !== "building")
      state = advanceSimulation(state);
    state = {
      ...state,
      jobs: state.jobs.map((job) =>
        job.id === "job-build-lab-1"
          ? {
              ...job,
              status: "completed",
              progress: job.requiredProgress,
              completedTick: state.tick,
            }
          : job,
      ),
      world: {
        ...state.world,
        positions: {
          ...state.world.positions,
          "person-emil-novak": { x: 59, y: 80 },
        },
      },
    };
    const blocked = advanceConstruction(state);
    expect(blocked.construction.blueprints[0]).toMatchObject({
      status: "building",
      blockedReason: "Final assembly awaits clearance of the wall footprint.",
    });
    expect(isWalkable(blocked.world.map, { x: 59, y: 80 })).toBe(true);
    const clear = advanceConstruction({
      ...blocked,
      world: {
        ...blocked.world,
        positions: {
          ...blocked.world.positions,
          "person-emil-novak": { x: 59, y: 79 },
        },
      },
    });
    expect(clear.construction.blueprints[0]?.status).toBe("completed");
    expect(isWalkable(clear.world.map, { x: 59, y: 80 })).toBe(false);
  });

  it("preserves all construction phases and material ownership through save/load", () => {
    let state = placeLaboratory(createInitialState(), { x: 59, y: 80 }).state;
    for (let tick = 0; tick < 160; tick += 1) {
      let serialized = "";
      const storage = {
        getItem: () => serialized,
        setItem: (_key: string, value: string) => {
          serialized = value;
        },
      };
      saveGameState(storage, state);
      const loaded = loadGameState(storage);
      expect(loaded.status).toBe("loaded");
      if (loaded.status !== "loaded")
        throw new Error("construction save rejected");
      const next = advanceSimulation(state);
      expect(advanceSimulation(loaded.state)).toEqual(next);
      state = next;
    }
  });

  it("accepts blueprints while paused and rejects invalid commands without mutation", () => {
    const controller = createController(createInitialState());
    controller.setRunning(false);
    expect(controller.placeLaboratory({ x: 59, y: 80 }).code).toBe("placed");
    const before = controller.getSnapshot();
    expect(controller.placeLaboratory({ x: 59, y: 80 }).code).toBe("overlap");
    expect(controller.getSnapshot()).toEqual(before);
    expect(controller.advance()).toEqual(before);
  });

  it("reserves materials exactly once and rejects overlap or invalid placement", () => {
    const initial = createInitialState();
    const placed = placeLaboratory(initial, { x: 59, y: 80 });
    expect(placed.code).toBe("placed");
    expect(placed.state.construction.availableMaterials).toBe(
      160 - LABORATORY_MATERIAL_COST,
    );
    expect(placeLaboratory(placed.state, { x: 59, y: 80 }).code).toBe(
      "overlap",
    );
    expect(validateLaboratoryPlacement(initial, { x: 50, y: 50 })).toBe(
      "overlap",
    );
    expect(validateLaboratoryPlacement(initial, { x: 125, y: 80 })).toBe(
      "out-of-bounds",
    );
    expect(validateLaboratoryPlacement(initial, { x: Number.NaN, y: 80 })).toBe(
      "out-of-bounds",
    );
    expect(
      placeLaboratory(
        {
          ...initial,
          construction: { ...initial.construction, availableMaterials: 39 },
        },
        { x: 59, y: 80 },
      ).code,
    ).toBe("insufficient-materials");
    expect(initial.construction.availableMaterials).toBe(160);
  });

  it("cancels a reserved order and refunds once without leaving a reserved worker", () => {
    const placed = placeLaboratory(createInitialState(), {
      x: 59,
      y: 80,
    }).state;
    const travelling = advanceSimulation(placed);
    const cancelled = cancelLaboratory(travelling, "blueprint-lab-1");
    expect(cancelled.code).toBe("cancelled");
    expect(cancelled.state.construction.availableMaterials).toBe(160);
    expect(cancelled.state.jobs.some(({ id }) => id === "job-haul-lab-1")).toBe(
      false,
    );
    expect(
      cancelled.state.personnel.some(
        ({ currentJobId }) => currentJobId === "job-haul-lab-1",
      ),
    ).toBe(false);
    expect(cancelLaboratory(cancelled.state, "blueprint-lab-1").code).toBe(
      "already-started",
    );
  });

  it("collects, delivers, constructs, and commissions through physical work", () => {
    let state = placeLaboratory(createInitialState(), { x: 59, y: 80 }).state;
    const statuses = new Set<string>();
    let carrierId: string | null = null;
    for (let tick = 0; tick < 220; tick += 1) {
      state = advanceSimulation(state);
      const blueprint = state.construction.blueprints[0]!;
      statuses.add(blueprint.status);
      const haul = state.jobs.find(({ id }) => id === blueprint.haulJobId)!;
      if (blueprint.status === "hauling") {
        carrierId ??= haul.assignedPersonId;
        expect(haul.assignedPersonId).toBe(carrierId);
        expect(cancelLaboratory(state, blueprint.id).code).toBe(
          "already-started",
        );
      }
      if (
        state.jobs.find(({ id }) => id === blueprint.commissionJobId)
          ?.status === "completed"
      )
        break;
    }
    expect([...statuses]).toEqual([
      "reserved",
      "hauling",
      "building",
      "completed",
    ]);
    expect(state.construction.availableMaterials).toBe(120);
    expect(state.world.map.rooms).toContainEqual(
      expect.objectContaining({
        id: "room-blueprint-lab-1",
        kind: "laboratory",
      }),
    );
    expect(
      state.jobs.find(({ id }) => id === "job-commission-lab-1")?.status,
    ).toBe("completed");
    expect(state.world.positions["person-mara-voss"]).toEqual({ x: 63, y: 83 });
    for (const position of Object.values(state.world.positions))
      expect(isWalkable(state.world.map, position)).toBe(true);
  });
});
