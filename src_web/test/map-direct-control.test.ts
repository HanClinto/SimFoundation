import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createSiteMap } from "../src/adapters/browser/site-map-view";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import { renderSite } from "../src/adapters/browser/renderer";
vi.mock("../src/adapters/browser/renderer", async (original) => ({
  ...(await original<object>()),
  renderSite: vi.fn(),
}));
afterEach(() => vi.unstubAllGlobals());

it("keeps actor selection through ground inspection and panning, and submits only the chosen Go Here", () => {
  const window = new JSDOM(
    '<section><select data-camera-entity></select><span data-camera-status></span><output data-camera-zoom></output><button data-camera-action="inspect"></button><div data-placement-bar><strong data-placement-label></strong><span data-placement-feedback></span><button data-camera-action="confirm"></button><button data-camera-action="cancel"></button></div><div><canvas></canvas></div><div data-map-selection></div></section>',
  ).window;
  for (const key of [
    "document",
    "Element",
    "Option",
    "DOMParser",
    "XMLSerializer",
  ] as const)
    vi.stubGlobal(key, window[key]);
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
  controller.setRunning(false);
  const inspect = vi.fn();
  const view = createSiteMap(canvas, root, controller, inspect);
  view.focus({ x: 60, y: 59 });
  const id = "person-mara-voss";
  root
    .querySelector<HTMLButtonElement>(`[data-active-person="${id}"]`)!
    .click();
  const initial = controller.getSnapshot();
  expect(
    root.querySelector<HTMLSelectElement>("[data-camera-entity]")!.value,
  ).toBe(id);
  expect(vi.mocked(renderSite).mock.calls.at(-1)![2]).toMatchObject({
    selectedId: id,
    activePawnId: id,
  });
  expect(
    root.querySelector(".pawn-selection-area [data-map-selection]"),
  ).not.toBeNull();
  expect(
    root
      .querySelector(".map-selection-panel")!
      .getAttribute("data-active-target"),
  ).toBe("true");
  expect(
    root.querySelector(".pawn-selection-area .pawn-action-queue"),
  ).not.toBeNull();
  const pointer = (type: string, x = 380, y = 210) =>
    canvas.dispatchEvent(
      new window.MouseEvent(type, {
        clientX: x,
        clientY: y,
        button: 0,
        bubbles: true,
      }),
    );
  pointer("pointerdown");
  pointer("pointerup");
  pointer("pointerdown");
  pointer("pointerup");
  pointer("dblclick");
  expect(inspect).toHaveBeenCalledWith("tile:60,59:structure", "world");
  expect(controller.getSnapshot()).toEqual(initial);
  expect(
    root.querySelector<HTMLElement>(".pawn-control-strip")!.dataset.activePawn,
  ).toBe(id);
  expect(root.querySelector<HTMLElement>(".pawn-context-menu")!.hidden).toBe(
    true,
  );
  pointer("pointerdown");
  pointer("pointermove", 410, 210);
  pointer("pointerup", 410, 210);
  expect(root.querySelector<HTMLElement>(".pawn-context-menu")!.hidden).toBe(
    true,
  );
  expect(controller.getSnapshot()).toEqual(initial);
  view.focus({ x: 60, y: 59 });
  pointer("pointerdown");
  pointer("pointerup");
  expect(root.querySelector<HTMLElement>(".pawn-context-menu")!.hidden).toBe(
    false,
  );
  pointer("pointerdown", 430, 220);
  pointer("pointerup", 430, 220);
  expect(root.querySelector<HTMLElement>(".pawn-context-menu")!.hidden).toBe(
    true,
  );
  expect(controller.getSnapshot()).toEqual(initial);
  pointer("pointerdown");
  pointer("pointerup");
  expect(controller.getSnapshot()).toEqual(initial);
  root.querySelector<HTMLButtonElement>('[data-interaction="move"]')!.click();
  expect(
    controller.getSnapshot().game.combat.responders[id]!.destination,
  ).toEqual({ x: 60, y: 59 });
  expect(root.querySelector<HTMLElement>("[data-placement-bar]")!.hidden).toBe(
    true,
  );
  const beforeSwitch = controller.getSnapshot();
  const target = initial.game.personnel[1]!;
  const dropdown = root.querySelector<HTMLSelectElement>(
    "[data-camera-entity]",
  )!;
  dropdown.value = target.id;
  dropdown.dispatchEvent(new window.Event("change", { bubbles: true }));
  expect(vi.mocked(renderSite).mock.calls.at(-1)![2]).toMatchObject({
    selectedId: target.id,
    activePawnId: id,
  });
  expect(root.querySelector("[data-selection-name]")!.textContent).toBe(
    `Target: ${target.name}`,
  );
  root.querySelector<HTMLButtonElement>("[data-selection-control]")!.click();
  expect(vi.mocked(renderSite).mock.calls.at(-1)![2]).toMatchObject({
    selectedId: target.id,
    activePawnId: target.id,
  });
  expect(
    root
      .querySelector(".map-selection-panel")!
      .getAttribute("data-active-target"),
  ).toBe("true");
  expect(controller.getSnapshot()).toEqual(beforeSwitch);
  const deselect = root.querySelector<HTMLButtonElement>(
    '[aria-label="Deselect active pawn"]',
  )!;
  deselect.click();
  expect(vi.mocked(renderSite).mock.calls.at(-1)![2]).toMatchObject({
    selectedId: null,
    activePawnId: null,
  });
  expect(controller.getSnapshot()).toEqual(beforeSwitch);
  root
    .querySelector<HTMLButtonElement>(`[data-active-person="${id}"]`)!
    .click();
  dropdown.value = "object:spare-bed";
  dropdown.dispatchEvent(new window.Event("change", { bubbles: true }));
  deselect.click();
  expect(vi.mocked(renderSite).mock.calls.at(-1)![2]).toMatchObject({
    selectedId: "object:spare-bed",
    activePawnId: null,
  });
  expect(root.querySelector("[data-selection-name]")!.textContent).toContain(
    "spare-bed",
  );
  expect(controller.getSnapshot()).toEqual(beforeSwitch);
  inspect.mockClear();
  view.focus({ x: 60, y: 59 });
  pointer("pointerdown");
  pointer("pointerup");
  expect(inspect).toHaveBeenCalledExactlyOnceWith(
    "tile:60,59:structure",
    "world",
  );
  expect(root.querySelector<HTMLElement>(".pawn-context-menu")!.hidden).toBe(
    true,
  );
  inspect.mockClear();
  view.focus(beforeSwitch.game.world.positions[id]!);
  pointer("pointerdown");
  pointer("pointerup");
  expect(root.querySelector<HTMLElement>(".pawn-context-menu")!.hidden).toBe(
    true,
  );
  expect(inspect).not.toHaveBeenCalled();
  expect(vi.mocked(renderSite).mock.calls.at(-1)![2]).toMatchObject({
    selectedId: id,
    activePawnId: id,
  });
  expect(controller.getSnapshot()).toEqual(beforeSwitch);
});
