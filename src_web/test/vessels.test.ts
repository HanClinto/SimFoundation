import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import { objectPosition, type PhysicalObject } from "../src/simulation/objects";
import {
  advanceVesselWear,
  containingBarrier,
} from "../src/simulation/vessels";
import {
  advanceExposure,
  exposurePosition,
  exposureTiles,
  setExposureSource,
} from "../src/simulation/environment";
import {
  advanceVesselWork,
  cancelVesselWork,
  craftVessel,
  orderVesselAction,
} from "../src/simulation/vessel-work";
import { advanceSimulation } from "../src/simulation/tick";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { storageAccepts } from "../src/simulation/storage";

function verifySave(state: ReturnType<typeof createInitialState>) {
  const loaded = loadGameState({
    getItem: () => JSON.stringify(state),
    setItem: () => {},
  });
  expect(loaded.status).toBe("loaded");
  if (loaded.status === "loaded")
    expect(advanceSimulation(loaded.state)).toEqual(advanceSimulation(state));
}

it("fabricates with real materials, loads staged cargo and seals through worker jobs", () => {
  let state = craftVessel(
    createInitialState(),
    { x: 66, y: 65 },
    "ceramic",
  ).state;
  expect(state.construction.availableMaterials).toBe(148);
  verifySave(state);
  for (
    let tick = 0;
    tick < 200 && state.vesselWork.orders[0]!.phase !== "completed";
    tick += 1
  ) {
    state = advanceSimulation(state);
    if (tick % 10 === 0) verifySave(state);
  }
  expect(state.vesselWork.orders[0]!.phase).toBe("completed");
  const vesselId = state.vesselWork.orders[0]!.vesselId;
  expect(
    orderVesselAction(state, vesselId, "seal", "spare-meal-seat").code,
  ).toBe("invalid-cargo");
  expect(
    orderVesselAction(state, vesselId, "load", "stock-materials").code,
  ).toBe("invalid-cargo");
  const load = orderVesselAction(state, vesselId, "load", "spare-meal-seat");
  expect(load.code).toBe("accepted");
  state = load.state;
  verifySave(state);
  for (
    let tick = 0;
    tick < 80 && state.vesselWork.orders.at(-1)!.phase !== "completed";
    tick += 1
  )
    state = advanceSimulation(state);
  expect(
    state.objects.items.find((item) => item.id === "spare-meal-seat")!.location,
  ).toEqual({ kind: "contained", vesselId });
  verifySave(state);
  state = orderVesselAction(state, vesselId, "seal").state;
  for (
    let tick = 0;
    tick < 80 && state.vesselWork.orders.at(-1)!.phase !== "completed";
    tick += 1
  )
    state = advanceSimulation(state);
  expect(
    state.objects.items.find((item) => item.id === vesselId)!.vessel?.sealed,
  ).toBe(true);
  verifySave(state);
  expect(
    orderVesselAction(state, vesselId, "unload", undefined, { x: 65, y: 65 })
      .code,
  ).toBe("sealed");
  for (const invalid of [
    {
      ...state,
      objects: {
        ...state.objects,
        items: state.objects.items.map((item) =>
          item.id === vesselId
            ? { ...item, vessel: { material: "invalid", sealed: true } }
            : item,
        ),
      },
    },
    {
      ...state,
      objects: {
        ...state.objects,
        items: state.objects.items.map((item) =>
          item.id === "spare-break-seat"
            ? { ...item, location: { kind: "contained", vesselId } }
            : item,
        ),
      },
    },
    {
      ...state,
      construction: { ...state.construction, availableMaterials: 160 },
    },
  ])
    expect(
      loadGameState({
        getItem: () => JSON.stringify(invalid),
        setItem: () => {},
      }).status,
    ).toBe("invalid");
  state = setExposureSource(state, {
    name: "Cargo",
    objectId: "spare-meal-seat",
    position: { x: 66, y: 65 },
    kind: "corrosion",
    dose: 4,
    radius: 1,
    enabled: true,
  }).state;
  const shipped = orderVesselAction(
    state,
    vesselId,
    "transport",
    undefined,
    { x: 54, y: 59 },
    { mode: "helicopter", duration: 30 },
  );
  expect(shipped.code).toBe("accepted");
  state = shipped.state;
  for (
    let tick = 0;
    tick < 100 && state.vesselWork.orders.at(-1)!.phase !== "transit";
    tick += 1
  )
    state = advanceSimulation(state);
  expect(state.vesselWork.orders.at(-1)!.phase).toBe("transit");
  const dispatchCondition = state.objects.items.find(
    (item) => item.id === vesselId,
  )!.condition;
  verifySave(state);
  expect(exposurePosition(state, state.environment.sources[0]!)).toBeNull();
  const corruptTransit = {
    ...state,
    vesselWork: {
      ...state.vesselWork,
      orders: state.vesselWork.orders.map((order) =>
        order.phase === "transit"
          ? { ...order, transport: { ...order.transport, arrivesAt: null } }
          : order,
      ),
    },
  };
  expect(
    loadGameState({
      getItem: () => JSON.stringify(corruptTransit),
      setItem: () => {},
    }).status,
  ).toBe("invalid");
  expect(cancelVesselWork(state, state.vesselWork.orders.at(-1)!.id)).toBe(
    state,
  );
  const occupied = {
    ...state,
    world: {
      ...state.world,
      positions: {
        ...state.world.positions,
        [state.personnel[0]!.id]: { x: 54, y: 59 },
      },
    },
  };
  const waiting = advanceVesselWork({
    ...occupied,
    tick: state.vesselWork.orders.at(-1)!.transport!.arrivesAt!,
  });
  expect(waiting.vesselWork.orders.at(-1)!.phase).toBe("transit");
  expect(waiting.vesselWork.orders.at(-1)!.blockedReason).toContain(
    "clear deposit",
  );
  for (
    let tick = 0;
    tick < 80 && state.vesselWork.orders.at(-1)!.phase !== "completed";
    tick += 1
  ) {
    state = advanceSimulation(state);
    if (tick % 10 === 0) verifySave(state);
  }
  expect(state.vesselWork.orders.at(-1)!.phase).toBe("completed");
  expect(
    state.objects.items.find((item) => item.id === vesselId)!.condition,
  ).toBeLessThan(dispatchCondition);
  expect(exposurePosition(state, state.environment.sources[0]!)).toEqual({
    x: 54,
    y: 59,
  });
  expect(
    state.objects.items.find((item) => item.id === "spare-meal-seat")!.location,
  ).toEqual({ kind: "contained", vesselId });
  verifySave(state);
  state = orderVesselAction(state, vesselId, "open").state;
  for (
    let tick = 0;
    tick < 80 && state.vesselWork.orders.at(-1)!.phase !== "completed";
    tick += 1
  )
    state = advanceSimulation(state);
  const unload = orderVesselAction(state, vesselId, "unload", undefined, {
    x: 53,
    y: 59,
  });
  expect(unload.code).toBe("accepted");
  state = unload.state;
  for (
    let tick = 0;
    tick < 80 && state.vesselWork.orders.at(-1)!.phase !== "completed";
    tick += 1
  )
    state = advanceSimulation(state);
  expect(
    state.objects.items.find((item) => item.id === "spare-meal-seat")!.location,
  ).toEqual({ kind: "ground", position: { x: 53, y: 59 } });
  verifySave(state);
});

function fixture() {
  const state = createInitialState();
  const vessel: PhysicalObject = {
    id: "test-vessel",
    kind: "vessel",
    quantity: 1,
    condition: 100,
    installed: false,
    orientation: "north",
    reservedBy: null,
    location: { kind: "ground", position: { x: 65, y: 65 } },
    vessel: { material: "ceramic", sealed: true },
  };
  return {
    ...state,
    objects: {
      ...state.objects,
      items: [
        ...state.objects.items.map((item) =>
          item.id === "spare-break-seat"
            ? {
                ...item,
                location: { kind: "contained" as const, vesselId: vessel.id },
              }
            : item,
        ),
        vessel,
      ],
    },
    environment: {
      ...state.environment,
      sources: [
        {
          id: "test-source",
          name: "Test",
          objectId: "spare-break-seat",
          position: { x: 67, y: 66 },
          radius: 1,
          dose: 4,
          kind: "corrosion" as const,
          enabled: true,
        },
      ],
    },
  };
}

it("uses material resistance for portable containment wear without disabling the source", () => {
  const initial = fixture();
  const source = initial.environment.sources[0]!;
  expect(containingBarrier(initial, source)?.id).toBe("test-vessel");
  const next = advanceVesselWear(initial);
  expect(next.objects.items.at(-1)!.condition).toBe(99.96);
  expect(next.environment.sources[0]!.enabled).toBe(true);
  const broken = {
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.map((item) =>
        item.id === "test-vessel" ? { ...item, condition: 0.01 } : item,
      ),
    },
  };
  expect(containingBarrier(advanceVesselWear(broken), source)).toBeUndefined();
  const opened = {
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.map((item) =>
        item.vessel
          ? { ...item, vessel: { ...item.vessel, sealed: false } }
          : item,
      ),
    },
  };
  expect(containingBarrier(opened, source)).toBeUndefined();
  expect(advanceVesselWear(opened)).toBe(opened);
  expect(exposureTiles(initial, source)).toEqual([]);
  expect(exposureTiles(opened, source)).toContainEqual({ x: 65, y: 65 });
  expect(advanceExposure(broken).objects.items.at(-1)!.condition).toBe(0);
  const ordinary = {
    ...initial.storage.areas[0]!,
    accepts: ["vessel" as const],
    emission: "none" as const,
  };
  expect(storageAccepts(initial, ordinary, initial.objects.items.at(-1)!)).toBe(
    true,
  );
  const breached = advanceExposure(broken);
  expect(
    storageAccepts(breached, ordinary, breached.objects.items.at(-1)!),
  ).toBe(false);
});

it("locates contained cargo through its vessel and carrier without recursive containers", () => {
  const initial = fixture();
  const cargo = initial.objects.items.find(
    (item) => item.id === "spare-break-seat",
  )!;
  expect(
    objectPosition(cargo, initial.world.positions, initial.objects),
  ).toEqual({ x: 65, y: 65 });
  const store = {
    ...initial.objects,
    items: initial.objects.items.map((item) =>
      item.id === "test-vessel"
        ? {
            ...item,
            location: {
              kind: "carried" as const,
              personId: initial.personnel[0]!.id,
            },
          }
        : item,
    ),
  };
  expect(objectPosition(cargo, initial.world.positions, store)).toEqual(
    initial.world.positions[initial.personnel[0]!.id],
  );
});

it("cancels fabrication once without spawning a case or losing materials", () => {
  const initial = createInitialState();
  const queued = craftVessel(initial, { x: 66, y: 65 }, "composite").state;
  expect(queued.construction.availableMaterials).toBe(136);
  const cancelled = cancelVesselWork(queued, queued.vesselWork.orders[0]!.id);
  expect(cancelled.construction.availableMaterials).toBe(160);
  expect(
    cancelled.objects.items.filter((item) => item.kind === "vessel"),
  ).toEqual([]);
  expect(cancelVesselWork(cancelled, cancelled.vesselWork.orders[0]!.id)).toBe(
    cancelled,
  );
  verifySave(cancelled);
});

it("retains cargo when a case breaches in transit and releases exposure only after deposition", () => {
  const initial = fixture();
  const vesselId = "test-vessel";
  const order = {
    id: "vessel-order-1",
    jobId: "job-vessel-order-1",
    action: "transport" as const,
    vesselId,
    cargoId: null,
    material: "ceramic" as const,
    position: { x: 54, y: 59 },
    phase: "transit" as const,
    blockedReason: null,
    transport: { mode: "truck" as const, duration: 30, arrivesAt: 30 },
  };
  let state = {
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.map((item) =>
        item.id === vesselId
          ? {
              ...item,
              condition: 0.01,
              reservedBy: order.jobId,
              location: { kind: "transit" as const, orderId: order.id },
            }
          : item,
      ),
    },
    vesselWork: { nextId: 2, orders: [order] },
  } as ReturnType<typeof createInitialState>;
  state = advanceExposure(state);
  expect(state.objects.items.at(-1)!.condition).toBe(0);
  expect(exposureTiles(state, state.environment.sources[0]!)).toEqual([]);
  state = advanceVesselWork({ ...state, tick: 30 });
  expect(state.vesselWork.orders[0]!.phase).toBe("completed");
  expect(exposureTiles(state, state.environment.sources[0]!)).toContainEqual({
    x: 54,
    y: 59,
  });
  expect(
    state.objects.items.find((item) => item.id === "spare-break-seat")!
      .location,
  ).toEqual({ kind: "contained", vesselId });
});
