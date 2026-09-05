import { describe, expect, it } from "vitest";
import {
  canObserve,
  observeSite,
  installCamera,
  setCameraEnabled,
  cameraInstalled,
} from "../src/simulation/observations";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import type { SiteMap } from "../src/simulation/world";
import { observedSnapshot } from "../src/adapters/browser/observed-view";
import { loadGameState } from "../src/adapters/browser/game-persistence";

describe("facility observations", () => {
  it("accepts camera orders outside current coverage but checks the actual mounting site on arrival", () => {
    const initial = createInitialState();
    const unobserved = {
      ...initial,
      observations: { ...initial.observations, visibleTiles: [] },
    };
    expect(installCamera(unobserved, { x: 56, y: 55 }).code).toBe(
      "installed-order",
    );
    const position = { x: 80, y: 80 };
    const knownTiles = [...initial.observations.knownTiles];
    knownTiles[position.y * 128 + position.x] = null;
    const queued = installCamera(
      { ...initial, observations: { ...initial.observations, knownTiles } },
      position,
    );
    expect(queued.code).toBe("installed-order");
    const completed = createController(queued.state).advance(150).game;
    const device = completed.observations.cameras.at(-1)!;
    expect(cameraInstalled(completed, device)).toBe(false);
    expect(
      completed.jobs.find(({ id }) => id === device.installJobId)
        ?.assignmentReason,
    ).toContain("interior floor required");
  });
  it("sleeping staff do not provide sight and unseen impressions remain recorded", () => {
    const initial = createInitialState();
    const beds = initial.routines.stations.filter(
      ({ kind }) => kind === "sleep",
    );
    const sleeping = {
      ...initial,
      tick: 50,
      personnel: initial.personnel.map((person) => ({
        ...person,
        stress: 100,
      })),
      routines: {
        ...initial.routines,
        activities: Object.fromEntries(
          initial.personnel.map((person, index) => [
            person.id,
            {
              kind: "sleep" as const,
              stationId: beds[index]!.id,
              progress: 1,
              startedTick: 1,
              mealConsumed: false,
            },
          ]),
        ),
      },
      world: {
        ...initial.world,
        positions: {
          ...initial.world.positions,
          ...Object.fromEntries(
            initial.personnel.map((person, index) => [
              person.id,
              beds[index]!.position,
            ]),
          ),
          "SCP-999": { x: 90, y: 90 },
        },
      },
      observations: {
        ...initial.observations,
        cameras: initial.observations.cameras.map((camera) => ({
          ...camera,
          enabled: false,
        })),
      },
    };
    const observed = observeSite(sleeping);
    expect(observed.observations.visibleTiles).toEqual([]);
    expect(
      observed.observations.entities["person-mara-voss"]?.moodAppearance,
    ).toBe(initial.observations.entities["person-mara-voss"]?.moodAppearance);
    expect(
      observedSnapshot({ game: observed, running: true }).game.personnel[0]
        ?.activity,
    ).toContain("Last observed");
    expect(
      loadGameState({
        getItem: () => JSON.stringify(observed),
        setItem: () => {},
      }).status,
    ).toBe("loaded");
  });
  it("projects remembered positions and preserves observation memory through reload", () => {
    const initial = createInitialState();
    const state = observeSite({
      ...initial,
      tick: 20,
      world: {
        ...initial.world,
        positions: { ...initial.world.positions, "SCP-999": { x: 90, y: 90 } },
      },
    });
    const display = observedSnapshot({ game: state, running: true });
    expect(display.game.world.positions["SCP-999"]).toEqual(
      initial.world.positions["SCP-999"],
    );
    expect(state.world.positions["SCP-999"]).toEqual({ x: 90, y: 90 });
    const load = loadGameState({
      getItem: () => JSON.stringify(state),
      setItem: () => {},
    });
    expect(load.status).toBe("loaded");
    expect(
      loadGameState({
        getItem: () =>
          JSON.stringify({
            ...state,
            observations: { ...state.observations, knownTiles: [] },
          }),
        setItem: () => {},
      }).status,
    ).toBe("invalid");
  });
  it("uses finite kits and waits for physical camera installation", () => {
    const initial = createInitialState();
    const placed = installCamera(initial, { x: 56, y: 55 });
    expect(placed.code).toBe("installed-order");
    expect(placed.state.observations.cameraKits).toBe(2);
    const camera = placed.state.observations.cameras.at(-1)!;
    expect(cameraInstalled(placed.state, camera)).toBe(false);
    expect(installCamera(placed.state, { x: 56, y: 55 }).code).toBe("occupied");
    const controller = createController(placed.state);
    const completed = controller.advance(100).game;
    expect(cameraInstalled(completed, camera)).toBe(true);
    expect(
      setCameraEnabled(completed, camera.id, false).observations.cameras.at(-1)
        ?.enabled,
    ).toBe(false);
    expect(installCamera(initial, { x: 100, y: 100 }).code).toBe(
      "installed-order",
    );
  });
  it("blocks sight behind walls and through diagonal wall corners", () => {
    const map: SiteMap = {
      surfaces: {},
      id: "test",
      width: 3,
      height: 3,
      rooms: [],
      tiles: [
        "floor",
        "wall",
        "floor",
        "floor",
        "wall",
        "floor",
        "floor",
        "floor",
        "floor",
      ],
    };
    expect(canObserve(map, { x: 0, y: 0 }, { x: 1, y: 0 }, 6)).toBe(true);
    expect(canObserve(map, { x: 0, y: 0 }, { x: 2, y: 0 }, 6)).toBe(false);
    expect(canObserve(map, { x: 0, y: 0 }, { x: 1, y: 1 }, 6)).toBe(false);
    expect(canObserve(map, { x: 0, y: 0 }, { x: 0, y: 2 }, 1)).toBe(false);
  });
  it("remembers unseen terrain and anomaly state without following hidden changes", () => {
    const initial = createInitialState();
    const hiddenPosition = { x: 90, y: 90 };
    const changed = {
      ...initial,
      tick: 10,
      world: {
        ...initial.world,
        positions: { ...initial.world.positions, "SCP-999": hiddenPosition },
      },
      scp999: { ...initial.scp999, status: "resting" as const },
    };
    const observed = observeSite(changed);
    expect(observed.observations.entities["SCP-999"]?.position).toEqual(
      initial.world.positions["SCP-999"],
    );
    expect(observed.observations.visibleEntityIds).not.toContain("SCP-999");
    expect(observed.observations.scp999?.state.status).toBe(
      initial.scp999.status,
    );
    expect(observed.observations.knownTiles[90 * 128 + 90]).toBeNull();
    const tiles = [...initial.world.map.tiles];
    tiles[80 * 128 + 80] = "wall";
    const unseen = observeSite({
      ...changed,
      world: { ...changed.world, map: { ...changed.world.map, tiles } },
    });
    expect(unseen.observations.knownTiles[80 * 128 + 80]).toBe("grass");
  });
  it("a camera reveals actual changes only when enabled and in range", () => {
    const initial = createInitialState();
    const position = { x: 90, y: 90 };
    const state = {
      ...initial,
      tick: 12,
      world: {
        ...initial.world,
        positions: { ...initial.world.positions, "SCP-999": position },
      },
      observations: {
        ...initial.observations,
        cameras: [
          {
            id: "test",
            name: "Test",
            position,
            range: 4,
            enabled: false,
            installJobId: null,
          },
        ],
      },
    };
    expect(observeSite(state).observations.visibleEntityIds).not.toContain(
      "SCP-999",
    );
    const revealed = observeSite({
      ...state,
      observations: {
        ...state.observations,
        cameras: state.observations.cameras.map((camera) => ({
          ...camera,
          enabled: true,
        })),
      },
    });
    expect(revealed.observations.entities["SCP-999"]?.position).toEqual(
      position,
    );
    expect(revealed.observations.entities["SCP-999"]?.sources).toContain(
      "test",
    );
  });
});
