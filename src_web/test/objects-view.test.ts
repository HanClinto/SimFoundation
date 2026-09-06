import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createObjectsWindow } from "../src/adapters/browser/objects-view";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import type { PlacementRequest } from "../src/adapters/browser/placement";
afterEach(() => vi.unstubAllGlobals());
it("uses shared placement for oriented furniture and counted supplies without instant relocation", () => {
  const window = new JSDOM("<!doctype html><body></body>").window;
  vi.stubGlobal("document", window.document);
  vi.stubGlobal("Option", window.Option);
  const controller = createController(createInitialState());
  const requests: PlacementRequest[] = [];
  const view = createObjectsWindow(
    document.body,
    controller,
    (request) => requests.push(request),
    () => {},
  );
  view.select("bed-1", controller.getSnapshot());
  view.element.querySelector<HTMLSelectElement>("#object-orientation")!.value =
    "east";
  view.element.querySelector<HTMLButtonElement>("[data-object-move]")!.click();
  expect(requests[0]!.footprint({ x: 54, y: 59 })).toHaveLength(2);
  expect(requests[0]!.confirm({ x: 54, y: 59 }).accepted).toBe(true);
  expect(
    controller
      .getSnapshot()
      .game.objects.items.find((item) => item.id === "bed-1")?.location,
  ).toEqual({ kind: "ground", position: { x: 50, y: 67 } });
  view.element
    .querySelector<HTMLButtonElement>("[data-object-cancel]")!
    .click();
  expect(controller.getSnapshot().game.jobs).toEqual([]);
  view.select("stock-materials", controller.getSnapshot());
  view.element.querySelector<HTMLInputElement>("#object-quantity")!.value =
    "10";
  view.element.querySelector<HTMLButtonElement>("[data-object-move]")!.click();
  expect(requests[1]!.confirm({ x: 66, y: 70 }).accepted).toBe(true);
  expect(
    view.element.querySelector<HTMLSelectElement>("#object-choice")!.value,
  ).toBe(controller.getSnapshot().game.objectOrders[1]!.objectId);
  expect(
    controller
      .getSnapshot()
      .game.objects.items.find(
        (item) =>
          item.id === controller.getSnapshot().game.objectOrders[1]!.objectId,
      )?.quantity,
  ).toBe(10);
  const before = controller.getSnapshot();
  view.move("spare-break-seat", before);
  expect(requests.at(-1)!.origin).toEqual({ x: 67, y: 66 });
  expect(controller.getSnapshot()).toEqual(before);
  expect(requests.at(-1)!.confirm({ x: 54, y: 59 }).accepted).toBe(true);
});
