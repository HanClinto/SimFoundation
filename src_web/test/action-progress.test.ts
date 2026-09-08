import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  actionProgress,
  trackActionTimes,
} from "../src/simulation/action-progress";
import { submitAction } from "../src/simulation/action-queue";
import { findRoute } from "../src/simulation/world";
import { setSurface } from "../src/simulation/materials";
import { createController } from "../src/application/controller";
import { advanceSimulation } from "../src/simulation/tick";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { fieldState } from "../src/simulation/expeditions";
import { setDoorPolicy } from "../src/simulation/world";

const load = (state: ReturnType<typeof createInitialState>) =>
  loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} });

it("reports real remaining route tiles and a missing route instead of zero progress", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const destination = { x: 60, y: 59 };
  const state = trackActionTimes(
    submitAction(initial, {
      mapId: initial.world.map.id,
      actorId,
      action: "move",
      destination,
    }).state,
  );
  const count = findRoute(
    state.world.map,
    state.world.positions[actorId]!,
    destination,
  )!.length;
  expect(actionProgress(state, actorId)).toMatchObject({
    kind: "travel",
    text: `${count} tiles left`,
    fraction: null,
  });
  const blocked = {
    ...state,
    world: {
      ...state.world,
      map: setSurface(state.world.map, destination, "structure", {
        kind: "wall",
        material: "steel",
        integrity: 100,
      }),
    },
  };
  expect(actionProgress(blocked, actorId)).toMatchObject({
    kind: "blocked",
    text: "No route",
    fraction: null,
  });
});

it("uses simulation elapsed time for generic actions and resets only when action identity changes", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const idle = trackActionTimes(initial);
  const later = trackActionTimes({ ...idle, tick: 12 });
  expect(actionProgress(later, actorId)).toMatchObject({
    kind: "elapsed",
    elapsedMinutes: 12,
    text: "12 min elapsed",
  });
  const held = trackActionTimes(
    submitAction(later, { mapId: later.world.map.id, actorId, action: "hold" })
      .state,
  );
  expect(actionProgress(held, actorId)?.elapsedMinutes).toBe(0);
  expect(
    actionProgress(trackActionTimes({ ...held, tick: 15 }), actorId)
      ?.elapsedMinutes,
  ).toBe(3);
  expect(actionProgress(JSON.parse(JSON.stringify(later)), actorId)).toEqual(
    actionProgress(later, actorId),
  );
});

it("counts route steps rather than Manhattan distance and leaves door-opening time out of the tile count", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const origin = { x: 57, y: 55 };
  const destination = { x: 59, y: 55 };
  const wall = setSurface(initial.world.map, { x: 58, y: 55 }, "structure", {
    kind: "wall",
    material: "steel",
    integrity: 100,
  });
  const state = {
    ...initial,
    world: {
      ...initial.world,
      map: wall,
      positions: { ...initial.world.positions, [actorId]: origin },
    },
  };
  const intent = {
    mapId: state.world.map.id,
    actorId,
    action: "move" as const,
    destination,
  };
  const moving = trackActionTimes(submitAction(state, intent).state);
  expect(actionProgress(moving, actorId)!.text).toBe("4 tiles left");
  const map = setSurface(wall, { x: 58, y: 55 }, "structure", {
    kind: "closed-door",
    material: "steel",
    integrity: 100,
  });
  const throughDoor = { ...moving, world: { ...moving.world, map } };
  expect(actionProgress(throughDoor, actorId)!.text).toBe("2 tiles left");
  const opened = advanceSimulation(throughDoor);
  expect(opened.world.positions[actorId]).toEqual(origin);
  expect(actionProgress(opened, actorId)).toMatchObject({
    text: "2 tiles left",
    elapsedMinutes: 1,
  });
  expect(actionProgress(advanceSimulation(opened), actorId)!.text).toBe(
    "1 tile left",
  );
  const held = {
    ...throughDoor,
    world: setDoorPolicy(throughDoor.world, { x: 58, y: 55 }, "held-closed"),
  };
  expect(actionProgress(held, actorId)!.text).toBe("4 tiles left");
});

it("persists generic elapsed time, freezes it when paused and resets a replaced action", () => {
  const controller = createController(createInitialState());
  const actorId = controller.getSnapshot().game.personnel[0]!.id;
  const mapId = controller.getSnapshot().game.world.map.id;
  controller.queueAction({ mapId, actorId, action: "hold" });
  const after = controller.advance(7).game;
  expect(actionProgress(after, actorId)).toMatchObject({
    kind: "elapsed",
    elapsedMinutes: 7,
  });
  const saved = load(after);
  expect(saved.status).toBe("loaded");
  if (saved.status !== "loaded") throw new Error("timing save rejected");
  expect(actionProgress(saved.state, actorId)).toEqual(
    actionProgress(after, actorId),
  );
  const restored = createController(saved.state);
  restored.setRunning(false);
  restored.advance(10);
  expect(
    actionProgress(restored.getSnapshot().game, actorId)?.elapsedMinutes,
  ).toBe(7);
  restored.goHere(mapId, actorId, { x: 60, y: 59 });
  expect(
    actionProgress(restored.getSnapshot().game, actorId)?.elapsedMinutes,
  ).toBe(0);
  for (const invalid of [
    { startedTick: 99999 },
    { startedTick: -1 },
    { key: "" },
    { mapId: "disposed-field" },
  ]) {
    const corrupted = structuredClone(after);
    Object.assign(corrupted.actionTimings[actorId]!, invalid);
    expect(load(corrupted).status).not.toBe("loaded");
  }
});

it("starts a player timer at handoff rather than including its time pending behind a routine", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const chair = initial.routines.stations.find(
    (station) => station.kind === "break",
  )!;
  const state = {
    ...initial,
    world: {
      ...initial.world,
      positions: { ...initial.world.positions, [actorId]: chair.position },
    },
    routines: {
      ...initial.routines,
      schedules: {
        ...initial.routines.schedules,
        [actorId]: Array(24).fill("free"),
      },
      activities: {
        [actorId]: {
          kind: "break" as const,
          source: "autonomy" as const,
          startedTick: 0,
          progress: 28,
          stationId: chair.id,
          mealConsumed: false,
        },
      },
    },
  };
  const controller = createController(state);
  controller.queueAction({
    mapId: state.world.map.id,
    actorId,
    action: "move",
    destination: { x: 60, y: 59 },
  });
  const before = controller.advance().game;
  expect(before.actionQueues[actorId]!.current.started).toBe(false);
  expect(actionProgress(before, actorId)!.kind).toBe("duration");
  const handed = controller.advance().game;
  expect(handed.actionQueues[actorId]!.current.started).toBe(true);
  expect(actionProgress(handed, actorId)).toMatchObject({
    kind: "travel",
    elapsedMinutes: 0,
  });
});

it("tracks field transit and travel against the correct map without adding absent base timers", () => {
  const controller = createController(createInitialState());
  const actorId = "person-caleb-ward";
  controller.enlistExpedition("notice-depot", [actorId, "person-lena-ortiz"]);
  controller.advance(100);
  controller.dispatchExpedition();
  const outbound = controller.advance(5).game;
  expect(actionProgress(outbound, actorId)).toBeNull();
  expect(actionProgress(fieldState(outbound)!, actorId)).toMatchObject({
    kind: "elapsed",
    elapsedMinutes: 5,
  });
  const arrived = controller.advance(25).game;
  const field = fieldState(arrived)!;
  controller.queueAction({
    mapId: field.world.map.id,
    actorId,
    action: "move",
    destination: { x: 7, y: 12 },
  });
  const issued = controller.getSnapshot().game;
  expect(actionProgress(fieldState(issued)!, actorId)).toMatchObject({
    kind: "travel",
    text: "3 tiles left",
    elapsedMinutes: 0,
  });
  expect(load(issued).status).toBe("loaded");
});
