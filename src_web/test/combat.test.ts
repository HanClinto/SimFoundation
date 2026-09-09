import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  draftResponder,
  previewDraftResponder,
  orderResponder,
  advanceTacticalMovement,
  startEncounter,
  engagementIssue,
  observeCombat,
} from "../src/simulation/combat";
import { advanceSimulation } from "../src/simulation/tick";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { setSurface } from "../src/simulation/materials";
import { orderSurfaceWork } from "../src/simulation/environment";
import { requestAssessment } from "../src/simulation/clinical";
import { createController } from "../src/application/controller";
import { advanceCombat } from "../src/simulation/combat";
import { fieldState } from "../src/simulation/expeditions";

const first = "person-caleb-ward";
const second = "person-lena-ortiz";
it("uses the supplied withdrawal policy rather than inferring it from a field map", () => {
  const controller = createController(createInitialState());
  controller.enlistExpedition("notice-depot", [first, second]);
  controller.advance(100);
  controller.dispatchExpedition();
  const arrival = controller.advance(30).game;
  let distance = fieldState(arrival)!;
  let explicit = distance;
  for (let step = 0; step < 8; step += 1) {
    distance = advanceCombat(
      { ...distance, tick: distance.tick + 1 },
      "distance",
    );
    explicit = advanceCombat(
      { ...explicit, tick: explicit.tick + 1 },
      "explicit",
    );
  }
  expect(distance.combat.status).toBe("withdrawn");
  expect(explicit.combat.status).toBe("active");
  expect(explicit.combat.withdrawalTicks).toBe(0);
  expect(arrival.expeditions.active!.site!.combat.status).toBe("active");
});

it("patrols the depot without hidden target knowledge, opens doors and attacks a visible responder", () => {
  const controller = createController(createInitialState());
  controller.enlistExpedition("notice-depot", [first, second]);
  controller.advance(100);
  controller.dispatchExpedition();
  const arrival = controller.advance(30).game;
  let field = fieldState(arrival)!;
  const start = field.combat.adversary!.position;
  let alternate: ReturnType<typeof createInitialState> = {
    ...field,
    world: {
      ...field.world,
      positions: { [first]: { x: 3, y: 12 }, [second]: { x: 3, y: 13 } },
    },
  };
  const visited = new Set<string>();
  for (let tick = 0; tick < 64; tick += 1) {
    field = advanceCombat({ ...field, tick: field.tick + 1 }, "explicit");
    alternate = advanceCombat(
      { ...alternate, tick: alternate.tick + 1 },
      "explicit",
    );
    expect(field.combat.adversary!.position).toEqual(
      alternate.combat.adversary!.position,
    );
    expect(field.combat.adversary!.targetId).toBeNull();
    visited.add(JSON.stringify(field.combat.adversary!.position));
  }
  expect(visited.size).toBeGreaterThan(6);
  expect([...visited].some((position) => JSON.parse(position).x < 17)).toBe(
    true,
  );
  expect(
    [...visited].some((position) => position !== JSON.stringify(start)),
  ).toBe(true);
  const expeditionId = arrival.expeditions.active!.id;
  controller.orderFieldResponder(expeditionId, first, "move", { x: 16, y: 10 });
  controller.orderFieldResponder(expeditionId, second, "move", {
    x: 16,
    y: 11,
  });
  let state = arrival;
  for (let tick = 0; tick < 160; tick += 1) {
    state = controller.advance().game;
    if (
      Object.values(state.expeditions.active!.site!.combat.responders).some(
        (responder) => responder.injuries > 0,
      )
    )
      break;
  }
  expect(
    Object.values(state.expeditions.active!.site!.combat.responders).some(
      (responder) => responder.injuries > 0,
    ),
  ).toBe(true);
  const injury = state.personnel
    .flatMap((person) => person.effects)
    .find((effect) => effect.causes?.length);
  expect(injury?.causes).toEqual([
    {
      sourceId: "SCP-049-2",
      sourceName: "SCP-049-2",
      mapId: state.expeditions.active!.site!.world.map.id,
      locationName: "Relay Depot 14",
      tick: state.tick,
      gameMinute: state.gameMinute,
    },
  ]);
  expect(load(state).status).toBe("loaded");
});
function encounter() {
  let state = createInitialState();
  state = {
    ...state,
    world: {
      ...state.world,
      positions: {
        ...state.world.positions,
        [first]: { x: 68, y: 55 },
        [second]: { x: 68, y: 56 },
      },
    },
  };
  state = draftResponder(
    draftResponder(state, first, true).state,
    second,
    true,
  ).state;
  const started = startEncounter(state, { x: 72, y: 55 });
  expect(started.code).toBe("accepted");
  return started.state;
}
const load = (state: ReturnType<typeof createInitialState>) =>
  loadGameState({ getItem: () => JSON.stringify(state), setItem: () => {} });

it("drafts, moves, holds and releases without teleporting or discarding physical inventory", () => {
  const initial = createInitialState();
  const id = initial.personnel[0]!.id;
  let state = draftResponder(initial, id, true).state;
  const origin = state.world.positions[id]!;
  const destination = { x: origin.x + 1, y: origin.y };
  const ordered = orderResponder(state, id, "move", destination);
  expect(ordered.code).toBe("accepted");
  expect(ordered.state.world.positions[id]).toEqual(origin);
  state = advanceTacticalMovement(ordered.state);
  expect(state.world.positions[id]).toEqual(destination);
  expect(state.combat.responders[id]!.order).toBe("hold");
  expect(
    draftResponder(state, id, false).state.combat.responders[id]!.drafted,
  ).toBe(false);
  expect(state.objects).toEqual(initial.objects);
});

it("refuses drafting cargo carriers and rejects unreachable positional orders", () => {
  const initial = createInitialState();
  const id = initial.personnel[0]!.id;
  const carrying = {
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.map((item) =>
        item.id === "stock-materials"
          ? { ...item, location: { kind: "carried" as const, personId: id } }
          : item,
      ),
    },
  };
  expect(draftResponder(carrying, id, true).code).toBe("busy");
  expect(previewDraftResponder(carrying, id, true).reason).toContain("cargo");
  expect(
    orderResponder(draftResponder(initial, id, true).state, id, "retreat", {
      x: -1,
      y: 0,
    }).code,
  ).toBe("unreachable");
});

it("previews duty changes immutably with the same result as execution", () => {
  const initial = draftResponder(createInitialState(), first, true).state;
  const cases = [
    {
      patch: { phase: "recovering" as const, remaining: 2 },
      reason: "recovery",
    },
    { patch: { injuries: 1, stabilized: false }, reason: "injuries" },
    { patch: { incapacitated: true }, reason: "incapacitated" },
  ];
  for (const { patch, reason } of cases) {
    const state = {
      ...initial,
      combat: {
        ...initial.combat,
        responders: {
          ...initial.combat.responders,
          [first]: { ...initial.combat.responders[first]!, ...patch },
        },
      },
    };
    const before = JSON.stringify(state);
    const preview = previewDraftResponder(state, first, false);
    expect(preview.reason).toContain(reason);
    expect(JSON.stringify(state)).toBe(before);
    const result = draftResponder(state, first, false);
    expect(result.code).toBe(preview.code);
    expect(result.state).toBe(state);
  }
  expect(previewDraftResponder(encounter(), first, false).reason).toContain(
    "encounter team",
  );
  expect(previewDraftResponder(initial, first, false)).toEqual({
    code: "accepted",
    reason: null,
  });
  const controller = createController(initial);
  controller.enlistExpedition("notice-depot", [first, second]);
  const before = controller.getSnapshot();
  expect(controller.previewDraftResponder(first, false)).toContain(
    "expedition",
  );
  expect(controller.getSnapshot()).toEqual(before);
  expect(controller.draftResponder(first, false).code).toBe("busy");
});

it("resolves a two-responder encounter with visible windup and finite ammunition, surviving reloads", () => {
  let state = encounter();
  state = orderResponder(
    orderResponder(state, first, "engage", undefined, "SCP-049-2").state,
    second,
    "engage",
    undefined,
    "SCP-049-2",
  ).state;
  const phases = new Set<string>();
  for (let tick = 0; tick < 70; tick += 1) {
    state = advanceSimulation(state);
    phases.add(state.combat.responders[first]!.phase);
    expect(
      state.personnel.find((person) => person.id === first)!.currentJobId,
    ).toBeNull();
    const loaded = load(state);
    expect(loaded.status).toBe("loaded");
    if (loaded.status === "loaded")
      expect(advanceSimulation(loaded.state)).toEqual(advanceSimulation(state));
    if (state.combat.status === "neutralized") break;
  }
  expect(state.combat.status).toBe("neutralized");
  expect(phases.has("preparing")).toBe(true);
  expect(phases.has("recovering")).toBe(true);
  expect(state.combat.responders[first]!.ammunition).toBeLessThan(12);
});

it("interrupts preparation on lost line of sight without consuming a round", () => {
  let state = orderResponder(
    encounter(),
    first,
    "engage",
    undefined,
    "SCP-049-2",
  ).state;
  state = advanceSimulation(state);
  expect(state.combat.responders[first]!.phase).toBe("preparing");
  state = {
    ...state,
    world: {
      ...state.world,
      map: setSurface(state.world.map, { x: 69, y: 55 }, "structure", {
        kind: "wall",
        material: "steel",
        integrity: 100,
      }),
    },
  };
  expect(engagementIssue(state, first)).toBe("Line of sight blocked.");
  state = advanceSimulation(state);
  expect(state.combat.responders[first]!.phase).toBe("ready");
  expect(state.combat.responders[first]!.ammunition).toBe(12);
});

it("permits a no-damage withdrawal through automatic doors without attacking", () => {
  let state = encounter();
  state = orderResponder(state, first, "retreat", { x: 60, y: 55 }).state;
  state = orderResponder(state, second, "retreat", { x: 60, y: 56 }).state;
  for (let tick = 0; tick < 100 && state.combat.status === "active"; tick += 1)
    state = advanceSimulation(state);
  expect(state.combat.status).toBe("withdrawn");
  expect(state.combat.adversary!.health).toBe(120);
  expect(state.combat.responders[first]!.health).toBe(100);
  expect(draftResponder(state, first, false).code).toBe("accepted");
  expect(load(state).status).toBe("loaded");
});

it("incapacitates an exposed responder and requires adjacent stabilization plus recovery", () => {
  let state = encounter();
  for (
    let tick = 0;
    tick < 100 && !state.combat.responders[first]!.incapacitated;
    tick += 1
  )
    state = advanceSimulation(state);
  expect(state.combat.responders[first]!.incapacitated).toBe(true);
  expect(
    state.personnel
      .find((person) => person.id === first)!
      .effects.some(
        (effect) => effect.id === `effect-tactical-trauma-${first}`,
      ),
  ).toBe(true);
  const causes = state.personnel
    .find((person) => person.id === first)!
    .effects.find(
      (effect) => effect.id === `effect-tactical-trauma-${first}`,
    )!.causes!;
  expect(causes.length).toBeGreaterThan(1);
  expect(causes).toHaveLength(state.combat.responders[first]!.injuries);
  for (const [index, cause] of causes.entries()) {
    expect(cause).toMatchObject({
      sourceId: "SCP-049-2",
      sourceName: "SCP-049-2",
      mapId: state.world.map.id,
      locationName: state.siteName,
    });
    expect(cause.gameMinute - cause.tick).toBe(state.gameMinute - state.tick);
    if (index > 0) expect(cause.tick).toBeGreaterThan(causes[index - 1]!.tick);
  }
  expect(load(state).status).toBe("loaded");
  expect(orderResponder(state, first, "move", { x: 60, y: 55 }).code).toBe(
    "incapacitated",
  );
  const patientPosition = state.world.positions[first]!;
  state = {
    ...state,
    combat: {
      ...state.combat,
      status: "neutralized",
      adversary: {
        ...state.combat.adversary!,
        health: 0,
        phase: "ready",
        remaining: 0,
      },
    },
    world: {
      ...state.world,
      positions: {
        ...state.world.positions,
        [second]: { x: patientPosition.x - 1, y: patientPosition.y },
      },
    },
  };
  state = orderResponder(state, second, "stabilize", undefined, first).state;
  for (let tick = 0; tick < 7; tick += 1) state = advanceSimulation(state);
  expect(state.combat.responders[first]!.stabilized).toBe(true);
  expect(state.combat.responders[first]!.incapacitated).toBe(true);
  expect(state.combat.responders[second]!.medicalSupplies).toBe(1);
  for (let tick = 0; tick < 12; tick += 1) state = advanceSimulation(state);
  expect(state.combat.responders[first]).toMatchObject({
    incapacitated: false,
    health: 25,
    stabilized: true,
  });
  expect(
    state.personnel
      .find((person) => person.id === first)!
      .effects.find(
        (effect) => effect.id === `effect-tactical-trauma-${first}`,
      )!.causes,
  ).toEqual(causes);
  const restored = load(state);
  expect(restored.status).toBe("loaded");
  if (restored.status !== "loaded") throw new Error("Injury save rejected");
  expect(restored.state.personnel).toEqual(state.personnel);
  expect(advanceSimulation(restored.state)).toEqual(advanceSimulation(state));
  expect(load(state).status).toBe("loaded");
});

it("round-trips injury history referencing departed sources", () => {
  const initial = createInitialState();
  const cause = {
    sourceId: "departed-attacker",
    sourceName: "SCP-049-2",
    mapId: "field-expedition-1",
    locationName: "Relay Depot 14",
    tick: 0,
    gameMinute: initial.gameMinute,
  };
  const state = {
    ...initial,
    personnel: initial.personnel.map((person) => ({
      ...person,
      effects: person.effects.map((effect) =>
        effect.kind === "injury" ? { ...effect, causes: [cause] } : effect,
      ),
    })),
  };
  const restored = load(state);
  expect(restored.status).toBe("loaded");
  if (restored.status !== "loaded")
    throw new Error("Historical cause rejected");
  expect(restored.state.personnel).toEqual(state.personnel);
});

it("does not update unseen adversary memory", () => {
  const state = encounter();
  const sighted = observeCombat({
    ...state,
    observations: {
      ...state.observations,
      visibleTiles: [55 * state.world.map.width + 72],
    },
  });
  const hidden = observeCombat({
    ...sighted,
    tick: 1,
    observations: { ...sighted.observations, visibleTiles: [] },
    combat: {
      ...sighted.combat,
      adversary: { ...sighted.combat.adversary!, position: { x: 73, y: 55 } },
    },
  });
  expect(hidden.combat.sighting).toEqual(sighted.combat.sighting);
});

it("retains interrupted job progress and material reservations while drafted staff stay outside scheduling", () => {
  let state = orderSurfaceWork(
    createInitialState(),
    { x: 63, y: 79 },
    "floor",
    "steel",
    "floor",
  ).state;
  for (
    let tick = 0;
    tick < 80 &&
    !state.jobs.some((job) => job.status === "in-progress" && job.progress > 0);
    tick += 1
  )
    state = advanceSimulation(state);
  const job = state.jobs.find((job) => job.status === "in-progress")!;
  const id = job.assignedPersonId!;
  const items = state.objects;
  const drafted = draftResponder(state, id, true);
  expect(drafted.code).toBe("accepted");
  expect(drafted.state.jobs.find((entry) => entry.id === job.id)).toMatchObject(
    { progress: job.progress, assignedPersonId: null, status: "available" },
  );
  expect(drafted.state.objects).toEqual(items);
  state = drafted.state;
  const position = state.world.positions[id];
  for (let tick = 0; tick < 15; tick += 1) state = advanceSimulation(state);
  expect(state.world.positions[id]).toEqual(position);
  expect(state.routines.activities[id]).toBeUndefined();
  expect(
    state.personnel.find((person) => person.id === id)!.currentJobId,
  ).toBeNull();
  expect(load(state).status).toBe("loaded");
});

it("refuses clinical participants and does not reset recovery or replenish ammunition through commands", () => {
  let state = requestAssessment(createInitialState(), first, "mood");
  state = advanceSimulation(state);
  const job = state.jobs.find((job) => job.assessment)!;
  expect(job.status).toBe("in-progress");
  expect(draftResponder(state, first, true).code).toBe("busy");
  expect(previewDraftResponder(state, first, true).reason).toContain(
    "clinical appointment",
  );
  expect(
    previewDraftResponder(state, job.assignedPersonId!, true).reason,
  ).toContain("clinical appointment");
  expect(draftResponder(state, job.assignedPersonId!, true).code).toBe("busy");
  state = orderResponder(
    encounter(),
    first,
    "engage",
    undefined,
    "SCP-049-2",
  ).state;
  for (let tick = 0; tick < 4; tick += 1) state = advanceSimulation(state);
  expect(state.combat.responders[first]!.phase).toBe("recovering");
  expect(state.combat.responders[first]!.lastShotTick).toBe(state.tick);
  const changed = orderResponder(state, first, "hold").state;
  expect(changed.combat.responders[first]).toMatchObject({
    phase: "recovering",
    remaining: 3,
    ammunition: 11,
  });
  expect(draftResponder(changed, first, false).code).toBe("busy");
});

it("supports a three-responder engagement without spending supplies outside range", () => {
  let state = encounter();
  const third = "person-priya-shah";
  state = {
    ...state,
    combat: { ...state.combat, status: "withdrawn" },
    world: {
      ...state.world,
      positions: { ...state.world.positions, [third]: { x: 68, y: 57 } },
    },
  };
  state = draftResponder(state, third, true).state;
  state = startEncounter(state, { x: 72, y: 55 }).state;
  for (const id of [first, second, third])
    state = orderResponder(state, id, "engage", undefined, "SCP-049-2").state;
  for (let tick = 0; tick < 60 && state.combat.status === "active"; tick += 1)
    state = advanceSimulation(state);
  expect(state.combat.status).toBe("neutralized");
  expect(load(state).status).toBe("loaded");
  expect(state.combat.participants).toHaveLength(3);
});

it("approaches a casualty physically before consuming a stabilization kit", () => {
  let state = encounter();
  state = {
    ...state,
    combat: {
      ...state.combat,
      status: "neutralized",
      adversary: { ...state.combat.adversary!, health: 0 },
      responders: {
        ...state.combat.responders,
        [first]: {
          ...state.combat.responders[first]!,
          health: 0,
          injuries: 3,
          incapacitated: true,
        },
      },
    },
    world: {
      ...state.world,
      positions: { ...state.world.positions, [second]: { x: 73, y: 55 } },
    },
  };
  state = orderResponder(state, second, "stabilize", undefined, first).state;
  const origin = state.world.positions[second]!;
  state = advanceSimulation(state);
  expect(
    Math.abs(state.world.positions[second]!.x - origin.x) +
      Math.abs(state.world.positions[second]!.y - origin.y),
  ).toBe(1);
  expect(state.combat.responders[second]!.medicalSupplies).toBe(2);
  expect(state.combat.responders[first]!.stabilized).toBe(false);
  for (
    let tick = 0;
    tick < 30 && !state.combat.responders[first]!.stabilized;
    tick += 1
  )
    state = advanceSimulation(state);
  expect(state.combat.responders[first]!.stabilized).toBe(true);
  expect(state.combat.responders[second]!.medicalSupplies).toBe(1);
  expect(load(state).status).toBe("loaded");
});
