import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createSiteMap } from "../src/adapters/browser/site-map-view";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import { renderSite } from "../src/adapters/browser/renderer";
import { layoutPawnBubbles } from "../src/adapters/browser/pawn-bubbles";
vi.mock("../src/adapters/browser/renderer", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  renderSite: vi.fn(),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("animates cosmetic emissions without ticking and respects pause, hidden windows, and reduced motion", () => {
  const window = new JSDOM(
    '<section><select data-camera-entity></select><span data-camera-status></span><output data-camera-zoom></output><button data-camera-action="inspect"></button><input data-map-perspective="recorded"/><input type="checkbox" data-map-overlay="effects"/><div data-placement-bar><strong data-placement-label></strong><span data-placement-feedback></span><button data-camera-action="confirm"></button><button data-camera-action="cancel"></button></div><canvas></canvas></section>',
    { pretendToBeVisual: true },
  ).window;
  for (const name of ["document", "Element", "Option"] as const)
    vi.stubGlobal(name, window[name]);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
    },
  );
  let reduced = false;
  Object.defineProperty(window, "matchMedia", {
    value: () => ({
      get matches() {
        return reduced;
      },
    }),
  });
  const root = document.querySelector("section")!;
  const canvas = root.querySelector("canvas")!;
  Object.defineProperties(canvas, {
    clientWidth: { value: 760 },
    clientHeight: { value: 420 },
  });
  const controller = createController(createInitialState());
  controller.setExposureSource({
    name: "Effect",
    position: { x: 60, y: 54 },
    kind: "corrosion",
    dose: 4,
    radius: 1,
  });
  const view = createSiteMap(canvas, root, controller, vi.fn());
  const renderer = vi.mocked(renderSite);
  renderer.mockClear();
  view.animate(100);
  expect(renderer.mock.calls[0]![3]).toBe(100);
  expect(controller.getSnapshot().game.tick).toBe(0);
  view.render(controller.setRunning(false));
  renderer.mockClear();
  view.animate(500);
  expect(renderer).not.toHaveBeenCalled();
  view.render(controller.setRunning(true));
  renderer.mockClear();
  reduced = true;
  view.animate(600);
  expect(renderer.mock.calls[0]![3]).toBe(0);
  renderer.mockClear();
  view.animate(800);
  expect(renderer).not.toHaveBeenCalled();
  reduced = false;
  root.hidden = true;
  view.animate(1000);
  expect(renderer).not.toHaveBeenCalled();
  root.hidden = false;
  const effects = root.querySelector<HTMLInputElement>(
    '[data-map-overlay="effects"]',
  )!;
  effects.checked = false;
  effects.dispatchEvent(new window.Event("change", { bubbles: true }));
  renderer.mockClear();
  view.animate(1200);
  expect(renderer).not.toHaveBeenCalled();
  effects.checked = true;
  effects.dispatchEvent(new window.Event("change", { bubbles: true }));
  root
    .querySelector('[data-map-perspective="recorded"]')!
    .dispatchEvent(new window.Event("change", { bubbles: true }));
  renderer.mockClear();
  view.animate(1400);
  expect(renderer).not.toHaveBeenCalled();
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
  Object.defineProperties(canvas, {
    clientWidth: { value: 760 },
    clientHeight: { value: 420 },
  });
  view.focus({ x: 54, y: 55 });
  const home = document.createElement("button");
  home.dataset.cameraAction = "home";
  root.append(home);
  home.click();
  view.focus({ x: 54, y: 55 });
  const camera = vi.mocked(renderSite).mock.calls.at(-1)![2]!;
  const bubbles = layoutPawnBubbles(
    controller.getSnapshot().game,
    "world",
    camera.zoom,
    760,
    420,
    (position) => ({
      x: 380 + (position.x - 54 - (position.y - 55)) * 20 * camera.zoom,
      y: 210 + (position.x - 54 + position.y - 55) * 10 * camera.zoom,
    }),
    camera.selectedId,
  );
  const bubble = bubbles.find(
    (bubble) => bubble.personId === "person-mara-voss",
  )!;
  expect(bubble).toBeDefined();
  canvas.dispatchEvent(
    new window.MouseEvent("pointermove", {
      clientX: bubble.x + 5,
      clientY: bubble.y + 5,
    }),
  );
  const tooltip = root.querySelector<HTMLElement>('[role="tooltip"]')!;
  expect(tooltip.hidden).toBe(false);
  expect(tooltip.textContent).toContain("Dr. Mara Voss");
  canvas.dispatchEvent(
    new window.MouseEvent("dblclick", {
      clientX: bubble.x + 5,
      clientY: bubble.y + 5,
    }),
  );
  expect(open).toHaveBeenLastCalledWith("person-mara-voss", "world");
  const activity = document.createElement("input");
  activity.type = "checkbox";
  activity.dataset.mapOverlay = "activity";
  activity.checked = false;
  root.append(activity);
  activity.dispatchEvent(new window.Event("change", { bubbles: true }));
  expect(tooltip.hidden).toBe(true);
  const storage = document.createElement("input");
  storage.type = "checkbox";
  storage.dataset.mapOverlay = "storage";
  storage.checked = true;
  root.append(storage);
  storage.dispatchEvent(new window.Event("change", { bubbles: true }));
  const objects = document.createElement("input");
  objects.type = "checkbox";
  objects.dataset.mapOverlay = "objects";
  objects.checked = false;
  root.append(objects);
  objects.dispatchEvent(new window.Event("change", { bubbles: true }));
  view.focus({ x: 58, y: 67 });
  canvas.dispatchEvent(
    new window.MouseEvent("dblclick", { clientX: 380, clientY: 210 }),
  );
  expect(open).toHaveBeenLastCalledWith("storage:storage-1", "world");
});
