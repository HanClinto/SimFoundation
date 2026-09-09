import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import { createEncounterSandboxWindow } from "../src/adapters/browser/encounter-sandbox-view";
import {
  createPlacementSession,
  type PlacementRequest,
} from "../src/adapters/browser/placement";

afterEach(() => vi.unstubAllGlobals());

it("keeps sandbox navigation and previews inert, validates before creation and rejects stale confirmation", () => {
  const window = new JSDOM().window;
  vi.stubGlobal("document", window.document);
  const controller = createController(createInitialState());
  controller.setRunning(false);
  const begin = vi.fn<(request: PlacementRequest) => string | null>(() => null);
  const view = createEncounterSandboxWindow(document.body, controller, begin);
  const before = controller.getSnapshot();
  view.element.hidden = false;
  view.render(before);
  const place = view.element.querySelector<HTMLButtonElement>(
    "[data-encounter-place]",
  )!;
  place.click();
  const request = begin.mock.calls[0]![0];
  expect(request.validate(request.origin, before)).toContain("two or three");
  expect(controller.getSnapshot()).toEqual(before);
  begin.mockReturnValueOnce(
    "Switch the map to World view before sandbox placement.",
  );
  place.click();
  expect(
    view.element.querySelector("[data-encounter-feedback]")!.textContent,
  ).toContain("World view");
  expect(controller.getSnapshot()).toEqual(before);
  controller.draftResponder("person-caleb-ward", true);
  controller.draftResponder("person-lena-ortiz", true);
  const ready = controller.getSnapshot();
  place.click();
  const prepared = begin.mock.calls.at(-1)![0];
  expect(prepared.validate(prepared.origin, ready)).toBeNull();
  expect(controller.getSnapshot()).toEqual(ready);
  const session = createPlacementSession(prepared);
  session.move({ x: -1, y: -1 });
  expect(session.confirm(ready).accepted).toBe(false);
  expect(controller.getSnapshot()).toEqual(ready);
  session.move(prepared.origin);
  expect(session.confirm(ready).accepted).toBe(true);
  const created = controller.getSnapshot();
  expect(created.game.combat.status).toBe("active");
  expect(place.disabled).toBe(true);
  expect(prepared.confirm(prepared.origin).accepted).toBe(false);
  expect(controller.getSnapshot()).toEqual(created);
});
