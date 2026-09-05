import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import { damageSurface, surfaceAt } from "../src/simulation/materials";
import {
  orderSurfaceWork,
  advanceExposure,
  exposureTiles,
  advanceSurfaceWork,
  discoverSurfaceWork,
  observeStructuralDamage,
} from "../src/simulation/environment";
import { advanceSimulation } from "../src/simulation/tick";
import { observeSite } from "../src/simulation/observations";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { createController } from "../src/application/controller";

describe("general surface work", () => {
  it("returns delivery assignment to the scheduler instead of stealing a busy carrier", () => {
    const initial = createInitialState();
    const queued = orderSurfaceWork(
      initial,
      { x: 61, y: 54 },
      "structure",
      "steel",
    ).state;
    const carrier = initial.personnel[0]!;
    const state = {
      ...queued,
      world: {
        ...queued.world,
        positions: {
          ...queued.world.positions,
          [carrier.id]: queued.construction.stockpile,
        },
      },
      personnel: queued.personnel.map((person) =>
        person.id === carrier.id
          ? { ...person, currentJobId: "another-order" }
          : person,
      ),
      jobs: queued.jobs.map((job) =>
        job.id === queued.environment.orders[0]!.jobId
          ? {
              ...job,
              status: "completed" as const,
              assignedPersonId: carrier.id,
            }
          : job,
      ),
    };
    const transitioned = advanceSurfaceWork(state);
    const delivery = transitioned.jobs.find(
      (job) => job.id === queued.environment.orders[0]!.jobId,
    )!;
    expect(delivery).toMatchObject({
      status: "available",
      assignedPersonId: null,
      requiredWorkerId: carrier.id,
    });
    expect(
      transitioned.personnel.find((person) => person.id === carrier.id)
        ?.currentJobId,
    ).toBe("another-order");
  });
  it("raises alerts from recorded failures without exposing unseen damage or clearing other incidents", () => {
    const state = createInitialState();
    const position = { x: 61, y: 54 };
    const failed = {
      ...state,
      world: {
        ...state.world,
        map: damageSurface(
          state.world.map,
          position,
          "structure",
          "impact",
          1000,
        ),
      },
    };
    expect(observeStructuralDamage(failed).incident.level).toBe("green");
    const recorded = observeStructuralDamage(observeSite(failed));
    expect(recorded.incident.level).toBe("orange");
    const repaired = observeStructuralDamage(
      observeSite({
        ...recorded,
        world: state.world,
        incident: { level: "red", summary: "Independent emergency" },
      }),
    );
    expect(repaired.incident).toMatchObject({
      level: "red",
      summary: "Independent emergency",
    });
  });
  it("delivers and repairs an ordinary wall using shared stock", () => {
    let state = createInitialState();
    const position = { x: 61, y: 54 };
    state = observeSite({
      ...state,
      world: {
        ...state.world,
        map: damageSurface(
          state.world.map,
          position,
          "structure",
          "impact",
          1000,
        ),
      },
    });
    const result = orderSurfaceWork(state, position, "structure", "steel");
    expect(result.code).toBe("accepted");
    state = result.state;
    const stages = new Set<string>();
    let carrier: string | null = null;
    for (
      let tick = 0;
      tick < 200 && state.environment.orders[0]!.phase !== "completed";
      tick += 1
    ) {
      stages.add(state.environment.orders[0]!.phase);
      state = advanceSimulation(state);
      if (state.environment.orders[0]!.phase === "delivering") {
        const job = state.jobs.find(
          (job) => job.id === state.environment.orders[0]!.jobId,
        )!;
        expect(job.requiredWorkerId).toBeTruthy();
        carrier ??= job.requiredWorkerId;
        expect(job.requiredWorkerId).toBe(carrier);
      }
      expect(
        loadGameState({
          getItem: () => JSON.stringify(state),
          setItem: () => {},
        }).status,
      ).toBe("loaded");
    }
    expect(stages).toEqual(new Set(["collecting", "delivering", "fitting"]));
    expect(surfaceAt(state.world.map, position, "structure")).toMatchObject({
      material: "steel",
      integrity: 100,
    });
    expect(surfaceAt(state.world.map, position, "floor")?.material).toBe(
      "concrete",
    );
    expect(state.construction.availableMaterials).toBe(156);
  });
  it("queues only current observed damage, deduplicates targets, and conserves finite stock", () => {
    const initial = createInitialState();
    const position = { x: 61, y: 54 };
    const damaged = {
      ...initial,
      tick: 1,
      environment: { ...initial.environment, automaticRepairs: true },
      world: {
        ...initial.world,
        map: damageSurface(
          initial.world.map,
          position,
          "structure",
          "corrosion",
          80,
        ),
      },
    };
    expect(discoverSurfaceWork(damaged).environment.orders).toHaveLength(0);
    const queued = discoverSurfaceWork(observeSite(damaged));
    expect(queued.environment.orders).toHaveLength(1);
    expect(discoverSurfaceWork(queued).environment.orders).toHaveLength(1);
    expect(
      queued.construction.availableMaterials +
        queued.environment.spentMaterials,
    ).toBe(160);
    const empty = {
      ...damaged,
      construction: { ...damaged.construction, availableMaterials: 0 },
    };
    expect(
      orderSurfaceWork(observeSite(empty), position, "structure", "steel").code,
    ).toBe("insufficient-materials");
  });
  it("does not close a door or finish a wall through an occupant", () => {
    const initial = createInitialState();
    const door = { x: 61, y: 55 };
    const controller = createController({
      ...initial,
      world: {
        ...initial.world,
        positions: { ...initial.world.positions, "person-mara-voss": door },
      },
    });
    expect(
      surfaceAt(
        controller.setDoorOpen(door, false).game.world.map,
        door,
        "structure",
      )?.kind,
    ).toBe("door");
    const position = { x: 61, y: 54 };
    const damaged = {
      ...initial,
      world: {
        ...initial.world,
        map: damageSurface(
          initial.world.map,
          position,
          "structure",
          "impact",
          1000,
        ),
      },
    };
    const queued = orderSurfaceWork(
      damaged,
      position,
      "structure",
      "concrete",
    ).state;
    const blocked = advanceSurfaceWork({
      ...queued,
      world: {
        ...queued.world,
        positions: { ...queued.world.positions, "person-mara-voss": position },
      },
      environment: {
        ...queued.environment,
        orders: queued.environment.orders.map((order) => ({
          ...order,
          phase: "fitting",
        })),
      },
      jobs: queued.jobs.map((job) =>
        job.id === queued.environment.orders[0]!.jobId
          ? { ...job, status: "completed", skillId: "engineering" }
          : job,
      ),
    });
    expect(blocked.environment.orders[0]?.blockedReason).toContain("clearance");
    expect(surfaceAt(blocked.world.map, position, "structure")?.integrity).toBe(
      0,
    );
    const cleared = advanceSurfaceWork({
      ...blocked,
      world: { ...blocked.world, positions: initial.world.positions },
    });
    expect(cleared.environment.orders[0]?.phase).toBe("completed");
  });
  it("rejects contradictory topology, invalid materials and malformed work ledgers", () => {
    const state = createInitialState();
    const surface = state.world.map.surfaces[54 * 128 + 61]!;
    for (const changed of [
      { ...state, environment: { ...state.environment, spentMaterials: 6 } },
      {
        ...state,
        world: {
          ...state.world,
          map: {
            ...state.world.map,
            surfaces: {
              ...state.world.map.surfaces,
              [54 * 128 + 61]: {
                ...surface,
                structure: { ...surface.structure, integrity: 0 },
              },
            },
          },
        },
      },
      {
        ...state,
        world: {
          ...state.world,
          map: {
            ...state.world.map,
            surfaces: {
              ...state.world.map.surfaces,
              [54 * 128 + 61]: {
                ...surface,
                floor: { ...surface.floor, material: "unobtainium" },
              },
            },
          },
        },
      },
    ])
      expect(
        loadGameState({
          getItem: () => JSON.stringify(changed),
          setItem: () => {},
        }).status,
      ).toBe("invalid");
  });
  it("damages reachable surfaces rather than named barrier tiles", () => {
    const state = createInitialState();
    const source = {
      id: "test",
      name: "Contact",
      position: { x: 60, y: 54 },
      kind: "corrosion" as const,
      dose: 200,
      radius: 2,
    };
    const exposed = {
      ...state,
      environment: { ...state.environment, sources: [source] },
    };
    expect(exposureTiles(exposed, source)).toContainEqual({ x: 61, y: 54 });
    expect(exposureTiles(exposed, source)).not.toContainEqual({ x: 62, y: 54 });
    const damaged = advanceExposure(exposed);
    expect(
      surfaceAt(damaged.world.map, { x: 61, y: 54 }, "structure")?.integrity,
    ).toBe(0);
    expect(exposureTiles(damaged, source)).toContainEqual({ x: 62, y: 54 });
  });
});
