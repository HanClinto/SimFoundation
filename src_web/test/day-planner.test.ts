import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDayPlanner } from "../src/adapters/browser/day-planner-view";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";

afterEach(() => vi.unstubAllGlobals());
describe("day planner", () => {
  it("edits hourly blocks and applies a night shift while paused", () => {
    const window = new JSDOM("<!doctype html><body></body>").window;
    for (const name of [
      "document",
      "DOMParser",
      "XMLSerializer",
      "Option",
    ] as const)
      vi.stubGlobal(name, window[name]);
    const host = document.createElement("div");
    document.body.append(host);
    const controller = createController(createInitialState());
    controller.setRunning(false);
    createDayPlanner(host, controller);
    expect(host.querySelectorAll("[data-schedule-hour]")).toHaveLength(24);
    host.querySelector<HTMLButtonElement>('[data-paint-block="free"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-schedule-hour="8"]')!.click();
    expect(
      controller.getSnapshot().game.routines.schedules["person-mara-voss"]?.[8],
    ).toBe("free");
    host.querySelector<HTMLSelectElement>("[data-planner-preset]")!.value =
      "night";
    host.querySelector<HTMLButtonElement>("[data-apply-schedule]")!.click();
    const schedule =
      controller.getSnapshot().game.routines.schedules["person-mara-voss"]!;
    expect(schedule[0]).toBe("work");
    expect(schedule[10]).toBe("sleep");
    expect(controller.getSnapshot().game.tick).toBe(0);
    expect(
      host.querySelector("[data-planner-feedback]")?.textContent,
    ).toContain("Night shift applied to all 24 hours");
    expect(host.querySelectorAll(".coverage-table tr")).toHaveLength(6);
  });
});
