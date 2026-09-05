import { describe, expect, it } from "vitest";
import {
  consumeObject,
  objectFootprint,
  pickUpObject,
  putDownObject,
  reserveStack,
  type ObjectStore,
} from "../src/simulation/objects";
import { createInitialState } from "../src/simulation/state";
import { advanceSimulation } from "../src/simulation/tick";
import {
  orderObjectMove,
  cancelObjectMove,
} from "../src/simulation/object-work";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { orderSurfaceWork } from "../src/simulation/environment";
import { createController } from "../src/application/controller";
import { advanceRoutines } from "../src/simulation/routines";
import { observeSite } from "../src/simulation/observations";
import { observedSnapshot } from "../src/adapters/browser/observed-view";

const stock = (): ObjectStore => ({
  nextId: 1,
  items: [
    {
      id: "stock",
      kind: "materials",
      quantity: 20,
      condition: 100,
      orientation: "north",
      installed: false,
      reservedBy: null,
      location: { kind: "ground", position: { x: 5, y: 5 } },
    },
  ],
});
describe("physical objects", () => {
  it("keeps supplies clear of installed furniture and carries a meal before eating", () => {
    const initial = createInitialState();
    expect(
      orderObjectMove(initial, "spare-meal-seat", { x: 67, y: 68 }, "north")
        .code,
    ).toBe("occupied");
    const person = initial.personnel[0]!;
    let state: ReturnType<typeof createInitialState> = {
      ...initial,
      personnel: initial.personnel.map((candidate) =>
        candidate.id === person.id
          ? { ...candidate, needs: { ...candidate.needs, satiety: 10 } }
          : candidate,
      ),
      world: {
        ...initial.world,
        positions: {
          ...initial.world.positions,
          [person.id]: { x: 58, y: 67 },
        },
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
    for (
      let tick = 0;
      tick < 8 && state.personnel[0]!.needs.satiety < 10;
      tick += 1
    )
      state = advanceSimulation(state);
    expect(state.personnel[0]!.needs.satiety).toBeGreaterThan(10);
    expect(
      state.objects.items.some(
        (item) =>
          item.kind === "meals" &&
          item.location.kind === "carried" &&
          item.location.personId === person.id,
      ),
    ).toBe(false);
  });
  it("never selects an installation work face inside the destination footprint", () => {
    const state = createInitialState();
    const tiles = [...state.world.map.tiles];
    for (const position of [
      { x: 54, y: 58 },
      { x: 53, y: 59 },
      { x: 54, y: 60 },
    ])
      tiles[position.y * 128 + position.x] = "wall";
    expect(
      orderObjectMove(
        {
          ...state,
          world: { ...state.world, map: { ...state.world.map, tiles } },
        },
        "spare-bed",
        { x: 54, y: 59 },
        "east",
      ).code,
    ).toBe("unreachable");
  });
  it("does not move remembered objects until they are observed again", () => {
    let state = createInitialState();
    state = observeSite({
      ...state,
      world: {
        ...state.world,
        positions: {
          ...state.world.positions,
          "person-mara-voss": { x: 50, y: 67 },
        },
      },
    });
    const remembered = state.observations.objects["bed-1"]!;
    expect(remembered).toBeDefined();
    const moved = {
      ...state,
      objects: {
        ...state.objects,
        items: state.objects.items.map((item) =>
          item.id === "bed-1"
            ? {
                ...item,
                location: {
                  kind: "ground" as const,
                  position: { x: 54, y: 59 },
                },
              }
            : item,
        ),
      },
    };
    const projected = observedSnapshot({ game: moved, running: false });
    expect(
      projected.game.objects.items.find((item) => item.id === "bed-1")
        ?.location,
    ).toEqual(remembered.object.location);
  });
  it("rejects duplicate object identity, quantity creation and invalid carrier ownership", () => {
    const state = createInitialState();
    const item = state.objects.items[0]!;
    for (const objects of [
      { ...state.objects, items: [...state.objects.items, item] },
      {
        ...state.objects,
        items: state.objects.items.map((candidate) =>
          candidate.id === "stock-materials"
            ? { ...candidate, quantity: 161 }
            : candidate,
        ),
      },
      {
        ...state.objects,
        items: state.objects.items.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                installed: false,
                location: { kind: "carried", personId: "missing" },
                reservedBy: "missing-job",
              }
            : candidate,
        ),
      },
    ])
      expect(
        loadGameState({
          getItem: () => JSON.stringify({ ...state, objects }),
          setItem: () => {},
        }).status,
      ).toBe("invalid");
  });
  it("waits for an occupied bed and cannot be forced through its use reservation", () => {
    const initial = createInitialState();
    const person = initial.personnel[0]!;
    const occupied = {
      ...initial,
      world: {
        ...initial.world,
        positions: {
          ...initial.world.positions,
          [person.id]: { x: 50, y: 67 },
        },
      },
      personnel: initial.personnel.map((candidate) =>
        candidate.id === person.id
          ? { ...candidate, needs: { ...candidate.needs, rest: 40 } }
          : candidate,
      ),
      routines: {
        ...initial.routines,
        activities: {
          [person.id]: {
            kind: "sleep" as const,
            stationId: "bed-1",
            progress: 10,
            startedTick: 0,
            mealConsumed: false,
          },
        },
      },
    };
    const controller = createController(
      orderObjectMove(occupied, "bed-1", { x: 54, y: 59 }, "east").state,
    );
    const order = controller.getSnapshot().game.objectOrders[0]!;
    controller.authorizeJob(order.jobId);
    expect(controller.getSnapshot().game.jobs[0]?.status).toBe("proposed");
    const next = controller.advance(5).game;
    expect(next.objectOrders[0]?.phase).toBe("pickup");
    expect(
      next.objects.items.find((item) => item.id === "bed-1")?.installed,
    ).toBe(true);
    expect(next.routines.activities[person.id]?.stationId).toBe("bed-1");
  });
  it("does not restore rest at an unreachable or broken destination", () => {
    const initial = createInitialState();
    const person = initial.personnel[0]!;
    const state = {
      ...initial,
      personnel: initial.personnel.map((candidate) =>
        candidate.id === person.id
          ? { ...candidate, needs: { ...candidate.needs, rest: 10 } }
          : candidate,
      ),
      routines: {
        ...initial.routines,
        activities: {
          [person.id]: {
            kind: "sleep" as const,
            stationId: "bed-1",
            progress: 0,
            startedTick: 0,
            mealConsumed: false,
          },
        },
      },
    };
    const tiles = [...state.world.map.tiles];
    tiles[67 * 128 + 50] = "wall";
    const blocked = advanceRoutines({
      ...state,
      world: { ...state.world, map: { ...state.world.map, tiles } },
    });
    expect(blocked.personnel[0]!.needs.rest).toBe(10);
    expect(blocked.routines.blockedReasons[person.id]).toContain("reachable");
    const broken = advanceRoutines({
      ...state,
      objects: {
        ...state.objects,
        items: state.objects.items.map((item) =>
          item.id === "bed-1" ? { ...item, condition: 0 } : item,
        ),
      },
    });
    expect(broken.personnel[0]!.needs.rest).toBe(10);
    expect(broken.routines.activities[person.id]).toBeUndefined();
  });
  it("uses a relocated supply stack as the next collection destination", () => {
    let state = createInitialState();
    const destination = { x: 66, y: 70 };
    state = orderObjectMove(
      state,
      "stock-materials",
      destination,
      "north",
      false,
    ).state;
    for (
      let tick = 0;
      tick < 180 && state.objectOrders[0]?.phase !== "completed";
      tick += 1
    )
      state = advanceSimulation(state);
    expect(
      state.objects.items.find((item) => item.id === "stock-materials")
        ?.location,
    ).toEqual({ kind: "ground", position: destination });
    const ordered = orderSurfaceWork(
      state,
      { x: 61, y: 54 },
      "structure",
      "steel",
    );
    expect(ordered.code).toBe("accepted");
    expect(ordered.state.jobs.at(-1)?.workSite).toEqual(destination);
    expect(
      loadGameState({
        getItem: () => JSON.stringify(ordered.state),
        setItem: () => {},
      }).status,
    ).toBe("loaded");
  });
  it("relocates an installed bed through pickup, carry and installation, then uses its new location", () => {
    let state = createInitialState();
    const destination = { x: 54, y: 59 };
    const result = orderObjectMove(state, "bed-1", destination, "east");
    expect(result.code).toBe("accepted");
    state = result.state;
    const phases = new Set<string>();
    for (
      let tick = 0;
      tick < 180 && state.objectOrders[0]?.phase !== "completed";
      tick += 1
    ) {
      phases.add(state.objectOrders[0]!.phase);
      state = advanceSimulation(state);
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
    expect(phases).toEqual(new Set(["pickup", "carry", "install"]));
    expect(
      state.objects.items.find((item) => item.id === "bed-1"),
    ).toMatchObject({
      installed: true,
      orientation: "east",
      location: { kind: "ground", position: destination },
    });
    expect(
      state.routines.stations.find((station) => station.id === "bed-1")
        ?.position,
    ).toEqual(destination);
    const person = state.personnel[0]!;
    state = {
      ...state,
      personnel: state.personnel.map((candidate) =>
        candidate.id === person.id
          ? {
              ...candidate,
              needs: { ...candidate.needs, rest: 10 },
              currentJobId: null,
            }
          : candidate,
      ),
      world: {
        ...state.world,
        positions: { ...state.world.positions, [person.id]: destination },
      },
    };
    state = advanceSimulation(state);
    expect(state.routines.activities[person.id]).toMatchObject({
      kind: "sleep",
      stationId: "bed-1",
    });
    expect(state.personnel[0]!.needs.rest).toBeGreaterThan(10);
  }, 20_000);
  it("reserves a destination and can cancel before pickup without moving the object", () => {
    const initial = createInitialState();
    const queued = orderObjectMove(
      initial,
      "spare-bed",
      { x: 54, y: 59 },
      "east",
    ).state;
    expect(
      orderObjectMove(queued, "bed-1", { x: 54, y: 59 }, "east").code,
    ).toBe("occupied");
    const cancelled = cancelObjectMove(queued, queued.objectOrders[0]!.id);
    expect(cancelled.objects.items).toEqual(initial.objects.items);
    expect(cancelled.jobs).toEqual([]);
  });
  it("splits and reserves stacks without duplication and requires physical pickup and delivery", () => {
    const reserved = reserveStack(stock(), "stock", 6, "order");
    expect(
      reserved.store.items.reduce((sum, item) => sum + item.quantity, 0),
    ).toBe(20);
    expect(
      reserveStack(reserved.store, reserved.objectId!, 1, "other").objectId,
    ).toBeNull();
    expect(
      pickUpObject(reserved.store, reserved.objectId!, "order", "worker", {
        x: 20,
        y: 20,
      }),
    ).toBe(reserved.store);
    const carried = pickUpObject(
      reserved.store,
      reserved.objectId!,
      "order",
      "worker",
      { x: 5, y: 5 },
    );
    expect(carried.items.at(-1)?.location).toEqual({
      kind: "carried",
      personId: "worker",
    });
    expect(
      putDownObject(
        carried,
        reserved.objectId!,
        "order",
        "other",
        { x: 9, y: 9 },
        { x: 9, y: 9 },
      ),
    ).toBe(carried);
    const delivered = putDownObject(
      carried,
      reserved.objectId!,
      "order",
      "worker",
      { x: 9, y: 9 },
      { x: 9, y: 9 },
    );
    const consumed = consumeObject(delivered, reserved.objectId!, "order", {
      x: 9,
      y: 9,
    });
    expect(consumed.items.at(-1)?.location.kind).toBe("consumed");
    expect(consumed.items.reduce((sum, item) => sum + item.quantity, 0)).toBe(
      14,
    );
    expect(
      consumeObject(consumed, reserved.objectId!, "order", { x: 9, y: 9 }),
    ).toBe(consumed);
  });
  it("rotates a bed footprint and prevents carrying two objects", () => {
    expect(
      objectFootprint({ kind: "bed", orientation: "east" }, { x: 5, y: 5 }),
    ).toEqual([
      { x: 5, y: 5 },
      { x: 6, y: 5 },
    ]);
    const first = reserveStack(stock(), "stock", 2, "first");
    const second = reserveStack(first.store, "stock", 3, "second");
    const carried = pickUpObject(
      second.store,
      first.objectId!,
      "first",
      "worker",
      { x: 5, y: 5 },
    );
    expect(
      pickUpObject(carried, second.objectId!, "second", "worker", {
        x: 5,
        y: 5,
      }),
    ).toBe(carried);
  });
});
