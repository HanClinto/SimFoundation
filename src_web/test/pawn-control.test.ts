import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import { createPawnControl } from "../src/adapters/browser/pawn-control";
import { advanceSimulation } from "../src/simulation/tick";
import { fieldSnapshot } from "../src/adapters/browser/expedition-controller";
import { submitAction } from "../src/simulation/action-queue";
import { routineProgress } from "../src/simulation/routines";
import { setSurface } from "../src/simulation/materials";

afterEach(() => vi.unstubAllGlobals());
function setup(initial = createInitialState()) {
  const window = new JSDOM(
    '<section><div><canvas id="test-map"></canvas></div></section>',
  ).window;
  for (const key of ["document", "DOMParser", "XMLSerializer"] as const)
    vi.stubGlobal(key, window[key]);
  const canvas = window.document.querySelector("canvas")!;
  Object.defineProperties(canvas, {
    clientWidth: { value: 500 },
    clientHeight: { value: 300 },
  });
  const controller = createController(initial);
  controller.setRunning(false);
  const changed = vi.fn();
  const inspect = vi.fn();
  const view = createPawnControl(canvas, controller, changed, inspect);
  view.render(controller.getSnapshot(), "world", false);
  return { window, controller, changed, inspect, view };
}
it("keeps routine intentions through inspection, subject switches and Recorded view, then cancels only the chosen pending action", () => {
  const { controller, view, inspect } = setup();
  const initial = controller.getSnapshot().game;
  const actor = initial.personnel[0]!;
  const other = initial.personnel[1]!;
  view.select(actor.id);
  for (const [action, targetId] of [
    ["eat", "object:meal-seat-1"],
    ["sleep", "object:bed-1"],
    ["relax", "object:break-seat-1"],
  ]) {
    view.ground({ x: 0, y: 0 }, targetId!, { x: 80, y: 80 });
    document
      .querySelector<HTMLButtonElement>(`[data-menu-target="${targetId}"]`)!
      .click();
    document
      .querySelector<HTMLButtonElement>(`[data-interaction="${action}"]`)!
      .click();
    view.render(controller.getSnapshot(), "world", false);
  }
  const queued = controller.getSnapshot();
  expect(
    queued.game.actionQueues[actor.id]!.pending.map((entry) => entry.action),
  ).toEqual(["sleep", "relax"]);
  view.ground({ x: 0, y: 0 }, "object:spare-bed", { x: 80, y: 80 });
  const target = document.querySelector<HTMLButtonElement>(
    '[data-menu-target="object:spare-bed"]',
  )!;
  target.click();
  target.click();
  expect(inspect).toHaveBeenCalledWith("object:spare-bed", "world");
  view.select(other.id);
  view.select(actor.id);
  view.render(controller.getSnapshot(), "recorded", false);
  expect(
    document.querySelector<HTMLElement>(".pawn-action-queue")!.hidden,
  ).toBe(true);
  expect(controller.getSnapshot()).toEqual(queued);
  view.render(controller.getSnapshot(), "world", false);
  const cancelSleep = [
    ...document.querySelectorAll<HTMLButtonElement>(
      ".pawn-pending-actions button",
    ),
  ].find((button) => button.title.includes("Sleep"))!;
  cancelSleep.click();
  const remaining = controller.getSnapshot().game;
  expect(remaining.actionQueues[actor.id]!.current).toEqual(
    queued.game.actionQueues[actor.id]!.current,
  );
  expect(
    remaining.actionQueues[actor.id]!.pending.map((entry) => entry.action),
  ).toEqual(["relax"]);
  expect(remaining.objects).toEqual(queued.game.objects);
  expect(view.activeId).toBe(actor.id);
  controller.setRunning(true);
  for (
    let step = 0;
    step < 200 &&
    controller.getSnapshot().game.actionQueues[actor.id]?.current.intent
      .action === "eat";
    step += 1
  )
    controller.advance(1);
  controller.setRunning(false);
  expect(
    controller.getSnapshot().game.actionQueues[actor.id]!.current.intent.action,
  ).toBe("relax");
  expect(controller.getSnapshot().game.routines.mealsConsumed).toBeGreaterThan(
    queued.game.routines.mealsConsumed,
  );
});

it("renders a door step beneath Move and hides execution details from pending actions and Recorded view", () => {
  const initial = createInitialState();
  const actorId = initial.personnel[0]!.id;
  const door = { x: 58, y: 55 };
  let state = {
    ...initial,
    world: {
      ...initial.world,
      map: setSurface(initial.world.map, door, "structure", {
        kind: "closed-door" as const,
        material: "steel" as const,
        integrity: 100,
      }),
      positions: { ...initial.world.positions, [actorId]: { x: 57, y: 55 } },
    },
  };
  state = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "move",
    destination: { x: 59, y: 55 },
  }).state;
  state = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "hold",
  }).state;
  state = advanceSimulation(state);
  const { controller, view } = setup(state);
  view.select(actorId);
  const step = document.querySelector(
    ".pawn-current-action .pawn-action-step",
  )!;
  expect(step.textContent).toBe("Open door");
  expect(step.getAttribute("data-parent-action")).toBe(
    state.actionTimings[actorId]!.key,
  );
  expect(document.querySelector(".pawn-current-action span")!.textContent).toBe(
    "Go Here",
  );
  expect(
    document.querySelector(".pawn-pending-actions .pawn-action-step")!
      .textContent,
  ).toBe("");
  const details = document.querySelector<HTMLDetailsElement>(
    ".pawn-execution-details",
  )!;
  details.open = true;
  expect(details.querySelector("ol ol")!.textContent).toBe("Open door");
  view.render(controller.getSnapshot(), "world", false);
  expect(details.open).toBe(true);
  expect(document.querySelector(".pawn-current-action .pawn-action-step")).toBe(
    step,
  );
  expect(
    controller.getSnapshot().game.actionQueues[actorId]!.pending,
  ).toHaveLength(1);
  view.render(controller.getSnapshot(), "recorded", false);
  expect(details.hidden).toBe(true);
});

it("shows generic elapsed and route readouts only on the current action, without percentage bars", () => {
  const { controller, view } = setup();
  const state = controller.getSnapshot().game;
  const actorId = state.personnel[0]!.id;
  view.select(actorId);
  expect(
    document.querySelector(".pawn-current-action .pawn-action-remaining")!
      .textContent,
  ).toBe("0 min elapsed");
  expect(
    document.querySelector<HTMLElement>(
      ".pawn-current-action .pawn-action-progress-bar",
    )!.hidden,
  ).toBe(true);
  controller.queueAction({
    mapId: state.world.map.id,
    actorId,
    action: "hold",
  });
  controller.setRunning(true);
  controller.advance(4);
  controller.setRunning(false);
  view.render(controller.getSnapshot(), "world", false);
  expect(
    document.querySelector(".pawn-current-action .pawn-action-remaining")!
      .textContent,
  ).toBe("4 min elapsed");
  controller.queueAction({
    mapId: state.world.map.id,
    actorId,
    action: "move",
    destination: { x: 60, y: 59 },
  });
  controller.queueAction({
    mapId: state.world.map.id,
    actorId,
    action: "hold",
  });
  view.render(controller.getSnapshot(), "world", false);
  expect(
    document.querySelector(".pawn-current-action .pawn-action-remaining")!
      .textContent,
  ).toContain("tiles left");
  expect(
    document.querySelector<HTMLElement>(
      ".pawn-current-action .pawn-action-progress-bar",
    )!.hidden,
  ).toBe(true);
  expect(
    document.querySelector<HTMLElement>(
      ".pawn-pending-actions .pawn-action-progress",
    )!.hidden,
  ).toBe(true);
  view.render(controller.getSnapshot(), "recorded", false);
  expect(
    document.querySelector<HTMLElement>(".pawn-action-queue")!.hidden,
  ).toBe(true);
});

it("shows paused routine progress only on the executing tile and clears it on cancellation", () => {
  let state = createInitialState();
  const actorId = state.personnel[0]!.id;
  state = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "sleep",
    targetId: "object:bed-1",
  }).state;
  state = submitAction(state, {
    mapId: state.world.map.id,
    actorId,
    action: "relax",
    targetId: "object:break-seat-1",
  }).state;
  for (let step = 0; step < 100 && !routineProgress(state, actorId); step += 1)
    state = advanceSimulation(state);
  const { controller, view } = setup(state);
  view.select(actorId);
  const bar = document.querySelector<HTMLElement>(
    '.pawn-current-action [role="progressbar"]',
  )!;
  expect(bar.getAttribute("aria-label")).toBe("Sleep progress");
  expect(bar.getAttribute("aria-valuetext")).toContain("in-game minutes");
  expect(bar.getAttribute("aria-valuetext")).toContain("Paused");
  expect(bar.parentElement!.hidden).toBe(false);
  expect(
    document.querySelector<HTMLElement>(
      ".pawn-pending-actions .pawn-action-progress",
    )!.hidden,
  ).toBe(true);
  const value = bar.getAttribute("aria-valuenow");
  view.render(controller.getSnapshot(), "world", false);
  expect(
    document.querySelector('.pawn-current-action [role="progressbar"]'),
  ).toBe(bar);
  expect(bar.getAttribute("aria-valuenow")).toBe(value);
  document
    .querySelector<HTMLButtonElement>(".pawn-current-action button")!
    .click();
  view.render(controller.getSnapshot(), "world", false);
  expect(
    document.querySelector<HTMLElement>(
      ".pawn-current-action .pawn-action-progress-bar",
    )!.hidden,
  ).toBe(true);
  expect(
    document.querySelector(".pawn-current-action .pawn-action-remaining")!
      .textContent,
  ).toContain("tiles left");
  view.render(controller.getSnapshot(), "recorded", false);
  expect(
    document.querySelector<HTMLElement>(".pawn-action-queue")!.hidden,
  ).toBe(true);
});

it.each([
  ["object:bed-1", "sleep", "Sleep"],
  ["object:meal-seat-1", "eat", "Eat"],
  ["object:break-seat-1", "relax", "Relax"],
])(
  "queues the implemented routine on %s without movement at menu submission",
  (targetId, action, label) => {
    const { controller, view } = setup();
    const state = controller.getSnapshot().game;
    const actorId = state.personnel[0]!.id;
    view.select(actorId);
    view.ground({ x: 0, y: 0 }, targetId, { x: 80, y: 80 });
    document
      .querySelector<HTMLButtonElement>(`[data-menu-target="${targetId}"]`)!
      .click();
    const button = document.querySelector<HTMLButtonElement>(
      `[data-interaction="${action}"]`,
    )!;
    expect(button.disabled).toBe(false);
    button.click();
    const next = controller.getSnapshot();
    expect(next.game.world).toEqual(state.world);
    expect(next.game.actionQueues[actorId]!.current.intent).toMatchObject({
      action,
      targetId,
    });
    view.render(next, "world", false);
    expect(
      document.querySelector(".pawn-current-action span")!.textContent,
    ).toBe(label);
    expect(
      document
        .querySelector(".pawn-current-action small")!
        .getAttribute("title"),
    ).toBe("Player");
    document
      .querySelector<HTMLButtonElement>(".pawn-current-action button")!
      .click();
    expect(
      controller.getSnapshot().game.routines.activities[actorId],
    ).toBeUndefined();
    view.render(controller.getSnapshot(), "recorded", false);
    view.ground({ x: 0, y: 0 }, targetId, { x: 80, y: 80 });
    document
      .querySelector<HTMLButtonElement>(`[data-menu-target="${targetId}"]`)!
      .click();
    expect(document.querySelector(`[data-interaction="${action}"]`)).toBeNull();
  },
);

it("shows a real automatic meal and appends player movement behind it without fighting for control", () => {
  const actorId = "person-lena-ortiz";
  let state = createInitialState();
  state = {
    ...state,
    personnel: state.personnel.map((person) => ({
      ...person,
      stress: 0,
      needs: { rest: 100, satiety: person.id === actorId ? 20 : 100 },
    })),
  };
  for (
    let step = 0;
    step < 100 &&
    !state.objects.items.some(
      (item) =>
        item.location.kind === "carried" && item.location.personId === actorId,
    );
    step += 1
  )
    state = advanceSimulation(state);
  const { controller, view } = setup(state);
  view.select(actorId);
  const tray = document.querySelector<HTMLElement>(".pawn-action-queue")!;
  expect(tray.hidden).toBe(false);
  expect(tray.querySelector(".pawn-current-action span")!.textContent).toBe(
    "Eat",
  );
  expect(
    tray.querySelector(".pawn-current-action small")!.getAttribute("title"),
  ).toBe("Need");
  expect(
    tray.querySelector<HTMLButtonElement>(".pawn-current-action button")!
      .disabled,
  ).toBe(true);
  expect(controller.getSnapshot().game.actionQueues[actorId]).toBeUndefined();
  view.ground({ x: 60, y: 59 }, "tile:60,59:floor", { x: 80, y: 80 });
  const move = document.querySelector<HTMLButtonElement>(
    '[data-interaction="move"]',
  )!;
  expect(move.disabled).toBe(false);
  move.click();
  view.render(controller.getSnapshot(), "world", false);
  expect(
    controller.getSnapshot().game.actionQueues[actorId]!.current.started,
  ).toBe(false);
  expect(tray.querySelector(".pawn-current-action span")!.textContent).toBe(
    "Eat",
  );
  expect(tray.querySelector(".pawn-pending-actions span")!.textContent).toBe(
    "Go Here",
  );
  const waitingTile = tray.querySelector(
    ".pawn-pending-actions .pawn-action-tile",
  )!;
  expect(waitingTile.getAttribute("data-reorderable")).toBe("true");
  controller.setRunning(true);
  for (
    let step = 0;
    step < 100 &&
    !controller.getSnapshot().game.actionQueues[actorId]!.current.started;
    step += 1
  )
    controller.advance();
  controller.setRunning(false);
  view.render(controller.getSnapshot(), "world", false);
  expect(tray.querySelector(".pawn-current-action span")!.textContent).toBe(
    "Go Here",
  );
  expect(
    tray.querySelector(".pawn-current-action small")!.getAttribute("title"),
  ).toBe("Player");
  expect(tray.querySelector(".pawn-current-action .pawn-action-tile")).toBe(
    waitingTile,
  );
  view.render(controller.getSnapshot(), "recorded", false);
  expect(tray.hidden).toBe(true);
});

it("shows Idle without a queue and reflects legacy tactical orders with safe current cancellation", () => {
  const { controller, view } = setup();
  const initial = controller.getSnapshot();
  const actorId = initial.game.personnel[0]!.id;
  view.select(actorId);
  const tray = document.querySelector<HTMLElement>(".pawn-action-queue")!;
  expect(tray.hidden).toBe(false);
  expect(tray.querySelector(".pawn-current-action span")!.textContent).toBe(
    "Idle",
  );
  expect(
    tray.querySelector<HTMLButtonElement>(".pawn-current-action button")!
      .hidden,
  ).toBe(true);
  expect(controller.getSnapshot()).toEqual(initial);
  controller.draftResponder(actorId, true);
  controller.orderResponder(actorId, "move", { x: 60, y: 59 });
  view.render(controller.getSnapshot(), "world", false);
  expect(tray.querySelector(".pawn-current-action span")!.textContent).toBe(
    "Go Here",
  );
  tray.querySelector<HTMLButtonElement>(".pawn-current-action button")!.click();
  view.render(controller.getSnapshot(), "world", false);
  expect(tray.querySelector(".pawn-current-action span")!.textContent).toBe(
    "Hold Position",
  );
  tray.querySelector<HTMLButtonElement>(".pawn-current-action button")!.click();
  view.render(controller.getSnapshot(), "world", false);
  expect(tray.querySelector(".pawn-current-action span")!.textContent).toBe(
    "Idle",
  );
  expect(controller.getSnapshot().game.actionQueues).toEqual({});
  view.render(controller.getSnapshot(), "recorded", false);
  expect(tray.hidden).toBe(true);
});

it("keeps transit status inspectable in the field window without a map position or actionable orders", () => {
  const { controller, view } = setup();
  const actorId = "person-caleb-ward";
  controller.enlistExpedition("notice-depot", [actorId, "person-lena-ortiz"]);
  controller.setRunning(true);
  controller.advance(100);
  controller.dispatchExpedition();
  controller.setRunning(false);
  const field = fieldSnapshot(controller.getSnapshot())!;
  expect(field.game.world.positions[actorId]).toBeUndefined();
  view.render(field, "world", false);
  const portrait = document.querySelector<HTMLButtonElement>(
    `[data-active-person="${actorId}"]`,
  )!;
  expect(portrait.disabled).toBe(false);
  portrait.click();
  expect(view.activeId).toBe(actorId);
  expect(document.querySelector(".pawn-current-action span")!.textContent).toBe(
    "Travel to site",
  );
  expect(
    document.querySelector<HTMLButtonElement>(".pawn-current-action button")!
      .disabled,
  ).toBe(true);
  expect(
    document.querySelector<HTMLButtonElement>(
      '[aria-label="Deselect active pawn"]',
    )!.disabled,
  ).toBe(false);
  view.render(field, "recorded", false);
  expect(
    document.querySelector<HTMLElement>(".pawn-action-queue")!.hidden,
  ).toBe(true);
});

it("does not replace a blocked manual intention with Idle", () => {
  const { controller, view } = setup();
  const state = controller.getSnapshot().game;
  const actorId = state.personnel[0]!.id;
  controller.queueAction({
    mapId: state.world.map.id,
    actorId,
    action: "stabilize",
    targetId: state.personnel[1]!.id,
  });
  view.render(controller.getSnapshot(), "world", false);
  view.select(actorId);
  expect(document.querySelector(".pawn-current-action span")!.textContent).toBe(
    "Stabilize",
  );
  expect(
    document.querySelector(".pawn-current-action small")!.getAttribute("title"),
  ).toBe("Blocked");
  expect(
    document.querySelector(".pawn-action-queue")!.textContent,
  ).not.toContain("Idle");
});

it("toggles only portrait activation and keeps explicit selection idempotent", () => {
  const { controller, view, inspect } = setup();
  const actor = controller.getSnapshot().game.personnel[0]!;
  view.select(actor.id);
  view.select(actor.id);
  expect(view.activeId).toBe(actor.id);
  const before = controller.getSnapshot();
  document
    .querySelector<HTMLButtonElement>(
      ".pawn-control-detail .selection-inspect-link",
    )!
    .click();
  expect(inspect).toHaveBeenCalledWith(actor.id, "world");
  document
    .querySelector<HTMLButtonElement>(`[data-active-person="${actor.id}"]`)!
    .click();
  expect(view.activeId).toBeNull();
  expect(controller.getSnapshot()).toEqual(before);
});

it("chooses targets without hover activation and inspects a chosen row even after keyboard collapse", () => {
  const { controller, view, inspect, window } = setup();
  const before = controller.getSnapshot();
  const actor = before.game.personnel[0]!;
  const other = before.game.personnel[1]!;
  view.select(actor.id);
  view.ground(before.game.world.positions[other.id]!, other.id, {
    x: 80,
    y: 80,
  });
  const target = document.querySelector<HTMLButtonElement>(
    '[data-menu-target^="tile:"]',
  )!;
  const targetId = target.dataset.menuTarget!;
  expect(target.title).toMatch(/^Choose target:/);
  target.dispatchEvent(new window.MouseEvent("mouseenter", { bubbles: true }));
  expect(target.getAttribute("aria-expanded")).toBe("false");
  target.click();
  expect(inspect).not.toHaveBeenCalled();
  expect(target.getAttribute("aria-expanded")).toBe("true");
  expect(target.title).toBe(`Inspect ${target.dataset.targetLabel}`);
  expect(document.querySelector('[data-interaction="inspect"]')).toBeNull();
  target.focus();
  target.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
  );
  document.activeElement!.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
  );
  expect(target.getAttribute("aria-expanded")).toBe("false");
  target.click();
  expect(inspect).toHaveBeenCalledWith(targetId, "world");
  expect(view.menuOpen).toBe(false);
  expect(controller.getSnapshot()).toEqual(before);
});

it("selects an actor without drafting, issues immediate Go Here and retains the actor during inspection", () => {
  const { controller, view, changed, inspect } = setup();
  const id = controller.getSnapshot().game.personnel[0]!.id;
  document
    .querySelector<HTMLButtonElement>(`[data-active-person="${id}"]`)!
    .click();
  expect(view.activeId).toBe(id);
  expect(controller.getSnapshot().game.combat.responders[id]).toBeUndefined();
  changed.mockClear();
  const origin = controller.getSnapshot().game.world.positions[id]!;
  const target = { x: origin.x + 1, y: origin.y };
  view.ground(target, `tile:${target.x},${target.y}:structure`, {
    x: 490,
    y: 290,
  });
  expect(controller.getSnapshot().game.combat.responders[id]).toBeUndefined();
  document
    .querySelector<HTMLButtonElement>('[data-interaction="move"]')!
    .click();
  expect(changed).toHaveBeenCalledOnce();
  expect(
    controller.getSnapshot().game.combat.responders[id]!.destination,
  ).toEqual(target);
  expect(controller.getSnapshot().game.world.positions[id]).toEqual(origin);
  view.ground(target, "tile:55,55:structure", { x: 30, y: 30 });
  document
    .querySelector<HTMLButtonElement>(
      '[data-menu-target="tile:55,55:structure"]',
    )!
    .click();
  expect(inspect).toHaveBeenCalledWith("tile:55,55:structure", "world");
  expect(view.activeId).toBe(id);
});
it("withholds Recorded commands, disables controls for placement, and clears missing actors", () => {
  const { controller, view, window } = setup();
  const snapshot = controller.getSnapshot();
  const id = snapshot.game.personnel[0]!.id;
  view.select(id);
  view.render(snapshot, "recorded", false);
  view.ground(
    snapshot.game.world.positions[id]!,
    "tile:54,55:structure",
    { x: 100, y: 100 },
    true,
  );
  document
    .querySelector<HTMLButtonElement>(
      '[data-menu-target="tile:54,55:structure"]',
    )!
    .click();
  expect(
    document.querySelector<HTMLButtonElement>('[data-interaction="move"]')!
      .disabled,
  ).toBe(true);
  document
    .querySelector(".pawn-context-menu")!
    .dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  expect(view.menuOpen).toBe(false);
  view.render(snapshot, "world", true);
  expect(
    document.querySelector<HTMLButtonElement>(`[data-active-person="${id}"]`)!
      .disabled,
  ).toBe(true);
  view.render(
    {
      ...snapshot,
      game: {
        ...snapshot.game,
        world: { ...snapshot.game.world, positions: {} },
      },
    },
    "world",
    false,
  );
  expect(view.activeId).toBeNull();
});

it("keeps target action rows stable, selects people explicitly, and cancels the active order", () => {
  const { controller, view, window } = setup();
  const snapshot = controller.getSnapshot();
  const actor = snapshot.game.personnel[0]!;
  const patient = snapshot.game.personnel[1]!;
  view.select(actor.id);
  view.ground(
    snapshot.game.world.positions[patient.id]!,
    patient.id,
    { x: 80, y: 80 },
    true,
  );
  expect(view.activeId).toBe(actor.id);
  document
    .querySelector<HTMLButtonElement>(`[data-menu-target="${patient.id}"]`)!
    .click();
  const stabilize = document.querySelector<HTMLButtonElement>(
    '[data-interaction="stabilize"]',
  )!;
  expect(stabilize.disabled).toBe(true);
  expect(stabilize.title).toContain("No casualty");
  expect(document.querySelector("ul.menu.pawn-context-menu")).not.toBeNull();
  view.render(snapshot, "world", false);
  expect(document.querySelector('[data-interaction="stabilize"]')).toBe(
    stabilize,
  );
  const choose = [
    ...document.querySelectorAll<HTMLButtonElement>(
      ".pawn-context-menu button",
    ),
  ].find((button) => button.textContent === "Select Person")!;
  expect(document.querySelector(".pawn-command-path")).toBeNull();
  expect(document.querySelector(".pawn-menu-subject strong")!.textContent).toBe(
    actor.name,
  );
  document
    .querySelector(".pawn-context-menu")!
    .dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "End", bubbles: true }),
    );
  expect(document.activeElement).toBe(choose);
  choose.click();
  expect(view.activeId).toBe(patient.id);
  expect(controller.getSnapshot()).toEqual(snapshot);
  const origin = snapshot.game.world.positions[patient.id]!;
  controller.goHere(snapshot.game.world.map.id, patient.id, {
    x: origin.x + 1,
    y: origin.y,
  });
  view.render(controller.getSnapshot(), "world", false);
  const cancel = document.querySelector<HTMLButtonElement>(
    ".pawn-current-action button",
  )!;
  expect(cancel.disabled).toBe(false);
  cancel.click();
  expect(
    controller.getSnapshot().game.combat.responders[patient.id],
  ).toMatchObject({ order: "hold", returnToAutonomy: true });
  expect(view.activeId).toBe(patient.id);
  view.render(controller.getSnapshot(), "recorded", false);
  view.ground(origin, actor.id, { x: 80, y: 80 });
  expect(document.querySelector('[data-interaction="stabilize"]')).toBeNull();
  expect(
    document.querySelector<HTMLElement>(".pawn-action-queue")!.hidden,
  ).toBe(true);
});

it("deselects without changing work and allows inspection without a command recipient", () => {
  const { controller, view, inspect } = setup();
  const state = controller.getSnapshot().game;
  const actorId = state.personnel[0]!.id;
  controller.queueAction({
    mapId: state.world.map.id,
    actorId,
    action: "move",
    destination: { x: 60, y: 59 },
  });
  view.render(controller.getSnapshot(), "world", false);
  view.select(actorId);
  const before = controller.getSnapshot();
  const deselect = document.querySelector<HTMLButtonElement>(
    '[aria-label="Deselect active pawn"]',
  )!;
  deselect.click();
  expect(view.activeId).toBeNull();
  expect(controller.getSnapshot()).toEqual(before);
  expect(
    document.querySelector<HTMLElement>(".pawn-action-queue")!.hidden,
  ).toBe(true);
  expect(deselect.disabled).toBe(true);
  view.ground({ x: 60, y: 59 }, "tile:60,59:floor", { x: 50, y: 50 });
  expect(view.menuOpen).toBe(false);
  expect(document.querySelector('[data-interaction="move"]')).toBeNull();
  expect(document.querySelector('[data-interaction="hold"]')).toBeNull();
  expect(inspect).toHaveBeenCalledWith("tile:60,59:floor", "world");
  view.select(actorId);
  view.render(controller.getSnapshot(), "recorded", false);
  deselect.click();
  expect(view.activeId).toBeNull();
  expect(controller.getSnapshot()).toEqual(before);
});

it.each(["world", "recorded"] as const)(
  "directly inspects a sole selection without a subject in %s view",
  (perspective) => {
    const { controller, view, inspect } = setup();
    const before = controller.getSnapshot();
    view.render(before, perspective, false);
    view.ground({ x: 60, y: 59 }, "tile:60,59:floor", { x: 50, y: 50 }, true);
    expect(inspect).toHaveBeenCalledExactlyOnceWith(
      "tile:60,59:floor",
      perspective,
    );
    expect(view.menuOpen).toBe(false);
    expect(view.activeId).toBeNull();
    expect(controller.getSnapshot()).toEqual(before);
  },
);

it("chooses a subject or inspection directly from ambiguous rows without a subject header or verbs", () => {
  const { controller, view, inspect, window } = setup();
  const before = controller.getSnapshot();
  const actor = before.game.personnel[0]!;
  view.ground(
    before.game.world.positions[actor.id]!,
    actor.id,
    { x: 80, y: 80 },
    true,
  );
  const menu = document.querySelector<HTMLElement>(".pawn-context-menu")!;
  expect(menu.getAttribute("aria-label")).toBe("Select subject or inspect");
  expect(menu.querySelector<HTMLElement>(".pawn-menu-subject")!.hidden).toBe(
    true,
  );
  expect(menu.textContent).not.toContain("No active person");
  const pawn = menu.querySelector<HTMLButtonElement>(
    `[data-menu-target="${actor.id}"]`,
  )!;
  expect(pawn.getAttribute("aria-haspopup")).toBeNull();
  pawn.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
  );
  expect(menu.querySelector(".pawn-verb-menu")).toBeNull();
  expect(view.activeId).toBeNull();
  pawn.click();
  expect(view.activeId).toBe(actor.id);
  expect(view.menuOpen).toBe(false);
  expect(inspect).not.toHaveBeenCalled();
  expect(controller.getSnapshot()).toEqual(before);
  document
    .querySelector<HTMLButtonElement>('[aria-label="Deselect active pawn"]')!
    .click();
  view.ground({ x: 0, y: 0 }, "object:spare-bed", { x: 80, y: 80 }, true);
  const object = menu.querySelector<HTMLButtonElement>(
    '[data-menu-target="object:spare-bed"]',
  )!;
  expect(object.title).toMatch(/^Inspect /);
  object.click();
  expect(inspect).toHaveBeenCalledExactlyOnceWith("object:spare-bed", "world");
  expect(view.activeId).toBeNull();
  expect(view.menuOpen).toBe(false);
  expect(controller.getSnapshot()).toEqual(before);
});

it("prioritizes a lone entity over its floor but preserves genuine overlap and explicit floor access", () => {
  const { controller, view, inspect } = setup();
  const before = controller.getSnapshot();
  const actor = before.game.personnel[0]!;
  view.ground(before.game.world.positions[actor.id]!, actor.id, {
    x: 80,
    y: 80,
  });
  expect(view.activeId).toBe(actor.id);
  expect(view.menuOpen).toBe(false);
  document
    .querySelector<HTMLButtonElement>('[aria-label="Deselect active pawn"]')!
    .click();
  view.ground({ x: 0, y: 0 }, "object:spare-bed", { x: 80, y: 80 });
  expect(inspect).toHaveBeenCalledExactlyOnceWith("object:spare-bed", "world");
  expect(view.menuOpen).toBe(false);
  inspect.mockClear();
  view.ground(
    before.game.world.positions[actor.id]!,
    actor.id,
    { x: 80, y: 80 },
    false,
    ["object:spare-bed"],
  );
  expect(view.menuOpen).toBe(true);
  expect(view.activeId).toBeNull();
  expect(inspect).not.toHaveBeenCalled();
  document
    .querySelector<HTMLButtonElement>('[data-menu-target="object:spare-bed"]')!
    .click();
  expect(inspect).toHaveBeenCalledExactlyOnceWith("object:spare-bed", "world");
  view.ground(
    before.game.world.positions[actor.id]!,
    actor.id,
    { x: 80, y: 80 },
    true,
  );
  const floor = document.querySelector<HTMLButtonElement>(
    '[data-menu-target^="tile:"]',
  )!;
  floor.click();
  expect(inspect).toHaveBeenLastCalledWith(floor.dataset.menuTarget, "world");
  expect(controller.getSnapshot()).toEqual(before);
});

it("retains the subject header without a duplicate label and returns from verbs to target branches", () => {
  const { controller, view, window } = setup();
  const snapshot = controller.getSnapshot();
  const actor = snapshot.game.personnel[0]!;
  const other = snapshot.game.personnel[1]!;
  const position = snapshot.game.world.positions[other.id]!;
  view.select(actor.id);
  view.ground({ x: 0, y: 0 }, other.id, { x: 80, y: 80 }, true);
  expect(document.querySelector(".pawn-menu-subject strong")!.textContent).toBe(
    actor.name,
  );
  expect(
    document.querySelector(".pawn-menu-subject img")!.getAttribute("src"),
  ).toContain("data:image");
  const floor = document.querySelector<HTMLButtonElement>(
    `[data-menu-target="tile:${position.x},${position.y}:floor"]`,
  )!;
  expect(floor).not.toBeNull();
  floor.focus();
  floor.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
  );
  expect(document.activeElement).toBe(
    document.querySelector('[data-interaction="move"]'),
  );
  expect(document.querySelector(".pawn-command-path")).toBeNull();
  expect(floor.getAttribute("aria-expanded")).toBe("true");
  expect(controller.getSnapshot()).toEqual(snapshot);
  document.activeElement!.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
  );
  expect(document.activeElement).toBe(floor);
  expect(floor.getAttribute("aria-expanded")).toBe("false");
  expect(floor.title).toMatch(/^Inspect /);
  floor.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
  );
  document
    .querySelector<HTMLButtonElement>('[data-interaction="move"]')!
    .click();
  expect(
    controller.getSnapshot().game.combat.responders[actor.id]!.destination,
  ).toEqual(position);
});

it("appends through the hierarchy, shows stable pending controls, and supports explicit Do Now", () => {
  const { controller, view } = setup();
  const state = controller.getSnapshot().game;
  const actorId = state.personnel[0]!.id;
  const origin = state.world.positions[actorId]!;
  view.select(actorId);
  const order = (offset: number, mode = "append") => {
    const position = { x: origin.x + offset, y: origin.y };
    const targetId = `tile:${position.x},${position.y}:floor`;
    view.ground(position, targetId, { x: 100, y: 100 });
    const targetButton = document.querySelector<HTMLButtonElement>(
      `[data-menu-target="${targetId}"]`,
    )!;
    if (targetButton.getAttribute("aria-expanded") !== "true")
      targetButton.click();
    document
      .querySelector<HTMLButtonElement>(`[data-order-mode="${mode}"]`)!
      .click();
    document
      .querySelector<HTMLButtonElement>('[data-interaction="move"]')!
      .click();
    view.render(controller.getSnapshot(), "world", false);
  };
  order(1);
  order(2);
  expect(
    controller.getSnapshot().game.combat.responders[actorId]!.destination,
  ).toEqual({ x: origin.x + 1, y: origin.y });
  const panel = document.querySelector<HTMLElement>(".pawn-action-queue")!;
  expect(panel.hidden).toBe(false);
  expect(panel.querySelectorAll(".pawn-action-tile")).toHaveLength(2);
  const remove = panel.querySelector<HTMLButtonElement>(
    ".pawn-pending-actions li button",
  )!;
  view.render(controller.getSnapshot(), "world", false);
  expect(panel.querySelector(".pawn-pending-actions li button")).toBe(remove);
  order(3, "now");
  expect(
    controller.getSnapshot().game.combat.responders[actorId]!.destination,
  ).toEqual({ x: origin.x + 3, y: origin.y });
  expect(
    controller.getSnapshot().game.actionQueues[actorId]!.pending,
  ).toHaveLength(1);
  remove.click();
  expect(
    controller.getSnapshot().game.actionQueues[actorId]!.pending,
  ).toHaveLength(0);
  view.render(controller.getSnapshot(), "recorded", false);
  expect(panel.hidden).toBe(true);
});

it("auto-expands only a sole target, renders icons and keeps order mode outside the popup across openings", () => {
  const { view, controller } = setup();
  const state = controller.getSnapshot().game;
  view.select(state.personnel[0]!.id);
  const openFloor = () =>
    view.ground({ x: 60, y: 59 }, "tile:60,59:floor", { x: 80, y: 80 });
  openFloor();
  expect(document.querySelectorAll("[data-menu-target]")).toHaveLength(1);
  expect(
    document.querySelector("[data-menu-target]")!.getAttribute("aria-expanded"),
  ).toBe("true");
  expect(document.querySelector<HTMLElement>(".pawn-verb-menu")!.hidden).toBe(
    false,
  );
  expect(document.querySelector(".pawn-context-menu select")).toBeNull();
  expect(document.querySelector(".pawn-command-path")).toBeNull();
  expect(
    document.querySelector("[data-menu-target] img")!.getAttribute("src"),
  ).toBeTruthy();
  document.querySelector<HTMLButtonElement>('[data-order-mode="now"]')!.click();
  view.close();
  openFloor();
  expect(
    document
      .querySelector('[data-order-mode="now"]')!
      .getAttribute("aria-checked"),
  ).toBe("true");
  view.close();
  const other = state.personnel[1]!;
  view.ground(state.world.positions[other.id]!, other.id, { x: 80, y: 80 });
  expect(
    document.querySelectorAll("[data-menu-target]").length,
  ).toBeGreaterThan(1);
  expect(
    document.querySelectorAll('[data-menu-target][aria-expanded="true"]'),
  ).toHaveLength(0);
  expect(document.querySelector(".pawn-verb-menu")).toBeNull();
  view.render(controller.getSnapshot(), "recorded", false);
  expect(
    document.querySelector<HTMLButtonElement>('[data-order-mode="now"]')!
      .disabled,
  ).toBe(true);
});

it("reorders pending tray tiles with drag and keyboard while keeping the current action pinned", () => {
  const { view, controller, window } = setup();
  const state = controller.getSnapshot().game;
  const actorId = state.personnel[0]!.id;
  view.select(actorId);
  for (let offset = 0; offset < 4; offset += 1)
    controller.queueAction({
      mapId: state.world.map.id,
      actorId,
      action: "move",
      destination: { x: 60 + offset, y: 59 },
    });
  view.render(controller.getSnapshot(), "world", false);
  const before = controller.getSnapshot().game;
  const [first, second, third] = before.actionQueues[actorId]!.pending;
  const tiles = () => [
    ...document.querySelectorAll<HTMLElement>(
      ".pawn-pending-actions .pawn-action-tile",
    ),
  ];
  const source = tiles()[2]!;
  const target = tiles()[0]!;
  expect(
    document.querySelector<HTMLElement>(
      ".pawn-current-action .pawn-action-tile",
    )!.draggable,
  ).toBe(false);
  expect(source.dataset.reorderable).toBe("true");
  Object.assign(source, {
    setPointerCapture: () => {},
    hasPointerCapture: () => false,
  });
  vi.spyOn(target.parentElement!, "getBoundingClientRect").mockReturnValue({
    left: 100,
    right: 186,
    top: 0,
    bottom: 108,
    width: 86,
    height: 108,
  } as DOMRect);
  vi.spyOn(
    document.querySelector(".pawn-pending-actions")!,
    "getBoundingClientRect",
  ).mockReturnValue({
    left: 100,
    right: 400,
    top: 0,
    bottom: 108,
    width: 300,
    height: 108,
  } as DOMRect);
  for (const [type, clientX] of [
    ["pointerdown", 320],
    ["pointermove", 110],
    ["pointerup", 110],
  ] as const)
    source.dispatchEvent(
      new window.MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY: 25,
        button: 0,
      }),
    );
  expect(controller.getSnapshot().game.actionQueues[actorId]!.pending).toEqual([
    third,
    first,
    second,
  ]);
  view.render(controller.getSnapshot(), "world", false);
  expect(tiles()[0]).toBe(source);
  source.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "ArrowRight",
      altKey: true,
      bubbles: true,
    }),
  );
  expect(controller.getSnapshot().game.actionQueues[actorId]!.pending).toEqual([
    first,
    third,
    second,
  ]);
  expect(controller.getSnapshot().game.combat).toEqual(before.combat);
  expect(controller.getSnapshot().game.objects).toEqual(before.objects);
  view.render(controller.getSnapshot(), "world", true);
  expect(source.dataset.reorderable).toBe("false");
  expect(source.querySelector<HTMLButtonElement>("button")!.disabled).toBe(
    true,
  );
});
