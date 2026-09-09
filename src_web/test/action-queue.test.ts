import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import { submitAction, editActionQueue } from "../src/simulation/action-queue";
import { advanceSimulation } from "../src/simulation/tick";
import { createController } from "../src/application/controller";
import { setSurface } from "../src/simulation/materials";
import { fieldState, storeFieldState } from "../src/simulation/expeditions";
import { expeditionMapController } from "../src/adapters/browser/expedition-controller";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { draftResponder } from "../src/simulation/combat";

const load = (state: ReturnType<typeof createInitialState>) =>
  loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} });

it("reorders pending IDs without interrupting execution, reserving resources, or accepting stale IDs", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const intent = {
    mapId: initial.world.map.id,
    actorId,
    action: "move" as const,
    destination: { x: 60, y: 59 },
  };
  let state = submitAction(initial, intent).state;
  for (let offset = 0; offset < 3; offset += 1)
    state = submitAction(state, {
      ...intent,
      destination: { x: 60 + offset, y: 59 },
    }).state;
  const queue = state.actionQueues[actorId]!;
  const [first, second, third] = queue.pending;
  const result = editActionQueue(
    state,
    intent.mapId,
    actorId,
    "reorder",
    third!.sequence,
    first!.sequence,
  );
  expect(result.reason).toBeNull();
  expect(result.state.actionQueues[actorId]!.pending).toEqual([
    third,
    first,
    second,
  ]);
  expect(result.state.actionQueues[actorId]!.current).toBe(queue.current);
  expect(result.state.world).toBe(state.world);
  expect(result.state.combat).toBe(state.combat);
  expect(result.state.objects).toBe(state.objects);
  expect(load(result.state).status).toBe("loaded");
  expect(
    editActionQueue(
      state,
      intent.mapId,
      actorId,
      "reorder",
      queue.current.intent.sequence,
    ).state,
  ).toBe(state);
  expect(
    editActionQueue(
      state,
      intent.mapId,
      actorId,
      "reorder",
      first!.sequence,
      999,
    ).reason,
  ).toContain("no longer");
  expect(
    editActionQueue(
      result.state,
      intent.mapId,
      actorId,
      "reorder",
      third!.sequence,
    ).state.actionQueues[actorId]!.pending,
  ).toEqual(queue.pending);
});

it("appends movement without replacing the current order and starts the next only after arrival", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const origin = initial.world.positions[actorId]!;
  const first = {
    mapId: initial.world.map.id,
    actorId,
    action: "move" as const,
    destination: { x: origin.x + 1, y: origin.y },
  };
  let state = submitAction(initial, first).state;
  const second = { ...first, destination: origin };
  state = submitAction(state, second).state;
  expect(state.combat.responders[actorId]!.destination).toEqual(
    first.destination,
  );
  expect(state.actionQueues[actorId]!.pending).toMatchObject([second]);
  expect(load(state).status).toBe("loaded");
  expect(advanceSimulation(JSON.parse(JSON.stringify(state)))).toEqual(
    advanceSimulation(state),
  );
  state = advanceSimulation(state);
  expect(state.world.positions[actorId]).toEqual(first.destination);
  expect(state.combat.responders[actorId]!.destination).toEqual(origin);
  state = advanceSimulation(state);
  expect(state.actionQueues[actorId]).toBeUndefined();
  expect(state.combat.responders[actorId]!.returnToAutonomy).toBe(true);
  expect(advanceSimulation(state).combat.responders[actorId]!.drafted).toBe(
    false,
  );
});

it("retains failed starts for retry/cancel and bounds pending actions without reservations", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const intent = {
    mapId: initial.world.map.id,
    actorId,
    action: "move" as const,
    destination: { x: 60, y: 59 },
  };
  let state = submitAction(initial, intent).state;
  for (let count = 0; count < 7; count += 1)
    state = submitAction(state, intent).state;
  expect(submitAction(state, intent).reason).toContain("full");
  expect(state.objects).toEqual(initial.objects);
  state = editActionQueue(state, intent.mapId, actorId, "clear").state;
  expect(state.actionQueues[actorId]!.pending).toEqual([]);
});

it("blocks failed starts until Retry or Cancel instead of skipping to pending work", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const origin = initial.world.positions[actorId]!;
  const destination = { x: origin.x + 1, y: origin.y };
  const intent = {
    mapId: initial.world.map.id,
    actorId,
    action: "move" as const,
    destination,
  };
  const wall = {
    ...initial,
    world: {
      ...initial.world,
      map: setSurface(initial.world.map, destination, "structure", {
        kind: "wall" as const,
        material: "steel" as const,
        integrity: 100,
      }),
    },
  };
  let state = submitAction(wall, intent).state;
  state = submitAction(state, { ...intent, destination: origin }).state;
  expect(state.actionQueues[actorId]!.current).toMatchObject({
    started: false,
    blockedReason: "No reachable route to this tile.",
  });
  state = { ...state, world: { ...state.world, map: initial.world.map } };
  state = advanceSimulation(state);
  expect(state.actionQueues[actorId]!.current.started).toBe(false);
  expect(state.actionQueues[actorId]!.pending).toHaveLength(1);
  expect(load(state).status).toBe("loaded");
  state = editActionQueue(state, intent.mapId, actorId, "retry").state;
  expect(state.actionQueues[actorId]!.current.started).toBe(true);
  expect(state.combat.responders[actorId]!.destination).toEqual(destination);
});

it("Do Now keeps pending work and action recovery, and stale pending IDs cannot cancel another action", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const origin = initial.world.positions[actorId]!;
  const intent = {
    mapId: initial.world.map.id,
    actorId,
    action: "move" as const,
    destination: { x: origin.x + 1, y: origin.y },
  };
  let state = submitAction(initial, intent).state;
  state = submitAction(state, { ...intent, destination: origin }).state;
  const pending = state.actionQueues[actorId]!.pending[0]!;
  state = {
    ...state,
    combat: {
      ...state.combat,
      responders: {
        ...state.combat.responders,
        [actorId]: {
          ...state.combat.responders[actorId]!,
          phase: "recovering",
          remaining: 3,
          ammunition: 7,
        },
      },
    },
  };
  state = submitAction(
    state,
    { ...intent, destination: { x: origin.x + 2, y: origin.y } },
    "now",
  ).state;
  expect(state.actionQueues[actorId]!.pending).toEqual([pending]);
  expect(state.actionQueues[actorId]!.current.started).toBe(false);
  expect(state.combat.responders[actorId]).toMatchObject({
    phase: "recovering",
    remaining: 3,
    ammunition: 7,
  });
  expect(load(state).status).toBe("loaded");
  state = advanceSimulation(state);
  expect(state.world.positions[actorId]).toEqual(origin);
  state = editActionQueue(
    state,
    intent.mapId,
    actorId,
    "remove",
    pending.sequence,
  ).state;
  const reissued = submitAction(state, intent).state;
  expect(
    editActionQueue(
      reissued,
      intent.mapId,
      actorId,
      "remove",
      pending.sequence,
    ),
  ).toEqual({
    state: reissued,
    reason: "This pending action no longer exists.",
  });
  expect(reissued.actionQueues[actorId]!.pending).toHaveLength(1);
});

it("replaces idle Hold and invalidates queued intentions when an inspector or mission takes ownership", () => {
  const controller = createController(createInitialState());
  const actorId = "person-caleb-ward";
  const mapId = controller.getSnapshot().game.world.map.id;
  controller.queueAction({ mapId, actorId, action: "hold" });
  controller.queueAction({
    mapId,
    actorId,
    action: "move",
    destination: { x: 60, y: 59 },
  });
  expect(
    controller.getSnapshot().game.actionQueues[actorId]!.current.intent.action,
  ).toBe("move");
  expect(controller.getSnapshot().game.actionQueues[actorId]!.pending).toEqual(
    [],
  );
  controller.orderResponder(actorId, "hold");
  expect(controller.getSnapshot().game.actionQueues[actorId]).toBeUndefined();
  controller.queueAction({
    mapId,
    actorId,
    action: "move",
    destination: { x: 60, y: 59 },
  });
  controller.enlistExpedition("notice-depot", [actorId, "person-lena-ortiz"]);
  expect(controller.getSnapshot().game.actionQueues[actorId]).toBeUndefined();
  expect(
    controller.queueAction({ mapId, actorId, action: "hold" }).reason,
  ).toContain("Expedition");
  expect(load(controller.getSnapshot().game).status).toBe("loaded");
});

it("reserves field cargo only when its entry starts and safely puts down cancelled cargo", () => {
  let controller = createController(createInitialState());
  const actorId = "person-caleb-ward";
  controller.enlistExpedition("notice-depot", [actorId, "person-lena-ortiz"]);
  controller.advance(100);
  controller.dispatchExpedition();
  const arrived = controller.advance(30).game;
  const field = fieldState(arrived)!;
  const archive = field.objects.items.find(
    (item) => item.kind === "archive-case",
  )!;
  const specimen = field.objects.items.find(
    (item) => item.kind === "anomaly-case",
  )!;
  controller = createController(
    storeFieldState(arrived, {
      ...field,
      world: {
        ...field.world,
        positions: {
          ...field.world.positions,
          [actorId]:
            archive.location.kind === "ground"
              ? archive.location.position
              : { x: 14, y: 8 },
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
  const intent = {
    mapId: field.world.map.id,
    actorId,
    action: "recover" as const,
    targetId: `object:${archive.id}`,
  };
  local.queueAction(intent);
  local.queueAction({ ...intent, targetId: `object:${specimen.id}` });
  expect(
    local
      .getSnapshot()
      .game.objects.items.find((item) => item.id === specimen.id)!.reservedBy,
  ).toBeNull();
  expect(load(controller.getSnapshot().game).status).toBe("loaded");
  controller.advance(7);
  const carrying = local.getSnapshot().game;
  expect(
    carrying.objects.items.find((item) => item.id === archive.id)!.location
      .kind,
  ).toBe("carried");
  const cancelled = local.editQueue(intent.mapId, actorId, "cancel");
  expect(cancelled.reason).toBeNull();
  expect(cancelled.snapshot.game.world.map.id).toBe(intent.mapId);
  expect(
    cancelled.snapshot.game.objects.items.find(
      (item) => item.id === archive.id,
    ),
  ).toMatchObject({
    reservedBy: null,
    location: { kind: "ground", position: carrying.world.positions[actorId] },
  });
  expect(
    cancelled.snapshot.game.objects.items.find(
      (item) => item.id === specimen.id,
    )!.reservedBy,
  ).toBe(`recovery-${actorId}`);
  expect(
    controller
      .getSnapshot()
      .game.objects.items.some((item) => item.id === archive.id),
  ).toBe(false);
  expect(load(controller.getSnapshot().game).status).toBe("loaded");
});

it("finishes stabilization and recovery before starting the next intention, spending only one kit", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const patientId = initial.personnel[1]!.id;
  const origin = initial.world.positions[actorId]!;
  const drafted = draftResponder(initial, patientId, true).state;
  let state = {
    ...drafted,
    world: {
      ...drafted.world,
      positions: { ...drafted.world.positions, [patientId]: origin },
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
  state = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "stabilize",
    targetId: patientId,
  }).state;
  state = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "move",
    destination: { x: origin.x + 1, y: origin.y },
  }).state;
  for (
    let step = 0;
    step < 15 && !state.combat.responders[patientId]!.stabilized;
    step += 1
  )
    state = advanceSimulation(state);
  expect(state.combat.responders[actorId]).toMatchObject({
    phase: "recovering",
    remaining: 2,
    medicalSupplies: 1,
  });
  expect(state.actionQueues[actorId]!.pending).toHaveLength(1);
  state = advanceSimulation(state);
  expect(state.world.positions[actorId]).toEqual(origin);
  expect(state.actionQueues[actorId]!.current.intent.action).toBe("stabilize");
  state = advanceSimulation(state);
  expect(state.actionQueues[actorId]!.current.intent.action).toBe("move");
  expect(state.combat.responders[actorId]!.medicalSupplies).toBe(1);
  expect(load(state).status).toBe("loaded");
  state = advanceSimulation(state);
  expect(state.actionQueues[actorId]).toBeUndefined();
  expect(advanceSimulation(state).combat.responders[actorId]!.drafted).toBe(
    false,
  );
});
