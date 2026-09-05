import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createContainmentTrialWindow } from "../src/adapters/browser/containment-trial-view";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";

afterEach(() => vi.unstubAllGlobals());
describe("containment investigation file", () => {
  it("sets repair policy without ordering work and links both physical barriers", () => {
    const window = new JSDOM("<!doctype html><body></body>").window;
    vi.stubGlobal("document", window.document);
    const controller = createController(createInitialState());
    const inspect = vi.fn();
    const view = createContainmentTrialWindow(
      document.body,
      controller,
      () => {},
      inspect,
    );
    view.element.querySelector<HTMLSelectElement>(
      "[data-repair-material]",
    )!.value = "ceramic";
    view.element.querySelector<HTMLInputElement>("#trial-auto-repair")!.click();
    expect(controller.getSnapshot().game.containmentTrial).toMatchObject({
      automaticRepairs: true,
      repairMaterial: "ceramic",
      workOrderId: null,
    });
    view.element
      .querySelector<HTMLButtonElement>('[data-trial-inspect="primary"]')!
      .click();
    view.element
      .querySelector<HTMLButtonElement>('[data-trial-inspect="secondary"]')!
      .click();
    expect(inspect.mock.calls).toEqual([
      [{ x: 70, y: 61 }],
      [{ x: 70, y: 63 }],
    ]);
    view.element.querySelector<HTMLButtonElement>("[data-trial-fit]")!.click();
    expect(
      view.element.querySelector("[data-trial-stage]")?.textContent,
    ).toContain("collect materials");
  });
  it("makes installation prerequisites visible and disables premature exposure", () => {
    const window = new JSDOM("<!doctype html><body></body>").window;
    vi.stubGlobal("document", window.document);
    const controller = createController(createInitialState());
    const view = createContainmentTrialWindow(
      document.body,
      controller,
      () => {},
    );
    expect(
      view.element.querySelector<HTMLButtonElement>("[data-trial-authorize]")
        ?.disabled,
    ).toBe(true);
    expect(view.element.querySelector("[data-trial-stage]")?.textContent).toBe(
      "1. Fit a barrier",
    );
    view.element.querySelector<HTMLButtonElement>("[data-trial-fit]")!.click();
    expect(
      view.element.querySelector<HTMLButtonElement>("[data-trial-fit]")
        ?.disabled,
    ).toBe(true);
    expect(
      view.element.querySelector<HTMLProgressElement>("[data-trial-progress]")
        ?.hidden,
    ).toBe(false);
    expect(
      view.element.querySelector("[data-trial-next]")?.textContent,
    ).toContain("engineering completes installation");
    view.render(controller.advance(100));
    expect(
      view.element.querySelector<HTMLButtonElement>("[data-trial-authorize]")
        ?.disabled,
    ).toBe(false);
    expect(view.element.querySelector("[data-trial-stage]")?.textContent).toBe(
      "2. Ready for authorization",
    );
  });
  it("uses recorded readings rather than exposing an unseen barrier failure", () => {
    const window = new JSDOM("<!doctype html><body></body>").window;
    vi.stubGlobal("document", window.document);
    const initial = createInitialState();
    const state = {
      ...initial,
      containmentTrial: {
        ...initial.containmentTrial,
        phase: "breached" as const,
        integrity: 0,
        lastReading: {
          observedTick: 0,
          phase: "ready" as const,
          integrity: 100,
          elapsed: 0,
          material: "ceramic" as const,
          protocol: "passive" as const,
        },
      },
    };
    const view = createContainmentTrialWindow(
      document.body,
      createController(state),
      () => {},
    );
    expect(view.element.querySelector("[data-trial-phase]")?.textContent).toBe(
      "ready",
    );
    expect(
      view.element.querySelector("[data-trial-integrity]")?.textContent,
    ).toBe("100% / Vitrified ceramic");
    view.element
      .querySelector<HTMLButtonElement>('[data-trial-page="materials"]')!
      .click();
    expect(
      view.element.querySelector<HTMLElement>(
        '[data-trial-section="materials"]',
      )?.hidden,
    ).toBe(false);
    expect(
      view.element.querySelector<HTMLElement>('[data-trial-section="case"]')
        ?.hidden,
    ).toBe(true);
  });
});
