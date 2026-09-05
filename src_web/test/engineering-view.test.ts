import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createEngineeringWindow } from "../src/adapters/browser/engineering-view";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import { surfaceAt } from "../src/simulation/materials";
afterEach(() => vi.unstubAllGlobals());
it("explains an empty selection, absent layers, pending orders and insufficient stock", () => {
  const window = new JSDOM("<!doctype html><body></body>").window;
  vi.stubGlobal("document", window.document);
  const controller = createController(createInitialState());
  const view = createEngineeringWindow(document.body, controller);
  const button = view.element.querySelector<HTMLButtonElement>(
    "[data-replace-surface]",
  )!;
  const reason = view.element.querySelector<HTMLElement>(
    "[data-surface-availability]",
  )!;
  expect(button.disabled).toBe(true);
  expect(reason.textContent).toBe("No tile selected.");
  expect(
    view.element.querySelector<HTMLButtonElement>(
      '[data-open-related-window="camera-window"]',
    )!.hidden,
  ).toBe(false);
  view.select({ x: 56, y: 55 }, controller.getSnapshot(), "structure", "world");
  expect(reason.textContent).toBe("No structure installed at this tile.");
  const layer =
    view.element.querySelector<HTMLSelectElement>("#surface-layer")!;
  layer.value = "floor";
  layer.dispatchEvent(new window.Event("change"));
  expect(button.disabled).toBe(false);
  expect(reason.hidden).toBe(true);
  button.click();
  expect(button.disabled).toBe(true);
  expect(reason.textContent).toBe("Replacement already queued: collecting.");
  view.select({ x: 61, y: 54 }, controller.getSnapshot(), "structure", "world");
  const state = controller.getSnapshot();
  view.render({
    ...state,
    game: {
      ...state.game,
      construction: { ...state.game.construction, availableMaterials: 0 },
    },
  });
  expect(reason.textContent).toBe(
    "Replacement requires 2 material units; 0 available.",
  );
  expect(button.disabled).toBe(true);
});
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
  view.select({ x: 61, y: 55 }, controller.getSnapshot(), "structure");
  view.element.querySelector<HTMLButtonElement>("[data-operate-door]")!.click();
  expect(
    surfaceAt(
      controller.getSnapshot().game.world.map,
      { x: 61, y: 55 },
      "structure",
    )?.kind,
  ).toBe("closed-door");
  expect(view.element.querySelector("[data-operate-door]")?.textContent).toBe(
    "Open door",
  );
  expect(
    view.element.querySelector("[data-surface-feedback]")?.textContent,
  ).toBe("Door control set to closed.");
  expect(
    controller.getSnapshot().game.capabilities.anomalousPsychometrics,
  ).toBe(false);
  view.element
    .querySelector<HTMLInputElement>("#automatic-surface-repairs")!
    .click();
  expect(controller.getSnapshot().game.environment.automaticRepairs).toBe(true);
  const policy = view.element.querySelector<HTMLSelectElement>("#door-policy")!;
  expect(policy.value).toBe("held-closed");
  policy.value = "automatic";
  policy.dispatchEvent(new window.Event("change"));
  expect(
    controller.getSnapshot().game.world.map.doorPolicies?.[55 * 128 + 61],
  ).toBe("automatic");
  expect(
    view.element.querySelector("[data-surface-feedback]")?.textContent,
  ).toBe("Door policy saved.");
  expect(
    view.element.querySelector("[data-tile-record]")?.textContent,
  ).toContain("Door policyautomatic");
});
