import { JSDOM } from "jsdom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
beforeEach(() => {
  const window = new JSDOM().window;
  vi.stubGlobal("DOMParser", window.DOMParser);
  vi.stubGlobal("XMLSerializer", window.XMLSerializer);
});

it("animates physical activity without emissions or ticking and respects pause, hidden windows, and reduced motion", () => {
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
  const view = createSiteMap(canvas, root, controller, vi.fn());
  const renderer = vi.mocked(renderSite);
  renderer.mockClear();
  view.animate(100);
  expect(renderer.mock.calls[0]![3]).toBe(100);
  expect(controller.getSnapshot().game.tick).toBe(0);
  const initial = controller.getSnapshot();
  const id = initial.game.personnel[0]!.id;
  const origin = initial.game.world.positions[id]!;
  view.render({
    ...initial,
    game: {
      ...initial.game,
      tick: 1,
      world: {
        ...initial.game.world,
        positions: {
          ...initial.game.world.positions,
          [id]: { x: origin.x + 1, y: origin.y },
        },
      },
    },
  });
  view.animate(300);
  expect(renderer.mock.calls.at(-1)![4]![id]!.position.x).toBe(origin.x + 0.5);
  expect(renderer.mock.calls.at(-1)![4]![id]!.pose).toMatch(/^walk-/);
  expect(controller.getSnapshot()).toEqual(initial);
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
  expect(renderer.mock.calls[0]![3]).toBe(1200);
  expect(renderer.mock.calls[0]![2]!.overlays!.effects).toBe(false);
  effects.checked = true;
  effects.dispatchEvent(new window.Event("change", { bubbles: true }));
  root
    .querySelector('[data-map-perspective="recorded"]')!
    .dispatchEvent(new window.Event("change", { bubbles: true }));
  renderer.mockClear();
  view.animate(1400);
  expect(renderer.mock.calls[0]![3]).toBe(1400);
  expect(renderer.mock.calls[0]![2]!.perspective).toBe("recorded");
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
  expect(view.controlPerson("person-caleb-ward")).toContain("placement");
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
  const snapshot = controller.getSnapshot();
  const priorConfirms = confirm.mock.calls.length;
  expect(view.beginWorldPlacement(request)).toBeNull();
  expect(view.beginWorldPlacement(request)).toContain("current placement");
  const perspective = document.createElement("input");
  perspective.dataset.mapPerspective = "recorded";
  root.append(perspective);
  perspective.dispatchEvent(new window.Event("change", { bubbles: true }));
  expect(
    root.querySelector<HTMLButtonElement>('[data-camera-action="confirm"]')!
      .disabled,
  ).toBe(true);
  canvas.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));
  expect(confirm.mock.calls).toHaveLength(priorConfirms);
  root
    .querySelector<HTMLButtonElement>('[data-camera-action="cancel"]')!
    .click();
  expect(view.beginWorldPlacement(request)).toContain("World view");
  expect(controller.getSnapshot()).toEqual(snapshot);
});

it("follows only the selected perspective's position and releases the camera for manual navigation", () => {
  const window = new JSDOM(
    '<section><select data-camera-entity></select><input type="checkbox" data-camera-follow/><input type="radio" data-map-perspective="recorded"/><span data-camera-status></span><output data-camera-zoom></output><button data-camera-action="inspect"></button><div data-placement-bar><strong data-placement-label></strong><span data-placement-feedback></span><button data-camera-action="confirm"></button><button data-camera-action="cancel"></button></div><canvas></canvas></section>',
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
    clientWidth: { value: 760 },
    clientHeight: { value: 420 },
  });
  const controller = createController(createInitialState());
  const initial = controller.advance();
  root.querySelector('[data-camera-action="inspect"]')!.remove();
  const openRecord = vi.fn();
  const view = createSiteMap(canvas, root, controller, openRecord);
  const follow = root.querySelector<HTMLInputElement>("[data-camera-follow]")!;
  const select = root.querySelector<HTMLSelectElement>("[data-camera-entity]")!;
  const personId = "person-mara-voss";
  const camera = () => vi.mocked(renderSite).mock.calls.at(-1)![2]!;
  expect(select.getAttribute("aria-label")).toBe("Find Object");
  expect(follow.disabled).toBe(true);
  select.value = personId;
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  follow.click();
  const moved: typeof initial = {
    ...initial,
    game: {
      ...initial.game,
      world: {
        ...initial.game.world,
        positions: {
          ...initial.game.world.positions,
          [personId]: { x: 60, y: 58 },
        },
      },
    },
  };
  view.render(moved);
  expect(camera().center).toEqual({ x: 60, y: 58 });
  root
    .querySelector<HTMLButtonElement>(
      '[data-active-person="person-lena-ortiz"]',
    )!
    .click();
  expect(camera()).toMatchObject({
    selectedId: "person-lena-ortiz",
    activePawnId: "person-lena-ortiz",
    center: moved.game.world.positions["person-lena-ortiz"],
  });
  expect(follow.checked).toBe(true);
  const lenaMoved: typeof initial = {
    ...moved,
    game: {
      ...moved.game,
      world: {
        ...moved.game.world,
        positions: {
          ...moved.game.world.positions,
          "person-lena-ortiz": { x: 70, y: 70 },
        },
      },
    },
  };
  view.render(lenaMoved);
  expect(camera().center).toEqual({ x: 70, y: 70 });
  follow.click();
  root
    .querySelector<HTMLButtonElement>(`[data-active-person="${personId}"]`)!
    .click();
  expect(follow.checked).toBe(false);
  expect(camera().center).toEqual(moved.game.world.positions[personId]);
  const snappedCenter = camera().center;
  view.render(initial);
  expect(camera().center).toEqual(snappedCenter);
  view.render(moved);
  select.value = personId;
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  follow.click();
  select.value = "person-lena-ortiz";
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  expect(camera().center).toEqual(
    moved.game.world.positions["person-lena-ortiz"],
  );
  expect(camera().activePawnId).toBe(personId);
  view.render(lenaMoved);
  expect(camera().center).toEqual({ x: 70, y: 70 });
  select.value = personId;
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  canvas.dispatchEvent(new window.KeyboardEvent("keydown", { key: "+" }));
  expect(follow.checked).toBe(true);
  expect(camera().center).toEqual({ x: 60, y: 58 });
  canvas.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "ArrowRight" }),
  );
  expect(follow.checked).toBe(false);
  const manualCenter = camera().center;
  view.render(initial);
  expect(camera().center).toEqual(manualCenter);
  select.value = "object:spare-break-seat";
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  follow.click();
  const carried: typeof initial = {
    ...moved,
    game: {
      ...moved.game,
      objects: {
        ...moved.game.objects,
        items: moved.game.objects.items.map((object) =>
          object.id === "spare-break-seat"
            ? { ...object, location: { kind: "carried", personId } }
            : object,
        ),
      },
    },
  };
  view.render(carried);
  expect(camera().center).toEqual(carried.game.world.positions[personId]);
  view.render({
    ...carried,
    game: {
      ...carried.game,
      objects: {
        ...carried.game.objects,
        items: carried.game.objects.items.filter(
          (object) => object.id !== "spare-break-seat",
        ),
      },
    },
  });
  expect(follow.checked).toBe(false);
  expect(follow.disabled).toBe(true);
  view.render(initial);
  root
    .querySelector('[data-map-perspective="recorded"]')!
    .dispatchEvent(new window.Event("change", { bubbles: true }));
  expect(follow.disabled).toBe(true);
  select.value = personId;
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  follow.click();
  view.render(moved);
  expect(camera().center).toEqual(
    initial.game.observations.entities[personId]!.position,
  );
  expect(camera().center).not.toEqual(moved.game.world.positions[personId]);
  canvas.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));
  expect(openRecord).toHaveBeenCalledWith(personId, "recorded");
  select.value = "person-lena-ortiz";
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  expect(camera().center).toEqual(
    initial.game.observations.entities["person-lena-ortiz"]!.position,
  );
  expect(camera().activePawnId).toBe(personId);
  const beforeClear = camera().center;
  select.value = "";
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  expect(follow.checked).toBe(false);
  expect(camera()).toMatchObject({
    center: beforeClear,
    selectedId: null,
    activePawnId: personId,
  });
  openRecord.mockClear();
  canvas.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));
  expect(openRecord).not.toHaveBeenCalled();
  select.value = personId;
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  follow.click();
  const recordedCamera = camera();
  expect(view.controlPerson(personId)).toContain("World view");
  expect(camera()).toEqual(recordedCamera);
  follow.click();
  view.focus({ x: 10, y: 10 });
  root
    .querySelector<HTMLButtonElement>(
      '[data-active-person="person-lena-ortiz"]',
    )!
    .click();
  view.focus({ x: 10, y: 10 });
  root
    .querySelector<HTMLButtonElement>(`[data-active-person="${personId}"]`)!
    .click();
  expect(camera().center).toEqual(
    initial.game.observations.entities[personId]!.position,
  );
  expect(camera().center).not.toEqual(moved.game.world.positions[personId]);
  expect(follow.checked).toBe(false);
  const recordedCenter = camera().center;
  root
    .querySelector<HTMLButtonElement>(`[data-active-person="${personId}"]`)!
    .click();
  expect(camera().center).toEqual(recordedCenter);
  view.beginPlacement({
    label: "Placement",
    origin: { x: 65, y: 68 },
    footprint: (position) => [{ position }],
    validate: () => null,
    confirm: () => ({ accepted: true, message: "Queued", snapshot: initial }),
  });
  expect(follow.checked).toBe(false);
  expect(follow.disabled).toBe(true);
  expect(camera().center).toEqual({ x: 65, y: 68 });
  expect(controller.getSnapshot()).toEqual(initial);
});

it("updates the inline selection panel from a single map selection and delegates Move", () => {
  const window = new JSDOM(
    '<section><select data-camera-entity></select><span data-camera-status></span><output data-camera-zoom></output><button data-camera-action="inspect"></button><div data-map-selection></div><div data-placement-bar><strong data-placement-label></strong><span data-placement-feedback></span><button data-camera-action="confirm"></button><button data-camera-action="cancel"></button></div><canvas></canvas></section>',
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
    clientWidth: { value: 760 },
    clientHeight: { value: 420 },
    setPointerCapture: { value: () => {} },
    hasPointerCapture: { value: () => false },
  });
  const controller = createController(createInitialState());
  const move = vi.fn();
  const inspect = vi.fn();
  const view = createSiteMap(canvas, root, controller, inspect, move);
  view.focus({ x: 67, y: 66 });
  canvas.dispatchEvent(
    new window.MouseEvent("pointerdown", {
      clientX: 380,
      clientY: 204,
      button: 0,
    }),
  );
  canvas.dispatchEvent(
    new window.MouseEvent("pointerup", {
      clientX: 380,
      clientY: 204,
      button: 0,
    }),
  );
  expect(root.querySelector("[data-selection-name]")!.textContent).toContain(
    "spare-break-seat",
  );
  expect(inspect).not.toHaveBeenCalled();
  root.querySelector<HTMLButtonElement>("[data-selection-move]")!.click();
  expect(move.mock.calls[0]![0]).toBe("spare-break-seat");
});
