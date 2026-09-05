import { describe, expect, it } from "vitest";

import { synchronizeLauncherIcons } from "../src/adapters/browser/window-manager";

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
