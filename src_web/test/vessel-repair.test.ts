import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  cancelVesselWork,
  craftVessel,
  orderVesselAction,
} from "../src/simulation/vessel-work";
import { advanceSimulation } from "../src/simulation/tick";
import { loadGameState } from "../src/adapters/browser/game-persistence";

function verifySave(state: ReturnType<typeof createInitialState>) {
  const loaded = loadGameState({
    getItem: () => JSON.stringify(state),
    setItem: () => {},
  });
  expect(loaded.status).toBe("loaded");
  if (loaded.status === "loaded")
    expect(advanceSimulation(loaded.state)).toEqual(advanceSimulation(state));
}

function wornCase() {
  let state = craftVessel(
    createInitialState(),
    { x: 66, y: 65 },
    "steel",
  ).state;
  for (
    let tick = 0;
    tick < 200 && state.vesselWork.orders[0]!.phase !== "completed";
    tick += 1
  )
    state = advanceSimulation(state);
  expect(state.vesselWork.orders[0]!.phase).toBe("completed");
  return {
    ...state,
    objects: {
      ...state.objects,
      items: state.objects.items.map((item) =>
        item.id === "vessel-1" ? { ...item, condition: 0 } : item,
      ),
    },
  };
}

it("repairs the existing empty open case through physical material delivery and engineering", () => {
  const initial = wornCase();
  const queued = orderVesselAction(initial, "vessel-1", "repair");
  expect(queued.code).toBe("accepted");
  let state = queued.state;
  expect(state.construction.availableMaterials).toBe(136);
  verifySave(state);
  expect(
    state.objects.items.find((item) => item.id === "vessel-1")!.condition,
  ).toBe(0);
  expect(orderVesselAction(state, "vessel-1", "seal").code).toBe("busy");
  const phases = new Set<string>();
  for (
    let tick = 0;
    tick < 200 && state.vesselWork.orders.at(-1)!.phase !== "completed";
    tick += 1
  ) {
    phases.add(state.vesselWork.orders.at(-1)!.phase);
    state = advanceSimulation(state);
    if (tick % 10 === 0) verifySave(state);
  }
  expect(phases).toEqual(new Set(["collecting", "delivering", "working"]));
  expect(state.vesselWork.orders.at(-1)!.phase).toBe("completed");
  expect(
    state.objects.items.filter((item) => item.kind === "vessel"),
  ).toHaveLength(1);
  expect(
    state.objects.items.find((item) => item.id === "vessel-1"),
  ).toMatchObject({
    condition: 100,
    vessel: { material: "steel", sealed: false },
    reservedBy: null,
  });
  expect(orderVesselAction(state, "vessel-1", "repair").code).toBe("busy");
  expect(state.incident.level).toBe("green");
  verifySave(state);
});

it("cancels unused repair stock once and retains transported stock until delivery", () => {
  let state = orderVesselAction(wornCase(), "vessel-1", "repair").state;
  const orderId = state.vesselWork.orders.at(-1)!.id;
  const cancelled = cancelVesselWork(state, orderId);
  expect(cancelled.construction.availableMaterials).toBe(144);
  expect(
    cancelled.objects.items.find((item) => item.id === "vessel-1")!.reservedBy,
  ).toBeNull();
  expect(cancelVesselWork(cancelled, orderId)).toBe(cancelled);
  verifySave(cancelled);
  state = orderVesselAction(cancelled, "vessel-1", "repair").state;
  const secondId = state.vesselWork.orders.at(-1)!.id;
  for (
    let tick = 0;
    tick < 150 && state.vesselWork.orders.at(-1)!.phase !== "delivering";
    tick += 1
  )
    state = advanceSimulation(state);
  expect(state.vesselWork.orders.at(-1)!.phase).toBe("delivering");
  expect(cancelVesselWork(state, secondId)).toBe(state);
  verifySave(state);
  for (
    let tick = 0;
    tick < 150 && state.vesselWork.orders.at(-1)!.phase !== "working";
    tick += 1
  )
    state = advanceSimulation(state);
  expect(state.vesselWork.orders.at(-1)!.phase).toBe("working");
  state = cancelVesselWork(state, secondId);
  expect(state.construction.availableMaterials).toBe(144);
  expect(
    state.objects.items.find((item) => item.id === "vessel-1")!.condition,
  ).toBe(0);
  verifySave(state);
});

it("rejects corrupt repair material, host reservation, and cost ledgers", () => {
  const state = orderVesselAction(wornCase(), "vessel-1", "repair").state;
  for (const invalid of [
    {
      ...state,
      construction: { ...state.construction, availableMaterials: 144 },
    },
    {
      ...state,
      vesselWork: {
        ...state.vesselWork,
        orders: state.vesselWork.orders.map((order) =>
          order.action === "repair" ? { ...order, material: "ceramic" } : order,
        ),
      },
    },
    {
      ...state,
      objects: {
        ...state.objects,
        items: state.objects.items.map((item) =>
          item.id === "vessel-1" ? { ...item, reservedBy: null } : item,
        ),
      },
    },
  ])
    expect(
      loadGameState({
        getItem: () => JSON.stringify(invalid),
        setItem: () => {},
      }).status,
    ).toBe("invalid");
});

it("refuses repair around loaded or sealed contents and preserves resources on rejection", () => {
  const initial = wornCase();
  const sealed = {
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.map((item) =>
        item.vessel
          ? { ...item, vessel: { ...item.vessel, sealed: true } }
          : item,
      ),
    },
  };
  expect(orderVesselAction(sealed, "vessel-1", "repair")).toEqual({
    state: sealed,
    code: "sealed",
  });
  const loaded = {
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.map((item) =>
        item.id === "spare-meal-seat"
          ? {
              ...item,
              location: { kind: "contained" as const, vesselId: "vessel-1" },
            }
          : item,
      ),
    },
  };
  expect(orderVesselAction(loaded, "vessel-1", "repair")).toEqual({
    state: loaded,
    code: "invalid-cargo",
  });
  const emptyStock = {
    ...initial,
    construction: { ...initial.construction, availableMaterials: 0 },
  };
  expect(orderVesselAction(emptyStock, "vessel-1", "repair")).toEqual({
    state: emptyStock,
    code: "insufficient-materials",
  });
});
