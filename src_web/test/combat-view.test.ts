import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import { createCombatWindow } from "../src/adapters/browser/combat-view";
import type { PlacementRequest } from "../src/adapters/browser/placement";

afterEach(() => vi.unstubAllGlobals());
it("hands control to the map without issuing orders and retains explicit duty controls", () => {
  const window = new JSDOM().window;
  vi.stubGlobal("document", window.document);
  vi.stubGlobal("Option", window.Option);
  const controller = createController(createInitialState());
  const begin = vi.fn<(request: PlacementRequest) => void>();
  const control = vi.fn(() => null as string | null);
  const view = createCombatWindow(
    document.body,
    controller,
    begin,
    vi.fn(),
    control,
  );
  const before = controller.getSnapshot();
  view.element
    .querySelector<HTMLButtonElement>("[data-tactical-control]")!
    .click();
  expect(control).toHaveBeenCalledWith("person-caleb-ward");
  expect(controller.getSnapshot()).toEqual(before);
  expect(begin).not.toHaveBeenCalled();
  for (const action of ["move", "hold", "retreat", "engage", "stabilize"])
    expect(view.element.querySelector(`[data-tactical-${action}]`)).toBeNull();
  view.element
    .querySelector<HTMLButtonElement>("[data-tactical-draft]")!
    .click();
  expect(
    controller.getSnapshot().game.combat.responders["person-caleb-ward"]!
      .drafted,
  ).toBe(true);
  controller.queueAction({
    mapId: before.game.world.map.id,
    actorId: "person-caleb-ward",
    action: "move",
    destination: { x: 60, y: 59 },
  });
  controller.queueAction({
    mapId: before.game.world.map.id,
    actorId: "person-caleb-ward",
    action: "hold",
  });
  view.render(controller.getSnapshot());
  const queued = controller.getSnapshot();
  view.element
    .querySelector<HTMLButtonElement>("[data-tactical-control]")!
    .click();
  expect(controller.getSnapshot()).toEqual(queued);
  control.mockReturnValue(
    "Finish or cancel map placement before selecting a responder.",
  );
  view.element
    .querySelector<HTMLButtonElement>("[data-tactical-control]")!
    .click();
  expect(
    view.element.querySelector("[data-tactical-feedback]")!.textContent,
  ).toContain("placement");
  view.select("person-caleb-ward", controller.getSnapshot(), "recorded");
  expect(
    view.element.querySelector<HTMLButtonElement>("[data-tactical-control]")!
      .disabled,
  ).toBe(true);
  expect(view.element.textContent).toContain("live tactical state withheld");
  expect(
    view.element.querySelector<HTMLButtonElement>("[data-tactical-control]")!
      .title,
  ).toContain("Recorded");
});
