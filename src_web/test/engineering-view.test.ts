import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createEngineeringWindow } from "../src/adapters/browser/engineering-view";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import { surfaceAt } from "../src/simulation/materials";
afterEach(() => vi.unstubAllGlobals());
it("orders the selected layer and operates real doors without granting research", () => {
  const window = new JSDOM("<!doctype html><body></body>").window;
  vi.stubGlobal("document", window.document);
  const controller = createController(createInitialState());
  const view = createEngineeringWindow(document.body, controller);
  view.select({ x: 61, y: 54 }, controller.getSnapshot(), "floor");
  view.element.querySelector<HTMLSelectElement>("#surface-material")!.value =
    "steel";
  view.element
    .querySelector<HTMLButtonElement>("[data-replace-surface]")!
    .click();
  expect(controller.getSnapshot().game.environment.orders[0]).toMatchObject({
    layer: "floor",
    material: "steel",
  });
  view.select({ x: 68, y: 58 }, controller.getSnapshot(), "structure");
  view.element.querySelector<HTMLButtonElement>("[data-operate-door]")!.click();
  expect(
    surfaceAt(
      controller.getSnapshot().game.world.map,
      { x: 68, y: 58 },
      "structure",
    )?.kind,
  ).toBe("door");
  expect(view.element.querySelector("[data-operate-door]")?.textContent).toBe(
    "Close door",
  );
  expect(
    view.element.querySelector("[data-surface-feedback]")?.textContent,
  ).toBe("Door control set to open.");
  expect(
    controller.getSnapshot().game.capabilities.anomalousPsychometrics,
  ).toBe(false);
  view.element
    .querySelector<HTMLInputElement>("#automatic-surface-repairs")!
    .click();
  expect(controller.getSnapshot().game.environment.automaticRepairs).toBe(true);
});
