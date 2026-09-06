import { describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

import {
  bindWindowShortcuts,
  synchronizeLauncherIcons,
} from "../src/adapters/browser/window-manager";

it("opens subsystem buttons on click and desktop shortcuts on double-click or keyboard activation", () => {
  const window = new JSDOM(
    '<button class="desktop-icon" data-open-window="facility-window"></button><button class="subsystem-icon" data-open-window="day-planner-window"></button>',
  ).window;
  const buttons = window.document.querySelectorAll("button");
  const open = vi.fn();
  bindWindowShortcuts(buttons, open);
  const [desktop, subsystem] = buttons;
  desktop!.dispatchEvent(new window.MouseEvent("click", { detail: 1 }));
  expect(open).not.toHaveBeenCalled();
  desktop!.dispatchEvent(new window.MouseEvent("dblclick", { detail: 2 }));
  expect(open).toHaveBeenLastCalledWith("facility-window");
  expect(open).toHaveBeenCalledTimes(1);
  desktop!.click();
  expect(open).toHaveBeenCalledTimes(2);
  subsystem!.dispatchEvent(new window.MouseEvent("click", { detail: 1 }));
  expect(open).toHaveBeenLastCalledWith("day-planner-window");
  expect(open).toHaveBeenCalledTimes(3);
  subsystem!.click();
  expect(open).toHaveBeenCalledTimes(4);
  subsystem!.dispatchEvent(new window.MouseEvent("dblclick", { detail: 2 }));
  expect(open).toHaveBeenCalledTimes(4);
});

function launcher(windowId: string, initialIcon: string) {
  const icon = { src: initialIcon };
  return {
    element: {
      dataset: { openWindow: windowId },
      querySelector: () => icon,
    } as unknown as HTMLElement,
    icon,
  };
}

describe("window icon synchronization", () => {
  it("uses the registered icon on every launcher for the same window", () => {
    const desktop = launcher("camera-window", "old-desktop.svg");
    const folder = launcher("camera-window", "old-folder.svg");
    const unrelated = launcher("personnel-window", "personnel.svg");

    synchronizeLauncherIcons(
      [desktop.element, folder.element, unrelated.element],
      "camera-window",
      "camera.svg",
    );

    expect(desktop.icon.src).toBe("camera.svg");
    expect(folder.icon.src).toBe("camera.svg");
    expect(unrelated.icon.src).toBe("personnel.svg");
  });
});
