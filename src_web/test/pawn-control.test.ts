import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import { createPawnControl } from "../src/adapters/browser/pawn-control";

afterEach(() => vi.unstubAllGlobals());
function setup() {
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
  const controller = createController(createInitialState());
  controller.setRunning(false);
  const changed = vi.fn();
  const inspect = vi.fn();
  const view = createPawnControl(canvas, controller, changed, inspect);
  view.render(controller.getSnapshot(), "world", false);
  return { window, controller, changed, inspect, view };
}
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
  document
    .querySelector<HTMLButtonElement>(".pawn-context-menu button")!
    .click();
  expect(changed).toHaveBeenCalledOnce();
  expect(
    controller.getSnapshot().game.combat.responders[id]!.destination,
  ).toEqual(target);
  expect(controller.getSnapshot().game.world.positions[id]).toEqual(origin);
  view.ground(target, "tile:55,55:structure", { x: 30, y: 30 });
  document
    .querySelector<HTMLButtonElement>('[data-interaction="inspect"]')!
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
  expect(
    document.querySelector<HTMLButtonElement>(".pawn-context-menu button")!
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
  expect(document.activeElement).toBe(choose);
  document
    .querySelector(".pawn-context-menu")!
    .dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "End", bubbles: true }),
    );
  expect(document.activeElement).toBe(
    document.querySelector('[data-interaction="inspect"]'),
  );
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
    '[aria-label="Cancel Current Action"]',
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
  expect(cancel.disabled).toBe(true);
});
