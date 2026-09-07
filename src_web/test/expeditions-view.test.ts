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
  const view = createExpeditionsWindow(
    document.body,
    controller,
    vi.fn(),
    vi.fn(),
    vi.fn(),
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
});
