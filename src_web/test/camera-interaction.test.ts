import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSiteCamera } from "../src/adapters/browser/camera-view";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";

afterEach(() => vi.unstubAllGlobals());
describe("camera placement interaction", () => {
  it("pins an annex on click so pointer movement toward authorization cannot move it", () => {
    const window = new JSDOM(
      '<section><select data-camera-entity></select><span data-camera-status></span><output data-camera-zoom></output><button data-camera-action="inspect"></button><select data-camera-mode><option value="inspect">Inspect</option><option value="laboratory">Laboratory</option></select><span data-construction-feedback></span><span data-construction-materials></span><button data-camera-action="place"></button><canvas></canvas></section>',
    ).window;
    for (const name of [
      "document",
      "Element",
      "HTMLElement",
      "Option",
      "Image",
      "Event",
    ] as const)
      vi.stubGlobal(name, window[name]);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
      },
    );
    const root = window.document.querySelector("section")!;
    const canvas = root.querySelector("canvas")!;
    Object.defineProperties(canvas, {
      clientWidth: { value: 0 },
      clientHeight: { value: 0 },
      setPointerCapture: { value: () => {} },
      hasPointerCapture: { value: () => false },
    });
    const controller = createController(createInitialState());
    controller.setRunning(false);
    const preview = vi.spyOn(controller, "previewLaboratory");
    const open = vi.fn();
    const overlay = document.createElement("select");
    overlay.dataset.cameraOverlay = "";
    overlay.innerHTML =
      '<option value="normal">Standard</option><option value="materials">Materials</option>';
    const layer = document.createElement("select");
    layer.dataset.cameraLayer = "";
    layer.innerHTML =
      '<option value="structure">Structure</option><option value="floor">Floor</option>';
    root.append(overlay, layer);
    createSiteCamera(canvas, root, controller, open);
    const mode = root.querySelector<HTMLSelectElement>("[data-camera-mode]")!;
    mode.value = "laboratory";
    mode.dispatchEvent(new window.Event("change"));
    const pointer = (type: string, clientX: number, clientY: number) =>
      canvas.dispatchEvent(
        new window.MouseEvent(type, {
          clientX,
          clientY,
          button: 0,
          bubbles: true,
        }),
      );
    pointer("pointerdown", 0, 0);
    pointer("pointerup", 0, 0);
    const pinned = preview.mock.calls.at(-1)![0];
    pointer("pointermove", 40, 40);
    root
      .querySelector<HTMLButtonElement>('[data-camera-action="place"]')!
      .click();
    expect(
      controller.getSnapshot().game.construction.blueprints[0]?.origin,
    ).toEqual(pinned);
    expect(pinned).toEqual({ x: 63, y: 83 });
    overlay.value = "materials";
    overlay.dispatchEvent(new window.Event("change"));
    layer.value = "floor";
    layer.dispatchEvent(new window.Event("change"));
    pointer("dblclick", 0, 0);
    expect(open).toHaveBeenLastCalledWith("tile:63,83:floor");
  });
});
