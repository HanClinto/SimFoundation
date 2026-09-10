import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation_legacy/state";
import {
  interactionOptions,
  performInteraction,
} from "../src/simulation_legacy/interactions";
import { goHere } from "../src/simulation_legacy/direct-control";
import {
  draftResponder,
  startEncounter,
  advanceCombat,
} from "../src/simulation_legacy/combat";
import { advanceSimulation } from "../src/simulation_legacy/tick";
import { createController } from "../src/application/legacy/controller";
import { expeditionMapController } from "../src/adapters/browser_legacy/expedition-controller";
import {
  fieldState,
  storeFieldState,
} from "../src/simulation_legacy/expeditions";
import { loadGameState } from "../src/adapters/browser_legacy/game-persistence";
import { requestAssessment } from "../src/simulation_legacy/clinical";

it("cancels manual travel without teleporting or resetting action recovery", () => {
  const initial = createInitialState();
  const id = initial.personnel[0]!.id;
  const moving = goHere(initial, initial.world.map.id, id, {
    x: 60,
    y: 59,
  }).state;
  const state = {
    ...moving,
    combat: {
      ...moving.combat,
      responders: {
        ...moving.combat.responders,
        [id]: {
          ...moving.combat.responders[id]!,
          phase: "recovering" as const,
          remaining: 3,
          ammunition: 7,
        },
      },
    },
  };
  const result = performInteraction(state, {
    mapId: state.world.map.id,
    actorId: id,
    action: "cancel",
  });
  expect(result.reason).toBeNull();
  expect(result.state.world).toEqual(state.world);
  expect(result.state.combat.responders[id]).toMatchObject({
    order: "hold",
    destination: null,
    phase: "recovering",
    remaining: 3,
    ammunition: 7,
    returnToAutonomy: true,
  });
});

it("offers only implemented target interactions with authoritative disabled reasons", () => {
  const state = createInitialState();
  const id = state.personnel[0]!.id;
  expect(
    interactionOptions(state, state.world.map.id, id, "object:spare-bed"),
  ).toMatchObject([
    {
      action: "sleep",
      reason: "Choose an installed, serviceable bed or seat.",
    },
  ]);
  expect(
    interactionOptions(state, state.world.map.id, id, "SCP-049-2").find(
      (option) => option.action === "engage",
    ),
  ).toMatchObject({
    action: "engage",
    reason: "No active adversary at this location.",
  });
  expect(
    interactionOptions(
      state,
      state.world.map.id,
      id,
      state.personnel[1]!.id,
    )[0],
  ).toMatchObject({
    action: "stabilize",
    reason: "No casualty at this location.",
  });
  expect(
    performInteraction(state, { mapId: "stale", actorId: id, action: "hold" })
      .state,
  ).toBe(state);
  const held = performInteraction(state, {
    mapId: state.world.map.id,
    actorId: id,
    action: "hold",
  });
  expect(held.reason).toBeNull();
  expect(held.state.combat.responders[id]!.returnToAutonomy).toBe(false);
  expect(
    performInteraction(draftResponder(state, id, true).state, {
      mapId: state.world.map.id,
      actorId: id,
      action: "cancel",
    }).reason,
  ).toBe("No current personal action to cancel.");
});

it("stabilizes through physical treatment, preserves spent kits on cancellation and resumes temporary autonomy", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const patientId = initial.personnel[1]!.id;
  const drafted = draftResponder(initial, patientId, true).state;
  let state = {
    ...drafted,
    world: {
      ...drafted.world,
      positions: {
        ...drafted.world.positions,
        [patientId]: { ...drafted.world.positions[actorId]! },
      },
    },
    combat: {
      ...drafted.combat,
      responders: {
        ...drafted.combat.responders,
        [patientId]: {
          ...drafted.combat.responders[patientId]!,
          health: 80,
          injuries: 1,
        },
      },
    },
  };
  const request = {
    mapId: state.world.map.id,
    actorId,
    targetId: patientId,
    action: "stabilize" as const,
  };
  const issued = performInteraction(state, request);
  expect(issued.reason).toBeNull();
  expect(issued.state.world).toEqual(state.world);
  state = issued.state;
  expect(
    loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} })
      .status,
  ).toBe("loaded");
  expect(state.combat.responders[actorId]).toMatchObject({
    returnToAutonomy: true,
    medicalSupplies: 2,
  });
  const preparing = advanceSimulation(state);
  expect(preparing.combat.responders[actorId]!.phase).toBe("preparing");
  const cancelled = performInteraction(preparing, {
    ...request,
    action: "cancel",
  }).state;
  expect(cancelled.combat.responders[actorId]).toMatchObject({
    medicalSupplies: 2,
    order: "hold",
    returnToAutonomy: true,
  });
  for (
    let step = 0;
    step < 15 && !state.combat.responders[patientId]!.stabilized;
    step += 1
  )
    state = advanceSimulation(state);
  expect(state.combat.responders[patientId]!.stabilized).toBe(true);
  expect(state.combat.responders[actorId]).toMatchObject({
    medicalSupplies: 1,
    phase: "recovering",
    remaining: 2,
  });
  state = performInteraction(state, { ...request, action: "cancel" }).state;
  expect(state.combat.responders[actorId]).toMatchObject({
    medicalSupplies: 1,
    phase: "recovering",
    remaining: 2,
  });
  for (let step = 0; step < 3; step += 1) state = advanceSimulation(state);
  expect(state.combat.responders[actorId]!.drafted).toBe(false);
  expect(
    loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} })
      .status,
  ).toBe("loaded");
});

it("protects clinical commitments and cargo without mutating preview state", () => {
  const state = advanceSimulation(
    requestAssessment(createInitialState(), "person-caleb-ward", "mood"),
  );
  const request = {
    mapId: state.world.map.id,
    actorId: "person-caleb-ward",
    action: "hold" as const,
  };
  expect(performInteraction(state, request)).toEqual({
    state,
    reason: "Finish the active clinical appointment first.",
  });
  const carried = {
    ...state,
    objects: {
      ...state.objects,
      items: state.objects.items.map((item) =>
        item.id === "stock-meals"
          ? {
              ...item,
              location: { kind: "carried" as const, personId: request.actorId },
            }
          : item,
      ),
    },
  };
  expect(performInteraction(carried, request)).toEqual({
    state: carried,
    reason: "Finish the reserved cargo delivery first.",
  });
  const controller = createController(createInitialState());
  const before = controller.getSnapshot();
  expect(controller.previewInteraction(request)).toBeNull();
  controller.interactions(
    request.mapId,
    request.actorId,
    "tile:60,59:structure",
  );
  expect(controller.getSnapshot()).toEqual(before);
});

it("engages from the existing position and reports exhausted supplies without granting approach", () => {
  const actorId = "person-caleb-ward";
  const otherId = "person-lena-ortiz";
  let state = createInitialState();
  state = {
    ...state,
    world: {
      ...state.world,
      positions: {
        ...state.world.positions,
        [actorId]: { x: 68, y: 55 },
        [otherId]: { x: 68, y: 56 },
      },
    },
  };
  state = draftResponder(
    draftResponder(state, actorId, true).state,
    otherId,
    true,
  ).state;
  const encounter = startEncounter(state, { x: 72, y: 55 });
  expect(encounter.code).toBe("accepted");
  const request = {
    mapId: state.world.map.id,
    actorId,
    targetId: "SCP-049-2",
    action: "engage" as const,
  };
  const issued = performInteraction(encounter.state, request);
  expect(issued.reason).toBeNull();
  expect(issued.state.world).toEqual(state.world);
  const preparing = advanceCombat(issued.state);
  expect(preparing.world.positions[actorId]).toEqual(
    state.world.positions[actorId],
  );
  expect(preparing.combat.responders[actorId]!.phase).toBe("preparing");
  const empty = {
    ...preparing,
    combat: {
      ...preparing.combat,
      responders: {
        ...preparing.combat.responders,
        [actorId]: { ...preparing.combat.responders[actorId]!, ammunition: 0 },
      },
    },
  };
  expect(performInteraction(empty, request)).toEqual({
    state: empty,
    reason: "No ammunition remaining.",
  });
  expect(
    performInteraction(preparing, { ...request, targetId: "stale-target" })
      .state,
  ).toBe(preparing);
});

it("revalidates field cargo reservations and cancels recovery with physical put-down and local result projection", () => {
  let controller = createController(createInitialState());
  const team = ["person-caleb-ward", "person-lena-ortiz"];
  controller.enlistExpedition("notice-depot", team);
  controller.advance(100);
  controller.dispatchExpedition();
  controller.advance(30);
  const arrived = controller.getSnapshot().game;
  const field = fieldState(arrived)!;
  const objectId = `${arrived.expeditions.active!.id}-archive`;
  const item = field.objects.items.find((item) => item.id === objectId)!;
  expect(item.location.kind).toBe("ground");
  controller = createController(
    storeFieldState(arrived, {
      ...field,
      world: {
        ...field.world,
        positions: {
          ...field.world.positions,
          [team[0]!]:
            item.location.kind === "ground"
              ? item.location.position
              : { x: 4, y: 12 },
        },
      },
      combat: {
        ...field.combat,
        status: "neutralized",
        adversary: {
          ...field.combat.adversary!,
          health: 0,
          phase: "ready",
          remaining: 0,
        },
      },
    }),
  );
  const local = expeditionMapController(controller);
  const request = {
    mapId: field.world.map.id,
    actorId: team[0]!,
    targetId: `object:${objectId}`,
    action: "recover" as const,
  };
  const before = controller.getSnapshot();
  expect(
    local.interactions(request.mapId, request.actorId, request.targetId)[0]
      ?.reason,
  ).toBeNull();
  expect(controller.getSnapshot()).toEqual(before);
  const issued = local.interact(request);
  expect(issued.reason).toBeNull();
  expect(issued.snapshot.game.world.map.id).toBe(request.mapId);
  expect(local.interact({ ...request, actorId: team[1]! }).reason).toBe(
    "This object is reserved or being carried.",
  );
  expect(local.previewInteraction({ ...request, action: "hold" })).toContain(
    "cargo recovery",
  );
  controller.advance(7);
  const carrying = local.getSnapshot().game;
  expect(
    carrying.objects.items.find((item) => item.id === objectId)!.location,
  ).toEqual({ kind: "carried", personId: request.actorId });
  const cancelled = local.interact({ ...request, action: "cancel" });
  expect(cancelled.reason).toBeNull();
  expect(
    cancelled.snapshot.game.objects.items.find((item) => item.id === objectId),
  ).toMatchObject({
    reservedBy: null,
    location: {
      kind: "ground",
      position: carrying.world.positions[request.actorId],
    },
  });
  expect(
    cancelled.snapshot.game.combat.responders[request.actorId]!.ammunition,
  ).toBe(carrying.combat.responders[request.actorId]!.ammunition);
  expect(
    controller.getSnapshot().game.expeditions.active!.recoveryOrders,
  ).toEqual([]);
  expect(
    controller
      .getSnapshot()
      .game.objects.items.some((item) => item.id === objectId),
  ).toBe(false);
  expect(
    loadGameState({
      getItem: () => JSON.stringify(controller.getSnapshot().game),
      setItem: () => {},
    }).status,
  ).toBe("loaded");
  expect(
    local.interact({ ...request, mapId: "disposed-field" }).reason,
  ).toContain("no longer on this map");
});
