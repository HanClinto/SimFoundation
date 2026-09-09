import { expect, it } from "vitest";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation_legacy/state";
import {
  fieldState,
  storeFieldState,
} from "../src/simulation_legacy/expeditions";
import { advanceCombat, orderResponder } from "../src/simulation_legacy/combat";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import {
  performInteraction,
  interactionOptions,
} from "../src/simulation_legacy/interactions";
import { setSurface } from "../src/simulation_legacy/materials";
import { setDoorPolicy } from "../src/simulation_legacy/world";

function fieldEncounter() {
  const controller = createController(createInitialState());
  controller.enlistExpedition("notice-depot", [
    "person-caleb-ward",
    "person-lena-ortiz",
  ]);
  controller.advance(100);
  controller.dispatchExpedition();
  controller.advance(30);
  return controller.getSnapshot().game;
}
const actorId = "person-caleb-ward";

it("approaches for Attack but holds position for Engage From Here without spending ammunition", () => {
  const initial = fieldState(fieldEncounter())!;
  const origin = initial.world.positions[actorId];
  const attack = orderResponder(
    initial,
    actorId,
    "attack",
    undefined,
    "SCP-049-2",
  );
  const hold = orderResponder(
    initial,
    actorId,
    "engage",
    undefined,
    "SCP-049-2",
  );
  expect(attack.code).toBe("accepted");
  expect(attack.state.world).toEqual(initial.world);
  const moved = advanceCombat(attack.state);
  expect(moved.world.positions[actorId]).not.toEqual(origin);
  expect(moved.combat.responders[actorId]).toMatchObject({
    order: "attack",
    ammunition: 12,
    phase: "ready",
    blockedReason: "Approaching firing position.",
  });
  expect(advanceCombat(hold.state).world.positions[actorId]).toEqual(origin);
});

it("cannot use a replacement Attack to shorten recovery or move during recovery", () => {
  const initial = fieldState(fieldEncounter())!;
  const state = {
    ...initial,
    combat: {
      ...initial.combat,
      responders: {
        ...initial.combat.responders,
        [actorId]: {
          ...initial.combat.responders[actorId]!,
          phase: "recovering" as const,
          remaining: 3,
          ammunition: 7,
        },
      },
    },
  };
  const issued = orderResponder(
    state,
    actorId,
    "attack",
    undefined,
    "SCP-049-2",
  );
  expect(issued.state.combat.responders[actorId]).toMatchObject({
    phase: "recovering",
    remaining: 3,
    ammunition: 7,
  });
  const next = advanceCombat(issued.state);
  expect(next.world.positions[actorId]).toEqual(state.world.positions[actorId]);
  expect(next.combat.responders[actorId]).toMatchObject({
    phase: "recovering",
    remaining: 2,
    ammunition: 7,
  });
});

it("keeps blocked attacks visible, then physically opens an automatic door before preparing", () => {
  const initial = fieldState(fieldEncounter())!;
  let map = initial.world.map;
  for (let row = 0; row < map.height; row += 1)
    map = setSurface(map, { x: 10, y: row }, "structure", {
      kind: "wall",
      material: "steel",
      integrity: 100,
    });
  map = setSurface(map, { x: 10, y: 12 }, "structure", {
    kind: "closed-door",
    material: "steel",
    integrity: 100,
  });
  let state = {
    ...initial,
    world: setDoorPolicy(
      { ...initial.world, map },
      { x: 10, y: 12 },
      "held-closed",
    ),
    combat: {
      ...initial.combat,
      adversary: {
        ...initial.combat.adversary!,
        position: { x: 14, y: 12 },
        phase: "recovering" as const,
        remaining: 3,
      },
    },
  };
  let attacking = orderResponder(
    state,
    actorId,
    "attack",
    undefined,
    "SCP-049-2",
  ).state;
  const blocked = advanceCombat(attacking);
  expect(blocked.world.positions[actorId]).toEqual(
    state.world.positions[actorId],
  );
  expect(blocked.combat.responders[actorId]).toMatchObject({
    order: "attack",
    ammunition: 12,
    blockedReason: "No reachable firing position.",
  });
  attacking = {
    ...blocked,
    world: setDoorPolicy(blocked.world, { x: 10, y: 12 }, "automatic"),
  };
  let openedInPlace = false;
  for (
    let step = 0;
    step < 20 && attacking.combat.responders[actorId]!.phase !== "preparing";
    step += 1
  ) {
    const before = attacking;
    attacking = advanceCombat({
      ...attacking,
      tick: attacking.tick + 1,
      combat: {
        ...attacking.combat,
        adversary: {
          ...attacking.combat.adversary!,
          phase: "recovering",
          remaining: 3,
        },
      },
    });
    if (
      before.world.map.tiles[12 * map.width + 10] === "closed-door" &&
      attacking.world.map.tiles[12 * map.width + 10] === "door"
    ) {
      expect(attacking.world.positions[actorId]).toEqual(
        before.world.positions[actorId],
      );
      openedInPlace = true;
    }
  }
  expect(openedInPlace).toBe(true);
  expect(attacking.combat.responders[actorId]).toMatchObject({
    phase: "preparing",
    ammunition: 12,
    remaining: 3,
  });
  const occluded = {
    ...attacking,
    world: {
      ...attacking.world,
      map: setSurface(attacking.world.map, { x: 12, y: 12 }, "structure", {
        kind: "wall",
        material: "steel",
        integrity: 100,
      }),
    },
  };
  const replanned = advanceCombat(occluded);
  expect(replanned.combat.responders[actorId]).toMatchObject({
    order: "attack",
    phase: "ready",
    remaining: 0,
    ammunition: 12,
  });
});

it("serializes Attack during approach and completion without changing ammunition or replay results", () => {
  const root = fieldEncounter();
  const local = fieldState(root)!;
  expect(
    interactionOptions(root, local.world.map.id, actorId, "SCP-049-2").map(
      (option) => option.action,
    ),
  ).toEqual(["attack", "engage"]);
  let state = performInteraction(root, {
    mapId: local.world.map.id,
    actorId,
    targetId: "SCP-049-2",
    action: "attack",
  }).state;
  const load = (value: typeof state) =>
    loadGameState({ getItem: () => JSON.stringify(value), setItem: () => {} });
  expect(load(state).status).toBe("loaded");
  const first = advanceCombat(fieldState(state)!);
  state = storeFieldState(state, first);
  expect(load(state).status).toBe("loaded");
  expect(advanceCombat(fieldState(JSON.parse(JSON.stringify(state)))!)).toEqual(
    advanceCombat(fieldState(state)!),
  );
  const finishing = {
    ...first,
    combat: {
      ...first.combat,
      adversary: { ...first.combat.adversary!, health: 24 },
      responders: {
        ...first.combat.responders,
        [actorId]: {
          ...first.combat.responders[actorId]!,
          phase: "preparing" as const,
          remaining: 1,
        },
      },
    },
    world: {
      ...first.world,
      positions: {
        ...first.world.positions,
        [actorId]: {
          x: first.combat.adversary!.position.x - 1,
          y: first.combat.adversary!.position.y,
        },
      },
    },
  };
  const completed = advanceCombat(finishing);
  expect(completed.combat.status).toBe("neutralized");
  expect(completed.combat.responders[actorId]).toMatchObject({
    order: "hold",
    targetId: null,
    ammunition: 11,
    phase: "recovering",
    remaining: 3,
  });
  expect(load(storeFieldState(root, completed)).status).toBe("loaded");
});
