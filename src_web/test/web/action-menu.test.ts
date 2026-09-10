// @vitest-environment jsdom
import { expect, it } from "vitest";
import { SessionController } from "../../src/application/SessionController";
import { actionMenu } from "../../src/adapters/browser/views/action-menu";
import type { ViewContext } from "../../src/adapters/browser/views/context";

it("queues successive contextual actions without ticking, replacing work or moving cargo", () => {
  const controller = new SessionController();
  const homeId = controller.session.campaign!.homeId;
  const context = (): ViewContext => ({
    controller,
    site: controller.session.state.sites[homeId]!,
    subjectId: `${homeId}:alex`,
    targetId: `${homeId}:kit`,
    tile: null,
    act: (operation) => operation(),
    inspect: () => {},
    control: () => {},
  });
  const take = actionMenu(context()).find(
    (entry) => "label" in entry && entry.label === "Take / recover",
  );
  if (!take || !("action" in take)) throw new Error("Missing take action");
  expect(take.disabledReason).toBeUndefined();
  take.action!();
  const move = actionMenu({
    ...context(),
    targetId: null,
    tile: { x: 3, y: 8 },
  }).find((entry) => "label" in entry && entry.label === "Move here");
  if (!move || !("action" in move)) throw new Error("Missing move action");
  move.action!();
  const site = controller.session.state.sites[homeId]!;
  const actor = site.entities[`${homeId}:alex`]!;
  if (actor.kind !== "pawn") throw new Error("Missing worker");
  expect(actor.queue.map((entry) => entry.action.kind)).toEqual([
    "take",
    "move",
  ]);
  expect(controller.session.state.tick).toBe(0);
  expect(site.entities[`${homeId}:kit`]!.location.kind).toBe("ground");
});

it("offers inspection but never a personal order without a selected worker", () => {
  const controller = new SessionController();
  const homeId = controller.session.campaign!.homeId;
  const entries = actionMenu({
    controller,
    site: controller.session.state.sites[homeId]!,
    subjectId: null,
    targetId: `${homeId}:kit`,
    tile: null,
    act: (operation) => operation(),
    inspect: () => {},
    control: () => {},
  });
  expect(entries).toHaveLength(1);
  expect("label" in entries[0]! && entries[0].label).toMatch(/^Inspect /);
});
