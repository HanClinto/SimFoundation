import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import { createExpeditionsWindow } from "../src/adapters/browser/expeditions-view";
afterEach(() => vi.unstubAllGlobals());
it("submits a finite team loadout and waits for physical assembly before dispatch", () => {
  const window = new JSDOM().window;
  vi.stubGlobal("document", window.document);
  vi.stubGlobal("Option", window.Option);
  const controller = createController(createInitialState());
  const control = vi.fn(() => null as string | null);
  const view = createExpeditionsWindow(
    document.body,
    controller,
    vi.fn(),
    vi.fn(),
    control,
    vi.fn(),
  );
  expect(view.element.textContent).toContain("Relay Depot 14");
  view.element
    .querySelector<HTMLButtonElement>("[data-expedition-enlist]")!
    .click();
  expect(controller.getSnapshot().game.expeditions.active!.team).toHaveLength(
    2,
  );
  expect(
    view.element.querySelector<HTMLButtonElement>("[data-expedition-dispatch]")!
      .disabled,
  ).toBe(true);
  expect(
    view.element.querySelector<HTMLInputElement>('input[type="checkbox"]')!
      .disabled,
  ).toBe(true);
  view.render(controller.advance(100));
  expect(
    view.element.querySelector<HTMLButtonElement>("[data-expedition-dispatch]")!
      .disabled,
  ).toBe(false);
  view.element
    .querySelector<HTMLButtonElement>("[data-expedition-dispatch]")!
    .click();
  expect(controller.getSnapshot().game.expeditions.active!.phase).toBe(
    "outbound",
  );
  const handoff = view.element.querySelector<HTMLButtonElement>(
    "[data-expedition-control]",
  )!;
  expect(handoff.disabled).toBe(true);
  for (const action of [
    "move",
    "hold",
    "retreat",
    "engage",
    "stabilize",
    "recover",
    "cancel-recovery",
  ])
    expect(
      view.element.querySelector(`[data-expedition-${action}]`),
    ).toBeNull();
  view.render(controller.advance(30));
  const field = controller.getSnapshot().game.expeditions.active!;
  const actorId = field.team[0]!;
  controller.queueAction({
    mapId: field.site!.world.map.id,
    actorId,
    action: "move",
    destination: { x: 7, y: 12 },
  });
  controller.queueAction({
    mapId: field.site!.world.map.id,
    actorId,
    action: "hold",
  });
  view.render(controller.getSnapshot());
  const before = controller.getSnapshot();
  expect(handoff.disabled).toBe(false);
  handoff.click();
  handoff.click();
  expect(control).toHaveBeenCalledWith(field.id, actorId);
  expect(controller.getSnapshot()).toEqual(before);
  expect(before.game.actionQueues[actorId]!.pending).toHaveLength(1);
  control.mockClear();
  view.render({
    ...before,
    game: {
      ...before.game,
      expeditions: {
        ...before.game.expeditions,
        active: { ...before.game.expeditions.active!, id: "stale-expedition" },
      },
    },
  });
  handoff.click();
  expect(control).not.toHaveBeenCalled();
  expect(
    view.element.querySelector("[data-expedition-feedback]")!.textContent,
  ).toContain("no longer available");
  expect(controller.getSnapshot()).toEqual(before);
  control.mockReturnValue(
    "Switch the map to World view to control a responder.",
  );
  handoff.click();
  expect(
    view.element.querySelector("[data-expedition-feedback]")!.textContent,
  ).toContain("World view");
  controller.recallExpedition();
  const recalled = controller.getSnapshot();
  control.mockClear();
  handoff.click();
  expect(control).not.toHaveBeenCalled();
  expect(handoff.disabled).toBe(true);
  expect(controller.getSnapshot()).toEqual(recalled);
});
