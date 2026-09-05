import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createExposureWindow } from "../src/adapters/browser/exposure-view";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import type { PlacementRequest } from "../src/adapters/browser/placement";

afterEach(() => vi.unstubAllGlobals());
it("places sandbox sources through preview, preserves drafts, toggles emission, and removes without repairing damage", () => {
  const window = new JSDOM("<!doctype html><body></body>").window;
  vi.stubGlobal("document", window.document);
  vi.stubGlobal("Option", window.Option);
  const controller = createController(createInitialState());
  const begin = vi.fn<(request: PlacementRequest) => void>();
  const locate = vi.fn();
  const view = createExposureWindow(document.body, controller, begin, locate);
  view.element
    .querySelector<HTMLButtonElement>("[data-exposure-place]")!
    .click();
  const request = begin.mock.calls[0]![0];
  expect(controller.getSnapshot().game.environment.sources).toEqual([]);
  expect(
    request.validate({ x: 61, y: 54 }, controller.getSnapshot()),
  ).toContain("unobstructed");
  expect(request.confirm({ x: 60, y: 54 }).accepted).toBe(true);
  const name = view.element.querySelector<HTMLInputElement>("#exposure-name")!;
  name.value = "Edited source";
  view.render(controller.advance());
  expect(name.value).toBe("Edited source");
  view.element
    .querySelector<HTMLButtonElement>("[data-exposure-save]")!
    .click();
  expect(controller.getSnapshot().game.environment.sources[0]!.name).toBe(
    "Edited source",
  );
  const enabled =
    view.element.querySelector<HTMLInputElement>("#exposure-enabled")!;
  enabled.click();
  expect(controller.getSnapshot().game.environment.sources[0]!.enabled).toBe(
    false,
  );
  expect(
    view.element.querySelector("[data-exposure-record]")!.textContent,
  ).toContain("Disabled");
  view.element
    .querySelector<HTMLButtonElement>("[data-exposure-locate]")!
    .click();
  expect(locate).toHaveBeenCalledWith({ x: 60, y: 54 });
  const map = controller.getSnapshot().game.world.map;
  view.element
    .querySelector<HTMLButtonElement>("[data-exposure-remove]")!
    .click();
  expect(controller.getSnapshot().game.environment.sources).toEqual([]);
  expect(controller.getSnapshot().game.world.map).toEqual(map);
});
