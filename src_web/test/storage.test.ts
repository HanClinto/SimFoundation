import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  mealCollectionPoint,
  servingMealCount,
  storageQuantity,
  setStorageArea,
  discoverStorageWork,
  incomingQuantity,
  removeStorageArea,
} from "../src/simulation/storage";
import { advanceSimulation } from "../src/simulation/tick";
import {
  orderObjectMove,
  cancelObjectMove,
} from "../src/simulation/object-work";
import {
  mergeGroundStack,
  reserveSupply,
  type ObjectStore,
} from "../src/simulation/objects";
import { loadGameState } from "../src/adapters/browser/game-persistence";

describe("designated storage", () => {
  it("relocates a pantry designation, stocks it through workers, and diners collect at its new location", () => {
    const initial = createInitialState();
    const destination = { x: 59, y: 65 };
    const changed = setStorageArea(
      initial,
      {
        ...initial.storage.areas[0]!,
        origin: destination,
        capacity: 12,
        target: 12,
      },
      "storage-1",
    );
    expect(changed.code).toBe("accepted");
    expect(changed.state.routines.pantryMeals).toBe(0);
    expect(
      changed.state.objects.items.find((item) => item.id === "pantry-meals")
        ?.location,
    ).toEqual({ kind: "ground", position: { x: 58, y: 67 } });
    let state = changed.state;
    for (let tick = 0; tick < 180 && servingMealCount(state) === 0; tick += 1) {
      state = advanceSimulation(state);
      if (tick % 10 === 0) {
        const loaded = loadGameState({
          getItem: () => JSON.stringify(state),
          setItem: () => {},
        });
        expect(loaded.status).toBe("loaded");
        if (loaded.status === "loaded")
          expect(advanceSimulation(loaded.state)).toEqual(
            advanceSimulation(state),
          );
      }
    }
    expect(servingMealCount(state)).toBe(12);
    expect(state.objectOrders[0]).toMatchObject({
      destination,
      phase: "completed",
    });
    expect(
      state.objects.items
        .filter((item) => item.kind === "meals")
        .reduce((sum, item) => sum + item.quantity, 0),
    ).toBe(108);
    const person = state.personnel[0]!;
    state = {
      ...state,
      personnel: state.personnel.map((candidate) =>
        candidate.id === person.id
          ? { ...candidate, needs: { ...candidate.needs, satiety: 10 } }
          : candidate,
      ),
      world: {
        ...state.world,
        positions: { ...state.world.positions, [person.id]: destination },
      },
    };
    state = advanceSimulation(state);
    expect(
      state.objects.items.some(
        (item) =>
          item.kind === "meals" &&
          item.location.kind === "carried" &&
          item.location.personId === person.id,
      ),
    ).toBe(true);
    expect(state.personnel[0]!.needs.satiety).toBeLessThan(10);
    expect(mealCollectionPoint(state, destination)).toEqual(destination);
  });
  it("reserves incoming capacity and protects committed areas and source targets", () => {
    const initial = createInitialState();
    const policy = {
      ...initial.storage.areas[0]!,
      origin: { x: 59, y: 65 },
      capacity: 8,
      target: 8,
    };
    const changed = setStorageArea(initial, policy, "storage-1").state;
    const queued = discoverStorageWork(changed);
    expect(incomingQuantity(queued, queued.storage.areas[0]!)).toBe(8);
    expect(discoverStorageWork(queued).objectOrders).toHaveLength(1);
    expect(
      orderObjectMove(queued, "stock-meals", policy.origin, "north", false, 1)
        .code,
    ).toBe("occupied");
    expect(
      setStorageArea(
        queued,
        { ...policy, origin: { x: 59, y: 67 } },
        "storage-1",
      ).code,
    ).toBe("busy");
    expect(removeStorageArea(queued, "storage-1").code).toBe("busy");
    const protectedState = {
      ...changed,
      storage: {
        ...changed.storage,
        areas: changed.storage.areas.map((area) =>
          area.id === "storage-3" ? { ...area, target: 72 } : area,
        ),
      },
      objects: {
        ...changed.objects,
        items: changed.objects.items.filter(
          (item) => item.id !== "pantry-meals",
        ),
      },
    };
    const blocked = discoverStorageWork(protectedState);
    expect(blocked.objectOrders).toHaveLength(0);
    expect(blocked.storage.blockedReasons["storage-1"]).toContain(
      "No available source",
    );
  });
  it("validates filters, capacities, floor footprints and installed furniture", () => {
    const state = createInitialState();
    const policy = { ...state.storage.areas[0]!, origin: { x: 59, y: 65 } };
    expect(setStorageArea(state, { ...policy, target: 100 }).code).toBe(
      "invalid-policy",
    );
    expect(setStorageArea(state, { ...policy, accepts: [] }).code).toBe(
      "invalid-policy",
    );
    expect(
      setStorageArea(state, { ...policy, origin: { x: 48, y: 50 } }).code,
    ).toBe("invalid-floor");
    expect(
      setStorageArea(state, { ...policy, origin: { x: 50, y: 67 } }).code,
    ).toBe("occupied");
    expect(
      setStorageArea(state, {
        ...policy,
        origin: state.storage.areas[0]!.origin,
      }).code,
    ).toBe("overlap");
    expect(
      orderObjectMove(
        state,
        "stock-materials",
        state.storage.areas[0]!.origin,
        "north",
        false,
        1,
      ).code,
    ).toBe("occupied");
    expect(
      orderObjectMove(state, "spare-bed", { x: 57, y: 67 }, "east", true).code,
    ).toBe("occupied");
  });
  it("rejects corrupt storage policies and overlapping saved areas", () => {
    const state = createInitialState();
    for (const patch of [
      { target: 1001 },
      { capacity: -1 },
      { capacity: 25 },
      { accepts: ["unknown"] },
      { origin: { x: 67, y: 68 } },
    ]) {
      const value = {
        ...state,
        storage: {
          ...state.storage,
          areas: state.storage.areas.map((area, index) =>
            index === 0 ? { ...area, ...patch } : area,
          ),
        },
      };
      expect(
        loadGameState({
          getItem: () => JSON.stringify(value),
          setItem: () => {},
        }).status,
      ).toBe("invalid");
    }
  });
  it("saves a manual meal reservation and cancellation before a simulation tick", () => {
    const initial = createInitialState();
    const ordered = orderObjectMove(
      initial,
      "pantry-meals",
      { x: 59, y: 65 },
      "north",
      false,
      10,
    ).state;
    expect(ordered.routines.pantryMeals).toBe(26);
    expect(
      loadGameState({
        getItem: () => JSON.stringify(ordered),
        setItem: () => {},
      }).status,
    ).toBe("loaded");
    const cancelled = cancelObjectMove(ordered, ordered.objectOrders[0]!.id);
    expect(cancelled.routines.pantryMeals).toBe(36);
    expect(
      loadGameState({
        getItem: () => JSON.stringify(cancelled),
        setItem: () => {},
      }).status,
    ).toBe("loaded");
  });
  it("merges compatible stacks without consuming reserved or differently conditioned stock", () => {
    const initial = createInitialState();
    const item = initial.objects.items.find(
      (item) => item.id === "stock-meals",
    )!;
    const store: ObjectStore = {
      nextId: 10,
      items: [
        { ...item, id: "one", quantity: 2 },
        { ...item, id: "two", quantity: 3 },
        { ...item, id: "reserved", quantity: 4, reservedBy: "job" },
        { ...item, id: "damaged", quantity: 5, condition: 50 },
      ],
    };
    const merged = mergeGroundStack(store, "one");
    expect(merged.items.find((item) => item.id === "one")?.quantity).toBe(5);
    expect(merged.items.find((item) => item.id === "two")?.location.kind).toBe(
      "consumed",
    );
    expect(merged.items.find((item) => item.id === "reserved")?.quantity).toBe(
      4,
    );
    expect(merged.items.find((item) => item.id === "damaged")?.quantity).toBe(
      5,
    );
    expect(merged.items.reduce((sum, item) => sum + item.quantity, 0)).toBe(14);
    const reserved = reserveSupply(
      merged,
      "meals",
      6,
      { x: 65, y: 68 },
      "test",
    );
    expect(reserved.objectId).toBeNull();
    expect(reserved.store).toBe(merged);
  });
  it("does not overdraw a source area's target across competing destinations", () => {
    const initial = createInitialState();
    const source = { ...initial.storage.areas[2]!, target: 60 };
    const first = {
      ...initial.storage.areas[0]!,
      id: "storage-4",
      name: "First",
      origin: { x: 59, y: 65 },
      target: 12,
      capacity: 12,
    };
    const second = {
      ...first,
      id: "storage-5",
      name: "Second",
      origin: { x: 59, y: 67 },
    };
    const state = {
      ...initial,
      storage: {
        ...initial.storage,
        nextId: 6,
        areas: [first, second, source],
      },
      objects: {
        ...initial.objects,
        items: initial.objects.items.filter(
          (item) => item.id !== "pantry-meals",
        ),
      },
    };
    const queued = discoverStorageWork(state);
    expect(queued.objectOrders).toHaveLength(1);
    expect(
      queued.objects.items
        .filter((item) => item.kind === "meals" && !item.reservedBy)
        .reduce((sum, item) => sum + item.quantity, 0),
    ).toBe(60);
  });
  it("reports blocked access and respects disabled stocking", () => {
    const initial = createInitialState();
    const area = {
      ...initial.storage.areas[0]!,
      origin: { x: 59, y: 65 },
      target: 12,
    };
    const state = setStorageArea(initial, area, area.id).state;
    const tiles = [...state.world.map.tiles];
    for (const position of [
      { x: 58, y: 65 },
      { x: 60, y: 65 },
      { x: 59, y: 64 },
      { x: 59, y: 66 },
    ])
      tiles[position.y * 128 + position.x] = "wall";
    const blocked = discoverStorageWork({
      ...state,
      world: { ...state.world, map: { ...state.world.map, tiles } },
    });
    expect(blocked.objectOrders).toEqual([]);
    expect(blocked.storage.blockedReasons[area.id]).toContain("unreachable");
    const disabled = setStorageArea(
      state,
      { ...area, enabled: false },
      area.id,
    ).state;
    expect(discoverStorageWork(disabled).objectOrders).toEqual([]);
  });
  it("derives meal availability from designated stacks rather than room coordinates", () => {
    const initial = createInitialState();
    expect(servingMealCount(initial)).toBe(36);
    expect(mealCollectionPoint(initial, { x: 57, y: 67 })).toEqual({
      x: 58,
      y: 67,
    });
    const destination = { x: 59, y: 65 };
    const moved = {
      ...initial,
      storage: {
        ...initial.storage,
        areas: initial.storage.areas.map((area) =>
          area.serveMeals ? { ...area, origin: destination } : area,
        ),
      },
      objects: {
        ...initial.objects,
        items: initial.objects.items.map((item) =>
          item.id === "pantry-meals"
            ? {
                ...item,
                location: { kind: "ground" as const, position: destination },
              }
            : item,
        ),
      },
    };
    expect(mealCollectionPoint(moved, { x: 57, y: 67 })).toEqual(destination);
    expect(servingMealCount(moved)).toBe(36);
    expect(storageQuantity(moved, moved.storage.areas[0]!)).toBe(36);
    expect(
      servingMealCount({
        ...moved,
        storage: {
          ...moved.storage,
          areas: moved.storage.areas.map((area) => ({
            ...area,
            enabled: false,
          })),
        },
      }),
    ).toBe(0);
  });
});
