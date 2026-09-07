import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import { powerNetwork, setUtilityEnabled } from "../src/simulation/power";
import type { PhysicalObject } from "../src/simulation/objects";
import {
  orderVesselAction,
  cancelVesselWork,
} from "../src/simulation/vessel-work";
import { orderObjectMove } from "../src/simulation/object-work";
import { advanceSimulation } from "../src/simulation/tick";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { lightField } from "../src/simulation/lighting";
import { setSurface } from "../src/simulation/materials";
import {
  advanceExposure,
  setExposureSource,
} from "../src/simulation/environment";
import { observeSite } from "../src/simulation/observations";
import { storageQuantity } from "../src/simulation/storage";

const device = (
  id: string,
  kind: "generator" | "cable" | "light",
  x: number,
): PhysicalObject => ({
  id,
  kind,
  quantity: 1,
  condition: 100,
  installed: true,
  orientation: "north",
  reservedBy: null,
  location: { kind: "ground", position: { x, y: 60 } },
});
const initial = createInitialState();
const state = {
  ...initial,
  observations: { ...initial.observations, cameras: [] },
  objects: {
    ...initial.objects,
    items: [
      device("supply", "generator", 60),
      device("link", "cable", 61),
      device("lamp", "light", 62),
      device("island", "light", 70),
    ],
  },
};

it("derives connected circuits and isolates a removed or failed cable without mutating state", () => {
  const before = structuredClone(state);
  expect(powerNetwork(state).readings.lamp).toMatchObject({
    status: "powered",
    supply: 24,
    demand: 2,
  });
  expect(powerNetwork(state).readings.island!.status).toBe("disconnected");
  expect(powerNetwork(state)).toBe(powerNetwork(state));
  for (const patch of [{ condition: 0 }, { installed: false }]) {
    const changed = {
      ...state,
      objects: {
        ...state.objects,
        items: state.objects.items.map((item) =>
          item.id === "link" ? { ...item, ...patch } : item,
        ),
      },
    };
    expect(powerNetwork(changed).readings.lamp!.status).toBe("disconnected");
  }
  expect(
    powerNetwork(setUtilityEnabled(state, "link", false)).readings.lamp!.status,
  ).toBe("disconnected");
  expect(state).toEqual(before);
});

it("commissions a powered starting site with finite spare equipment and valid saved cable door crossings", () => {
  const state = createInitialState();
  const network = powerNetwork(state);
  for (const camera of state.observations.cameras)
    expect(network.readings[camera.id]!.status).toBe("powered");
  expect(network.readings["generator-main"]).toMatchObject({
    supply: 24,
    demand: 21,
  });
  expect(
    state.objects.items.filter(
      (item) => item.kind === "cable" && !item.installed,
    ),
  ).toHaveLength(24);
  const progressed = advanceSimulation(state);
  expect(
    loadGameState({
      getItem: () => JSON.stringify(progressed),
      setItem: () => {},
    }).status,
  ).toBe("loaded");
});

it("trips an overloaded circuit and recovers when loads or supply change", () => {
  const loaded = {
    ...state,
    objects: {
      ...state.objects,
      items: [
        device("supply", "generator", 60),
        ...Array.from({ length: 13 }, (_, index) =>
          device(`lamp-${index}`, "light", 61 + index),
        ),
      ],
    },
  };
  expect(powerNetwork(loaded).readings["lamp-0"]).toMatchObject({
    status: "overloaded",
    demand: 26,
  });
  expect(
    powerNetwork(setUtilityEnabled(loaded, "lamp-12", false)).readings[
      "lamp-0"
    ]!.status,
  ).toBe("powered");
  expect(
    powerNetwork(setUtilityEnabled(state, "supply", false)).readings.lamp!
      .status,
  ).toBe("disconnected");
});

it("repairs failed electrical equipment only after material delivery and engineering, preserving saves", () => {
  let state: ReturnType<typeof createInitialState> = {
    ...initial,
    objects: {
      ...initial.objects,
      items: [
        ...initial.objects.items,
        {
          ...device("broken-light", "light", 66),
          condition: 0,
          location: { kind: "ground" as const, position: { x: 66, y: 65 } },
        },
      ],
    },
  };
  const ordered = orderVesselAction(state, "broken-light", "repair");
  expect(ordered.code).toBe("accepted");
  state = ordered.state;
  expect(state.construction.availableMaterials).toBe(152);
  const phases = new Set<string>();
  for (let tick = 0; tick < 350; tick += 1) {
    state = advanceSimulation(state);
    const phase = state.vesselWork.orders[0]!.phase;
    if (!phases.has(phase))
      expect(
        loadGameState({
          getItem: () => JSON.stringify(state),
          setItem: () => {},
        }).status,
      ).toBe("loaded");
    phases.add(phase);
    expect(
      state.objects.items.find((item) => item.id === "broken-light")!.condition,
    ).toBe(phase === "completed" ? 100 : 0);
    if (phase === "completed") break;
  }
  expect(phases).toEqual(
    new Set(["collecting", "delivering", "working", "completed"]),
  );
});

it("occludes powered light with barriers and removes illumination immediately on a circuit fault", () => {
  const open = {
    ...state,
    world: {
      ...state.world,
      map: setSurface(state.world.map, { x: 63, y: 60 }, "structure", null),
    },
  };
  const target = 60 * state.world.map.width + 64;
  expect(lightField(open).get(target)).toBeGreaterThan(0);
  const closed = {
    ...open,
    world: {
      ...open.world,
      map: setSurface(open.world.map, { x: 63, y: 60 }, "structure", {
        kind: "wall",
        material: "steel",
        integrity: 100,
      }),
    },
  };
  expect(lightField(closed).has(target)).toBe(false);
  expect(lightField(setUtilityEnabled(open, "link", false)).size).toBe(0);
});

it("damages real electrical objects with exposure and removes camera coverage when supply fails", () => {
  const initial = createInitialState();
  const faulty = setExposureSource(initial, {
    name: "Electrical fault test",
    position: { x: 73, y: 67 },
    kind: "corrosion",
    dose: 200,
    radius: 0,
    enabled: true,
  }).state;
  const failed = advanceExposure(faulty);
  expect(
    failed.objects.items.find((item) => item.id === "generator-main")!
      .condition,
  ).toBe(0);
  expect(lightField(failed).size).toBe(0);
  const observed = observeSite(failed);
  expect(
    observed.observations.visibleEntityIds
      .flatMap((id) => observed.observations.entities[id]!.sources)
      .some((id) => id.startsWith("camera-")),
  ).toBe(false);
});

it("restores the starter lights and cameras after a physical generator repair, with cancellation releasing its kit", () => {
  const initial = createInitialState();
  const damaged = {
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.map((item) =>
        item.id === "generator-main" ? { ...item, condition: 0 } : item,
      ),
    },
  };
  const ordered = orderVesselAction(damaged, "generator-main", "repair");
  expect(ordered.code).toBe("accepted");
  const cancelled = cancelVesselWork(
    ordered.state,
    ordered.state.vesselWork.orders[0]!.id,
  );
  expect(cancelled.construction.availableMaterials).toBe(160);
  expect(
    cancelled.objects.items.find((item) => item.id === "generator-main")!
      .reservedBy,
  ).toBeNull();
  expect(
    loadGameState({
      getItem: () => JSON.stringify(cancelled),
      setItem: () => {},
    }).status,
  ).toBe("loaded");
  let state = ordered.state;
  for (let tick = 0; tick < 350; tick += 1) {
    state = advanceSimulation(state);
    if (state.vesselWork.orders[0]!.phase === "completed") break;
    expect(lightField(state).size).toBe(0);
  }
  expect(state.vesselWork.orders[0]!.phase).toBe("completed");
  expect(state.construction.availableMaterials).toBe(152);
  expect(lightField(state).size).toBeGreaterThan(0);
  for (const camera of state.observations.cameras)
    expect(powerNetwork(state).readings[camera.id]!.status).toBe("powered");
  expect(
    loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} })
      .status,
  ).toBe("loaded");
});

it("hauls and installs additional lights before they draw power, then sheds load to recover from overload", () => {
  let state = createInitialState();
  for (const [id, position] of [
    ["light-spare-1", { x: 73, y: 66 }],
    ["light-spare-2", { x: 74, y: 66 }],
  ] as const) {
    const ordered = orderObjectMove(state, id, position, "north", true);
    expect(ordered.code).toBe("accepted");
    state = ordered.state;
    expect(powerNetwork(state).readings[id]!.status).toBe("packed");
    for (
      let tick = 0;
      tick < 350 && state.objectOrders.at(-1)!.phase !== "completed";
      tick += 1
    )
      state = advanceSimulation(state);
    expect(state.objectOrders.at(-1)!.phase).toBe("completed");
    expect(state.objects.items.find((item) => item.id === id)!.installed).toBe(
      true,
    );
    expect(
      loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} })
        .status,
    ).toBe("loaded");
  }
  expect(powerNetwork(state).readings["generator-main"]).toMatchObject({
    status: "overloaded",
    supply: 24,
    demand: 25,
  });
  expect(lightField(state).size).toBe(0);
  const recovered = setUtilityEnabled(state, "light-spare-2", false);
  expect(powerNetwork(recovered).readings["light-spare-1"]!.status).toBe(
    "powered",
  );
  expect(lightField(recovered).size).toBeGreaterThan(0);
});

it("installs underfloor cable beneath a full pantry without counting the work kit as stock", () => {
  const initial = createInitialState();
  const position = { x: 58, y: 67 };
  let state = {
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.filter(
        (item) =>
          !(
            item.kind === "cable" &&
            item.installed &&
            item.location.kind === "ground" &&
            item.location.position.x === position.x &&
            item.location.position.y === position.y
          ),
      ),
    },
  };
  const ordered = orderObjectMove(
    state,
    "cable-spare-1",
    position,
    "north",
    true,
  );
  expect(ordered.code).toBe("accepted");
  let replay = ordered.state;
  const area = replay.storage.areas.find((area) => area.serveMeals)!;
  const initialStock = storageQuantity(replay, area);
  const phases = new Set<string>();
  for (let tick = 0; tick < 350; tick += 1) {
    replay = advanceSimulation(replay);
    const phase = replay.objectOrders.find(
      (order) => order.objectId === "cable-spare-1",
    )!.phase;
    if (!phases.has(phase)) {
      expect(
        loadGameState({
          getItem: () => JSON.stringify(replay),
          setItem: () => {},
        }).status,
      ).toBe("loaded");
      phases.add(phase);
    }
    expect(storageQuantity(replay, area)).toBeLessThanOrEqual(initialStock);
    if (phase === "completed") break;
  }
  expect(phases).toEqual(new Set(["pickup", "carry", "install", "completed"]));
});
