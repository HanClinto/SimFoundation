import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createConstructionWindow } from "../src/adapters/browser/construction-view";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";

afterEach(() => vi.unstubAllGlobals());
describe("independent construction inspector", () => {
  it("retains locate and cancellation for saved annex work without new authorization", () => {
    const window = new JSDOM("<!doctype html><body></body>").window;
    vi.stubGlobal("document", window.document);
    vi.stubGlobal("Option", window.Option);
    const controller = createController(createInitialState());
    const locate = vi.fn();
    const view = createConstructionWindow(document.body, controller, locate);
    expect(view.element.querySelector("[data-plan-laboratory]")).toBeNull();
    view.render(controller.placeLaboratory({ x: 59, y: 80 }).snapshot);
    view.element
      .querySelector<HTMLButtonElement>("[data-focus-blueprint]")!
      .click();
    expect(locate).toHaveBeenCalledWith({ x: 63, y: 83 });
    view.element
      .querySelector<HTMLButtonElement>("[data-cancel-blueprint]")!
      .click();
    expect(controller.getSnapshot().game.construction.availableMaterials).toBe(
      160,
    );
    expect(
      view.element.querySelector("[data-construction-command-status]")
        ?.textContent,
    ).toContain("cancelled");
  });
});
