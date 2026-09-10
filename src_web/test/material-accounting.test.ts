import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation_legacy/state";
import {
  orderSurfaceWork,
  cancelSurfaceWork,
} from "../src/simulation_legacy/environment";
import { advanceSimulation } from "../src/simulation_legacy/tick";
import { loadGameState } from "../src/adapters/browser_legacy/game-persistence";
import {
  reservedObject,
  reserveSupply,
} from "../src/simulation_legacy/objects";
import { availableMaterials } from "../src/simulation_legacy/material-stock";
import {
  craftVessel,
  cancelVesselWork,
} from "../src/simulation_legacy/vessel-work";
import {
  orderObjectMove,
  cancelObjectMove,
} from "../src/simulation_legacy/object-work";

function stockScenario(quantity: number) {
  const initial = createInitialState();
  return {
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.map((item) =>
        item.id === "stock-materials"
          ? {
              ...item,
              quantity,
              location: { kind: "ground" as const, position: { x: 66, y: 70 } },
            }
          : item,
      ),
    },
  };
}

it.each([23, 240])(
  "uses %i relocated materials through reservation, cancellation, consumption and reload",
  (quantity) => {
    let state: ReturnType<typeof createInitialState> = stockScenario(quantity);
    const total = () =>
      state.objects.items
        .filter((item) => item.kind === "materials")
        .reduce((sum, item) => sum + item.quantity, 0);
    const checkSave = () =>
      expect(
        loadGameState({
          getItem: () => JSON.stringify(state),
          setItem: () => {},
        }).status,
      ).toBe("loaded");
    checkSave();
    expect(availableMaterials(state.objects)).toBe(quantity);
    state = orderSurfaceWork(
      state,
      { x: 63, y: 79 },
      "floor",
      "steel",
      "floor",
    ).state;
    const order = state.environment.orders[0]!;
    expect(reservedObject(state.objects, order.jobId)).toMatchObject({
      quantity: 4,
      location: { kind: "ground", position: { x: 66, y: 70 } },
    });
    expect(total()).toBe(quantity);
    expect(availableMaterials(state.objects)).toBe(quantity - 4);
    checkSave();
    state = cancelSurfaceWork(state, order.id);
    expect(total()).toBe(quantity);
    expect(availableMaterials(state.objects)).toBe(quantity);
    checkSave();
    state = orderSurfaceWork(
      state,
      { x: 63, y: 79 },
      "floor",
      "steel",
      "floor",
    ).state;
    for (
      let tick = 0;
      tick < 300 && state.environment.orders.at(-1)!.phase !== "completed";
      tick++
    )
      state = advanceSimulation(state);
    expect(state.environment.orders.at(-1)!.phase).toBe("completed");
    expect(total()).toBe(quantity - 4);
    checkSave();
  },
);

it("shares stock between surface and vessel work without reserving it twice", () => {
  const initial = stockScenario(23);
  const surface = orderSurfaceWork(
    initial,
    { x: 63, y: 79 },
    "floor",
    "steel",
    "floor",
  ).state;
  let state: ReturnType<typeof createInitialState> = craftVessel(
    surface,
    { x: 66, y: 65 },
    "concrete",
  ).state;
  expect(availableMaterials(state.objects)).toBe(11);
  expect(
    loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} })
      .status,
  ).toBe("loaded");
  state = cancelSurfaceWork(state, state.environment.orders[0]!.id);
  expect(availableMaterials(state.objects)).toBe(15);
  const cancelled = cancelVesselWork(state, state.vesselWork.orders[0]!.id);
  expect(availableMaterials(cancelled.objects)).toBe(23);
  for (
    let tick = 0;
    tick < 300 && state.vesselWork.orders[0]!.phase !== "completed";
    tick++
  )
    state = advanceSimulation(state);
  expect(state.vesselWork.orders[0]!.phase).toBe("completed");
  expect(
    state.objects.items
      .filter((item) => item.kind === "materials")
      .reduce((sum, item) => sum + item.quantity, 0),
  ).toBe(15);
  expect(
    loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} })
      .status,
  ).toBe("loaded");
});

it("chooses nearby compatible stock independently of object array order", () => {
  const state = stockScenario(23);
  const material = state.objects.items.find(
    (item) => item.id === "stock-materials",
  )!;
  const farther = {
    ...material,
    id: "farther-materials",
    location: { kind: "ground" as const, position: { x: 60, y: 59 } },
  };
  for (const items of [
    [farther, ...state.objects.items],
    [...state.objects.items, farther],
  ]) {
    const result = reserveSupply(
      { ...state.objects, items },
      "materials",
      4,
      { x: 66, y: 69 },
      "scenario-work",
      true,
    );
    expect(reservedObject(result.store, "scenario-work")).toMatchObject({
      quantity: 4,
      location: { kind: "ground", position: { x: 66, y: 70 } },
    });
  }
});

it("does not spend materials committed to hauling and derives availability when hauling is cancelled", () => {
  const initial = stockScenario(23);
  const result = orderObjectMove(
    initial,
    "stock-materials",
    { x: 66, y: 69 },
    "north",
    false,
    23,
  );
  expect(result.code).toBe("accepted");
  expect(availableMaterials(result.state.objects)).toBe(0);
  expect(
    orderSurfaceWork(result.state, { x: 63, y: 79 }, "floor", "steel", "floor")
      .code,
  ).toBe("insufficient-materials");
  expect(
    loadGameState({
      getItem: () => JSON.stringify(result.state),
      setItem: () => {},
    }).status,
  ).toBe("loaded");
  const cancelled = cancelObjectMove(
    result.state,
    result.state.objectOrders[0]!.id,
  );
  expect(availableMaterials(cancelled.objects)).toBe(23);
  const small = stockScenario(3);
  const denied = orderSurfaceWork(
    small,
    { x: 63, y: 79 },
    "floor",
    "steel",
    "floor",
  );
  expect(denied.code).toBe("insufficient-materials");
  expect(denied.state).toBe(small);
});
