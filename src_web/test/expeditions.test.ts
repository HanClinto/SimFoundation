import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  enlistExpedition,
  cancelExpedition,
  expeditionAssembled,
  dispatchExpedition,
  fieldState,
  recallExpedition,
  recoverExpeditionObject,
  cancelRecovery,
  storeFieldState,
} from "../src/simulation/expeditions";
import { advanceSimulation } from "../src/simulation/tick";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { createController } from "../src/application/controller";
import { orderResponder } from "../src/simulation/combat";
import { setSurface } from "../src/simulation/materials";

const loaded = (state: ReturnType<typeof createInitialState>) =>
  loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} });

const team = ["person-caleb-ward", "person-lena-ortiz"];
it("assembles the enlisted team physically without copying equipment or consuming supplies", () => {
  const initial = createInitialState();
  const result = enlistExpedition(initial, "notice-depot", team);
  expect(result.code).toBe("accepted");
  expect(expeditionAssembled(result.state)).toBe(false);
  let state = result.state;
  for (let tick = 0; tick < 120 && !expeditionAssembled(state); tick += 1)
    state = advanceSimulation(state);
  expect(expeditionAssembled(state)).toBe(true);
  for (const id of team)
    expect(
      state.personnel.find((person) => person.id === id)!.equipment,
    ).toEqual(initial.personnel.find((person) => person.id === id)!.equipment);
  expect(
    state.objects.items
      .filter((item) => item.kind === "materials")
      .reduce((total, item) => total + item.quantity, 0),
  ).toBe(160);
  const cancelled = cancelExpedition(state);
  expect(cancelled.code).toBe("accepted");
  expect(cancelled.state.expeditions.active).toBeNull();
  expect(
    team.every((id) => !cancelled.state.combat.responders[id]!.drafted),
  ).toBe(true);
});

it("rejects duplicate or busy teams atomically", () => {
  const state = createInitialState();
  expect(
    enlistExpedition(state, "notice-depot", [team[0]!, team[0]!]).code,
  ).toBe("invalid-team");
  const issued = enlistExpedition(state, "notice-depot", team).state;
  expect(enlistExpedition(issued, "notice-depot", team).state).toBe(issued);
});

it("travels to a temporary map and returns the same team and equipment while the base clock advances", () => {
  const initial = createInitialState();
  let state = enlistExpedition(
    initial,
    "notice-depot",
    team,
    Object.fromEntries(
      team.map((id) => [id, { ammunition: 8, medicalSupplies: 1 }]),
    ),
  ).state;
  expect(dispatchExpedition(state).code).toBe("not-ready");
  for (let tick = 0; tick < 120 && !expeditionAssembled(state); tick += 1)
    state = advanceSimulation(state);
  state = dispatchExpedition(state).state;
  const departed = state.tick;
  expect(state.expeditions.active!.phase).toBe("outbound");
  expect(loaded(state).status).toBe("loaded");
  for (const id of team) expect(state.world.positions[id]).toBeUndefined();
  for (let tick = 0; tick < 30; tick += 1) state = advanceSimulation(state);
  expect(state.expeditions.active!.phase).toBe("field");
  expect(state.tick).toBe(departed + 30);
  const field = fieldState(state)!;
  expect(field.combat.responders[team[0]!]!.ammunition).toBe(8);
  expect(field.combat.responders[team[0]!]!.medicalSupplies).toBe(1);
  expect(loaded(state).status).toBe("loaded");
  expect(field.world.map.width).toBe(28);
  expect(field.personnel.map((person) => person.id).sort()).toEqual(
    [...team].sort(),
  );
  for (const id of team)
    expect(
      field.personnel.find((person) => person.id === id)!.equipment,
    ).toEqual(initial.personnel.find((person) => person.id === id)!.equipment);
  const recalled = recallExpedition(state);
  expect(recalled.code).toBe("accepted");
  state = recalled.state;
  for (let tick = 0; tick < 100 && state.expeditions.active; tick += 1)
    state = advanceSimulation(state);
  expect(state.expeditions.active).toBeNull();
  expect(state.expeditions.history).toHaveLength(1);
  expect(loaded(state).status).toBe("loaded");
  expect(new Set(state.personnel.map((person) => person.id)).size).toBe(6);
  expect(Object.keys(state.world.positions)).toHaveLength(7);
  for (const id of team)
    expect(state.combat.responders[id]!.ammunition).toBe(12);
});

it("recovers physical field cargo, regroups and returns it exactly once with persistent responder supplies", () => {
  let state = enlistExpedition(
    createInitialState(),
    "notice-depot",
    team,
  ).state;
  for (let tick = 0; tick < 120 && !expeditionAssembled(state); tick += 1)
    state = advanceSimulation(state);
  state = dispatchExpedition(state).state;
  for (let tick = 0; tick < 30; tick += 1) state = advanceSimulation(state);
  const field = fieldState(state)!;
  state = storeFieldState(state, {
    ...field,
    combat: {
      ...field.combat,
      status: "neutralized",
      adversary: { ...field.combat.adversary!, health: 0 },
      responders: Object.fromEntries(
        Object.entries(field.combat.responders).map(([id, responder]) => [
          id,
          { ...responder, ammunition: 7 },
        ]),
      ),
    },
  });
  const id = state.expeditions.active!.id;
  for (const [index, objectId] of [
    `${id}-archive`,
    `${id}-specimen`,
  ].entries()) {
    const result = recoverExpeditionObject(state, team[index]!, objectId);
    expect(result.code).toBe("accepted");
    state = result.state;
  }
  expect(recallExpedition(state).code).toBe("busy");
  const phases = new Set<string>();
  for (let tick = 0; tick < 150; tick += 1) {
    state = advanceSimulation(state);
    for (const order of state.expeditions.active!.recoveryOrders) {
      if (!phases.has(order.phase)) {
        expect(loaded(state).status).toBe("loaded");
        phases.add(order.phase);
      }
    }
    if (state.expeditions.active!.cargo.length === 2) break;
  }
  expect(phases).toEqual(new Set(["collecting", "carrying", "delivered"]));
  expect(state.expeditions.active!.cargo).toHaveLength(2);
  state = recallExpedition(state).state;
  for (let tick = 0; tick < 100 && state.expeditions.active; tick += 1) {
    state = advanceSimulation(state);
    expect(loaded(state).status).toBe("loaded");
  }
  expect(state.expeditions.active).toBeNull();
  for (const objectId of [`${id}-archive`, `${id}-specimen`])
    expect(
      state.objects.items.filter((item) => item.id === objectId),
    ).toHaveLength(1);
  expect(state.expeditions.notices[0]!.status).toBe("resolved");
  expect(state.combat.responders[team[0]!]!.ammunition).toBe(7);
  expect(
    state.environment.sources.find((source) => source.id === `${id}-emission`),
  ).toMatchObject({ objectId: `${id}-specimen`, enabled: true, dose: 0.2 });
  const after = advanceSimulation(state);
  expect(after.objects.items).toHaveLength(state.objects.items.length);
});

it("rejects base and stale field commands for an expedition team", () => {
  const controller = createController(createInitialState());
  controller.enlistExpedition("notice-depot", team);
  expect(controller.draftResponder(team[0]!, false).code).toBe("busy");
  expect(controller.orderResponder(team[0]!, "hold").code).toBe("busy");
  expect(
    controller.orderFieldResponder("old-expedition", team[0]!, "hold").code,
  ).toBe("busy");
});

it("cancels recovery without deleting carried cargo and refuses unsafe recall", () => {
  const controller = createController(createInitialState());
  controller.enlistExpedition("notice-depot", team);
  controller.advance(100);
  controller.dispatchExpedition();
  let state = controller.advance(30).game;
  const active = state.expeditions.active!;
  const field = fieldState(state)!;
  state = storeFieldState(state, {
    ...field,
    combat: {
      ...field.combat,
      status: "neutralized",
      adversary: { ...field.combat.adversary!, health: 0 },
    },
  });
  state = recoverExpeditionObject(
    state,
    team[0]!,
    `${active.id}-archive`,
  ).state;
  for (
    let tick = 0;
    tick < 100 &&
    state.expeditions.active!.recoveryOrders[0]!.phase !== "carrying";
    tick += 1
  )
    state = advanceSimulation(state);
  const origin = fieldState(state)!.world.positions[team[0]!]!;
  state = cancelRecovery(state, team[0]!).state;
  expect(
    fieldState(state)!.objects.items.find((item) =>
      item.id.endsWith("-archive"),
    ),
  ).toMatchObject({
    reservedBy: null,
    location: { kind: "ground", position: origin },
  });
  expect(loaded(state).status).toBe("loaded");
  const injured = fieldState(state)!;
  state = storeFieldState(state, {
    ...injured,
    combat: {
      ...injured.combat,
      responders: {
        ...injured.combat.responders,
        [team[0]!]: {
          ...injured.combat.responders[team[0]!]!,
          health: 50,
          injuries: 1,
        },
      },
    },
  });
  expect(recallExpedition(state).code).toBe("busy");
});

it("rejects duplicated map membership, tampered field topology, cargo claims and supply inflation", () => {
  const controller = createController(createInitialState());
  controller.enlistExpedition("notice-depot", team);
  controller.advance(100);
  controller.dispatchExpedition();
  const state = controller.advance(30).game;
  const active = state.expeditions.active!;
  expect(
    loaded({
      ...state,
      world: {
        ...state.world,
        positions: { ...state.world.positions, [team[0]!]: { x: 63, y: 63 } },
      },
    }).status,
  ).toBe("invalid");
  const alteredTiles = [...active.site!.world.map.tiles];
  alteredTiles[12 * 28 + 4] = "wall";
  expect(
    loaded({
      ...state,
      expeditions: {
        ...state.expeditions,
        active: {
          ...active,
          site: {
            ...active.site!,
            world: {
              ...active.site!.world,
              map: { ...active.site!.world.map, tiles: alteredTiles },
            },
          },
        },
      },
    }).status,
  ).toBe("invalid");
  expect(
    loaded({
      ...state,
      expeditions: {
        ...state.expeditions,
        active: { ...active, cargo: [`${active.id}-specimen`] },
      },
    }).status,
  ).toBe("invalid");
  expect(
    loaded({
      ...state,
      expeditions: {
        ...state.expeditions,
        active: {
          ...active,
          reserves: {
            ...active.reserves,
            [team[0]!]: { ammunition: 12, medicalSupplies: 2 },
          },
        },
      },
    }).status,
  ).toBe("invalid");
});

it("replays field actions deterministically while independent base work advances", () => {
  const controller = createController(createInitialState());
  controller.enlistExpedition("notice-depot", team);
  controller.advance(100);
  controller.dispatchExpedition();
  let state = controller.advance(30).game;
  const field = fieldState(state)!;
  const staged = {
    ...field,
    world: {
      ...field.world,
      positions: { [team[0]!]: { x: 19, y: 9 }, [team[1]!]: { x: 19, y: 10 } },
    },
  };
  state = storeFieldState(
    state,
    orderResponder(
      orderResponder(staged, team[0]!, "engage", undefined, "SCP-049-2").state,
      team[1]!,
      "engage",
      undefined,
      "SCP-049-2",
    ).state,
  );
  const baseMinute = state.gameMinute;
  for (let tick = 0; tick < 18; tick += 1) {
    state = advanceSimulation(state);
    const saved = loaded(state);
    expect(saved.status).toBe("loaded");
    if (saved.status === "loaded")
      expect(advanceSimulation(saved.state)).toEqual(advanceSimulation(state));
    expect(state.world.positions[team[0]!]).toBeUndefined();
    expect(fieldState(state)!.world.positions["SCP-999"]).toBeUndefined();
  }
  expect(state.gameMinute).toBe(baseMinute + 18);
  expect(
    fieldState(state)!.combat.responders[team[0]!]!.ammunition,
  ).toBeLessThan(12);
});

it("waits for a blocked return point and transfers the team once after access is restored", () => {
  const controller = createController(createInitialState());
  controller.enlistExpedition("notice-depot", team);
  controller.advance(100);
  controller.dispatchExpedition();
  controller.advance(30);
  controller.recallExpedition();
  let state = controller.advance(3).game;
  expect(state.expeditions.active!.phase).toBe("inbound");
  const position = { x: 63, y: 63 };
  state = {
    ...state,
    objects: {
      ...state.objects,
      items: state.objects.items.filter(
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
    world: {
      ...state.world,
      map: setSurface(state.world.map, position, "structure", {
        kind: "wall",
        material: "steel",
        integrity: 100,
      }),
    },
  };
  for (let tick = 0; tick < 40; tick += 1) state = advanceSimulation(state);
  expect(state.expeditions.active!.phase).toBe("inbound");
  expect(state.expeditions.history).toHaveLength(0);
  expect(state.world.positions[team[0]!]).toBeUndefined();
  expect(loaded(state).status).toBe("loaded");
  state = {
    ...state,
    world: {
      ...state.world,
      map: setSurface(state.world.map, position, "structure", null),
    },
  };
  state = advanceSimulation(state);
  expect(state.expeditions.active).toBeNull();
  expect(state.expeditions.history).toHaveLength(1);
  expect(advanceSimulation(state).expeditions.history).toHaveLength(1);
});

it("completes home construction without borrowing expedition personnel or supplies", () => {
  const controller = createController(createInitialState());
  controller.enlistExpedition("notice-depot", team);
  controller.advance(100);
  controller.dispatchExpedition();
  controller.advance(30);
  expect(
    controller.orderSurfaceWork({ x: 63, y: 79 }, "floor", "steel", "floor")
      .code,
  ).toBe("accepted");
  let state = controller.getSnapshot().game;
  for (
    let step = 0;
    step < 250 && state.environment.orders[0]!.phase !== "completed";
    step += 1
  ) {
    state = controller.advance().game;
    expect(
      state.jobs.filter(
        (job) => job.assignedPersonId && team.includes(job.assignedPersonId),
      ),
    ).toHaveLength(0);
  }
  expect(state.environment.orders[0]!.phase).toBe("completed");
  expect(state.construction.availableMaterials).toBe(156);
  expect(state.expeditions.active!.phase).toBe("field");
  expect(
    Object.values(state.expeditions.active!.site!.combat.responders).every(
      (responder) => responder.ammunition === 12,
    ),
  ).toBe(true);
  expect(loaded(state).status).toBe("loaded");
});
