import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createInitialState } from "../src/simulation/state";
import { createController } from "../src/application/controller";
import { createVesselWindow } from "../src/adapters/browser/vessel-view";
import { createExposureWindow } from "../src/adapters/browser/exposure-view";
import type { PlacementRequest } from "../src/adapters/browser/placement";

afterEach(() => vi.unstubAllGlobals());
it("repairs an empty case through delivered supplies and reports why repair is unavailable", () => {
  const window = new JSDOM("<!doctype html><body></body>").window;
  vi.stubGlobal("document", window.document);
  vi.stubGlobal("Option", window.Option);
  const controller = createController(createInitialState());
  controller.craftVessel({ x: 66, y: 65 }, "steel");
  for (
    let tick = 0;
    tick < 200 &&
    controller.getSnapshot().game.vesselWork.orders[0]!.phase !== "completed";
    tick += 1
  )
    controller.advance();
  const view = createVesselWindow(
    document.body,
    controller,
    vi.fn(),
    vi.fn(),
    vi.fn(),
  );
  view.select("vessel-1", controller.getSnapshot());
  const repair = view.element.querySelector<HTMLButtonElement>(
    "[data-vessel-repair]",
  )!;
  expect(repair.disabled).toBe(true);
  expect(repair.title).toBe("Case is fully intact.");
  const initial = controller.getSnapshot().game;
  view.render(
    controller.replaceState({
      ...initial,
      objects: {
        ...initial.objects,
        items: initial.objects.items.map((item) =>
          item.id === "vessel-1" ? { ...item, condition: 0 } : item,
        ),
      },
    }),
  );
  expect(repair.disabled).toBe(false);
  expect(repair.textContent).toContain("8 units");
  repair.click();
  expect(controller.getSnapshot().game.construction.availableMaterials).toBe(
    136,
  );
  expect(repair.disabled).toBe(true);
  for (
    let tick = 0;
    tick < 200 &&
    controller.getSnapshot().game.vesselWork.orders.at(-1)!.phase !==
      "completed";
    tick += 1
  )
    view.render(controller.advance());
  expect(
    controller
      .getSnapshot()
      .game.objects.items.find((item) => item.id === "vessel-1")!.condition,
  ).toBe(100);
  expect(repair.title).toBe("Case is fully intact.");
});
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
  const worn = {
    ...bound.snapshot.game,
    objects: {
      ...bound.snapshot.game.objects,
      items: bound.snapshot.game.objects.items.map((item) =>
        item.kind === "vessel" ? { ...item, condition: 2 } : item,
      ),
    },
  };
  view.render(controller.replaceState(worn));
  const duration =
    view.element.querySelector<HTMLInputElement>("#vessel-duration")!;
  duration.value = "30";
  duration.dispatchEvent(new window.Event("input"));
  expect(
    view.element.querySelector("[data-vessel-forecast]")!.textContent,
  ).toContain("0.80%");
  duration.value = "120";
  duration.dispatchEvent(new window.Event("input"));
  expect(
    view.element.querySelector("[data-vessel-forecast]")!.textContent,
  ).toContain("Breach risk");
  expect(
    view.element.querySelector<HTMLButtonElement>("[data-vessel-transport]")!
      .disabled,
  ).toBe(false);
  view.element
    .querySelector<HTMLButtonElement>("[data-vessel-transport]")!
    .click();
  const request = begin.mock.calls.at(-1)![0];
  expect(request.label).toContain("Breach risk");
  expect(request.confirm({ x: 54, y: 59 }).accepted).toBe(true);
  expect(controller.getSnapshot().game.vesselWork.orders.at(-1)).toMatchObject({
    action: "transport",
    phase: "working",
    transport: { mode: "helicopter", duration: 120, arrivesAt: null },
  });
});
