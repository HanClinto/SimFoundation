import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createInitialState } from "../src/simulation/state";
import { createController } from "../src/application/controller";
import { createVesselWindow } from "../src/adapters/browser/vessel-view";
import { createExposureWindow } from "../src/adapters/browser/exposure-view";
import type { PlacementRequest } from "../src/adapters/browser/placement";

afterEach(() => vi.unstubAllGlobals());
it("fabricates by preview and exposes physical loading, sealing and scheduled deposit controls", () => {
  const window = new JSDOM("<!doctype html><body></body>").window;
  vi.stubGlobal("document", window.document);
  vi.stubGlobal("Option", window.Option);
  const controller = createController(createInitialState());
  const begin = vi.fn<(request: PlacementRequest) => void>();
  const view = createVesselWindow(
    document.body,
    controller,
    begin,
    vi.fn(),
    vi.fn(),
  );
  view.element.querySelector<HTMLSelectElement>("#vessel-material")!.value =
    "ceramic";
  view.element.querySelector<HTMLButtonElement>("[data-vessel-craft]")!.click();
  expect(controller.getSnapshot().game.vesselWork.orders).toHaveLength(0);
  expect(begin.mock.calls[0]![0].confirm({ x: 66, y: 65 }).accepted).toBe(true);
  for (
    let tick = 0;
    tick < 200 &&
    controller.getSnapshot().game.vesselWork.orders[0]!.phase !== "completed";
    tick += 1
  )
    view.render(controller.advance());
  const cargo = view.element.querySelector<HTMLSelectElement>("#vessel-cargo")!;
  cargo.value = "spare-meal-seat";
  cargo.dispatchEvent(new window.Event("change"));
  const load =
    view.element.querySelector<HTMLButtonElement>("[data-vessel-load]")!;
  expect(load.disabled).toBe(false);
  load.click();
  for (
    let tick = 0;
    tick < 100 &&
    controller.getSnapshot().game.vesselWork.orders.at(-1)!.phase !==
      "completed";
    tick += 1
  )
    view.render(controller.advance());
  expect(
    view.element.querySelector("[data-vessel-record]")!.textContent,
  ).toContain("spare-meal-seat");
  view.element.querySelector<HTMLButtonElement>("[data-vessel-seal]")!.click();
  for (
    let tick = 0;
    tick < 100 &&
    controller.getSnapshot().game.vesselWork.orders.at(-1)!.phase !==
      "completed";
    tick += 1
  )
    view.render(controller.advance());
  expect(
    view.element.querySelector<HTMLButtonElement>("[data-vessel-transport]")!
      .disabled,
  ).toBe(false);
  const bound = controller.setExposureSource({
    name: "Contained cargo",
    position: { x: 66, y: 65 },
    objectId: "spare-meal-seat",
    kind: "corrosion",
    dose: 4,
    radius: 1,
    enabled: true,
  });
  const exposure = createExposureWindow(
    document.body,
    controller,
    vi.fn(),
    vi.fn(),
  );
  exposure.select(
    bound.snapshot.game.environment.sources[0]!.id,
    bound.snapshot,
  );
  expect(
    exposure.element.querySelector("[data-exposure-record]")!.textContent,
  ).toContain("Inside vessel-1");
  expect(
    exposure.element.querySelector("[data-exposure-record]")!.textContent,
  ).toContain("Contained / source active");
  view.element
    .querySelector<HTMLButtonElement>("[data-vessel-transport]")!
    .click();
  const request = begin.mock.calls.at(-1)![0];
  expect(request.confirm({ x: 54, y: 59 }).accepted).toBe(true);
  expect(controller.getSnapshot().game.vesselWork.orders.at(-1)).toMatchObject({
    action: "transport",
    phase: "working",
    transport: { mode: "helicopter", duration: 120, arrivesAt: null },
  });
});
