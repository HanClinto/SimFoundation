import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import { createPowerWindow } from "../src/adapters/browser/power-view";
import { powerNetwork } from "../src/simulation/power";
import type { PlacementRequest } from "../src/adapters/browser/placement";

afterEach(() => vi.unstubAllGlobals());
it("exposes real switching and finite installation through the shared placement request", () => {
  const window = new JSDOM().window;
  vi.stubGlobal("document", window.document);
  vi.stubGlobal("Option", window.Option);
  const controller = createController(createInitialState());
  const begin = vi.fn<(request: PlacementRequest) => void>();
  const view = createPowerWindow(
    document.body,
    controller,
    begin,
    vi.fn(),
    vi.fn(),
  );
  expect(view.element.textContent).toContain("24 / 21 units");
  view.element.querySelector<HTMLInputElement>("#power-enabled")!.click();
  expect(
    powerNetwork(controller.getSnapshot().game).readings["light-1"]!.status,
  ).toBe("disconnected");
  view.element.querySelector<HTMLButtonElement>("[data-power-place]")!.click();
  const request = begin.mock.calls[0]![0];
  expect(
    request.validate({ x: 73, y: 66 }, controller.getSnapshot()),
  ).toBeNull();
  expect(request.confirm({ x: 73, y: 66 }).accepted).toBe(true);
  expect(controller.getSnapshot().game.objectOrders).toHaveLength(1);
  view.select("generator-main", controller.getSnapshot(), "recorded");
  expect(
    view.element.querySelector<HTMLInputElement>("#power-enabled")!.disabled,
  ).toBe(true);
  expect(
    view.element.querySelector<HTMLButtonElement>("[data-power-place]")!
      .disabled,
  ).toBe(true);
  expect(view.element.textContent).toContain(
    "current circuit and lighting state unavailable",
  );
});
