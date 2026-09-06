import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createMapSelection } from "../src/adapters/browser/map-selection";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";

afterEach(() => vi.unstubAllGlobals());
it("shows needs only in World view and routes object actions without directly moving inventory", () => {
  const window = new JSDOM("<!doctype html><body></body>").window;
  vi.stubGlobal("document", window.document);
  const controller = createController(createInitialState());
  const inspect = vi.fn();
  const move = vi.fn();
  const panel = createMapSelection(document.body, controller, inspect, move);
  const snapshot = controller.getSnapshot();
  panel.render(snapshot, snapshot.game.personnel[0]!.id, "world");
  expect(
    panel.element.querySelector<HTMLElement>("[data-selection-needs]")!.hidden,
  ).toBe(false);
  panel.render(snapshot, snapshot.game.personnel[0]!.id, "recorded");
  expect(
    panel.element.querySelector<HTMLElement>("[data-selection-needs]")!.hidden,
  ).toBe(true);
  panel.render(snapshot, "object:spare-bed", "world");
  panel.element
    .querySelector<HTMLButtonElement>("[data-selection-move]")!
    .click();
  expect(move).toHaveBeenCalledWith("spare-bed", snapshot);
  expect(controller.getSnapshot().game.objects).toEqual(snapshot.game.objects);
  panel.element
    .querySelector<HTMLButtonElement>("[data-selection-inspect]")!
    .click();
  expect(inspect).toHaveBeenCalledWith("object:spare-bed", "world");
  panel.render(snapshot, "object:spare-bed", "recorded");
  expect(
    panel.element.querySelector<HTMLButtonElement>("[data-selection-move]")!
      .disabled,
  ).toBe(true);
});

it("changes an actual selected door policy and keeps observed controls read-only", () => {
  const window = new JSDOM("<!doctype html><body></body>").window;
  vi.stubGlobal("document", window.document);
  const controller = createController(createInitialState());
  const panel = createMapSelection(document.body, controller, vi.fn());
  panel.render(controller.getSnapshot(), "tile:61,55:structure", "world");
  const door = panel.element.querySelector<HTMLSelectElement>("select")!;
  expect(door.disabled).toBe(false);
  door.value = "held-closed";
  door.dispatchEvent(new window.Event("change"));
  expect(controller.getSnapshot().game.world.map.tiles[55 * 128 + 61]).toBe(
    "closed-door",
  );
  panel.render(controller.getSnapshot(), "tile:61,55:structure", "recorded");
  expect(door.disabled).toBe(true);
  panel.render(controller.getSnapshot(), null, "world");
  expect(
    panel.element.querySelector<HTMLButtonElement>("[data-selection-inspect]")!
      .disabled,
  ).toBe(true);
});
