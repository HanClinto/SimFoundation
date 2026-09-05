import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createContainmentTrialWindow } from "../src/adapters/browser/containment-trial-view";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";

afterEach(() => vi.unstubAllGlobals());
describe("containment investigation file", () => {
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
