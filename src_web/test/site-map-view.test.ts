import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createSiteMap } from "../src/adapters/browser/site-map-view";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import { renderSite } from "../src/adapters/browser/renderer";
vi.mock("../src/adapters/browser/renderer", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  renderSite: vi.fn(),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("combines independent layers without changing pinned placement and cancels without mutation", () => {
  const window = new JSDOM(
    '<section><select data-camera-entity></select><span data-camera-status></span><output data-camera-zoom></output><button data-camera-action="inspect"></button><input type="checkbox" data-map-overlay="condition"/><input type="radio" data-map-base="materials"/><div data-placement-bar hidden><strong data-placement-label></strong><span data-placement-feedback></span><button data-camera-action="confirm"></button><button data-camera-action="cancel"></button></div><canvas></canvas></section>',
  ).window;
  for (const name of ["document", "Element", "Option"] as const)
    vi.stubGlobal(name, window[name]);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
    },
  );
  const root = document.querySelector("section")!;
  const canvas = root.querySelector("canvas")!;
  Object.defineProperties(canvas, {
    setPointerCapture: { value: () => {} },
    hasPointerCapture: { value: () => false },
  });
  const controller = createController(createInitialState());
  const open = vi.fn();
  const view = createSiteMap(canvas, root, controller, open);
  const confirm = vi.fn(() => ({
    accepted: true,
    message: "Queued",
    snapshot: controller.getSnapshot(),
  }));
  const request = {
    label: "Generic placement",
    origin: { x: 10, y: 20 },
    footprint: (position: { x: number; y: number }) => [{ position }],
    validate: () => null,
    confirm,
  };
  view.beginPlacement(request);
  const pointer = (type: string, clientX = 0) =>
    canvas.dispatchEvent(new window.MouseEvent(type, { clientX, button: 0 }));
  pointer("pointerdown");
  pointer("pointerup");
  pointer("pointermove", 40);
  const condition = root.querySelector<HTMLInputElement>("[data-map-overlay]")!;
  condition.checked = true;
  condition.dispatchEvent(new window.Event("change", { bubbles: true }));
  root
    .querySelector("[data-map-base]")!
    .dispatchEvent(new window.Event("change", { bubbles: true }));
  expect(vi.mocked(renderSite).mock.calls.at(-1)![2]).toMatchObject({
    base: "materials",
    overlays: { condition: true, objects: true },
    draft: { tiles: [{ position: { x: 10, y: 20 } }] },
  });
  root
    .querySelector<HTMLButtonElement>('[data-camera-action="confirm"]')!
    .click();
  expect(confirm).toHaveBeenCalledWith({ x: 10, y: 20 });
  expect(root.querySelector<HTMLElement>("[data-placement-bar]")!.hidden).toBe(
    true,
  );
  view.beginPlacement(request);
  root
    .querySelector<HTMLButtonElement>('[data-camera-action="cancel"]')!
    .click();
  expect(confirm).toHaveBeenCalledOnce();
  expect(controller.getSnapshot().game.construction.availableMaterials).toBe(
    160,
  );
  pointer("dblclick");
  expect(open).toHaveBeenLastCalledWith("tile:10,20:structure", "world");
  const floor = document.createElement("input");
  floor.dataset.mapLayer = "floor";
  root.append(floor);
  floor.dispatchEvent(new window.Event("change", { bubbles: true }));
  root
    .querySelector<HTMLButtonElement>('[data-camera-action="inspect"]')!
    .click();
  expect(open).toHaveBeenLastCalledWith("tile:10,20:floor", "world");
  const count = open.mock.calls.length;
  pointer("dblclick", 100000);
  expect(open).toHaveBeenCalledTimes(count);
});
