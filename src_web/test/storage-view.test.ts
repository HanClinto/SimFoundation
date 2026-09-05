import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createStorageWindow } from "../src/adapters/browser/storage-view";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import type { PlacementRequest } from "../src/adapters/browser/placement";
afterEach(() => vi.unstubAllGlobals());
it("uses shared placement to relocate policies, applies filters, and leaves stock where it is", () => {
  const window = new JSDOM("<!doctype html><body></body>").window;
  vi.stubGlobal("document", window.document);
  vi.stubGlobal("Option", window.Option);
  const controller = createController(createInitialState());
  const requests: PlacementRequest[] = [];
  const view = createStorageWindow(
    document.body,
    controller,
    (request) => requests.push(request),
    () => {},
  );
  view.select("storage-1", controller.getSnapshot());
  view.element.querySelector<HTMLSelectElement>("#storage-emission")!.value =
    "none";
  view.element.querySelector<HTMLInputElement>("#storage-capacity")!.value =
    "12";
  view.element.querySelector<HTMLInputElement>("#storage-target")!.value = "12";
  view.element
    .querySelector<HTMLButtonElement>("[data-storage-place]")!
    .click();
  expect(requests[0]!.footprint({ x: 59, y: 65 })).toHaveLength(1);
  expect(requests[0]!.confirm({ x: 59, y: 65 }).accepted).toBe(true);
  expect(controller.getSnapshot().game.storage.areas[0]!.emission).toBe("none");
  expect(
    view.element.querySelector("[data-storage-record]")!.textContent,
  ).toContain("Non-emitting only");
  expect(controller.getSnapshot().game.storage.areas[0]?.origin).toEqual({
    x: 59,
    y: 65,
  });
  expect(
    controller
      .getSnapshot()
      .game.objects.items.find((item) => item.id === "pantry-meals")?.location,
  ).toEqual({ kind: "ground", position: { x: 58, y: 67 } });
  view.element.querySelector<HTMLInputElement>("#storage-enabled")!.checked =
    false;
  view.element.querySelector<HTMLButtonElement>("[data-storage-save]")!.click();
  expect(controller.getSnapshot().game.storage.areas[0]?.enabled).toBe(false);
  view.element
    .querySelector<HTMLButtonElement>("[data-storage-remove]")!
    .click();
  expect(controller.getSnapshot().game.storage.areas).toHaveLength(2);
});
