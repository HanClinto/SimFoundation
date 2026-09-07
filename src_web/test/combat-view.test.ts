import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import { createCombatWindow } from "../src/adapters/browser/combat-view";
import type { PlacementRequest } from "../src/adapters/browser/placement";

afterEach(() => vi.unstubAllGlobals());
it("drafts and issues physical map orders, while Recorded controls stay read-only", () => {
  const window = new JSDOM().window;
  vi.stubGlobal("document", window.document);
  vi.stubGlobal("Option", window.Option);
  const controller = createController(createInitialState());
  const begin = vi.fn<(request: PlacementRequest) => void>();
  const view = createCombatWindow(document.body, controller, begin, vi.fn());
  view.element
    .querySelector<HTMLButtonElement>("[data-tactical-draft]")!
    .click();
  expect(
    controller.getSnapshot().game.combat.responders["person-caleb-ward"]!
      .drafted,
  ).toBe(true);
  view.element
    .querySelector<HTMLButtonElement>("[data-tactical-move]")!
    .click();
  const request = begin.mock.calls[0]![0];
  expect(request.validate(request.origin, controller.getSnapshot())).toBeNull();
  expect(request.confirm(request.origin).accepted).toBe(true);
  expect(
    controller.getSnapshot().game.combat.responders["person-caleb-ward"]!.order,
  ).toBe("move");
  view.select("person-caleb-ward", controller.getSnapshot(), "recorded");
  expect(
    view.element.querySelector<HTMLButtonElement>("[data-tactical-move]")!
      .disabled,
  ).toBe(true);
  expect(view.element.textContent).toContain("live tactical state withheld");
});
