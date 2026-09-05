import { afterEach, describe, expect, it, vi } from "vitest";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import { createBrowserRuntime } from "../src/adapters/browser/runtime";
import { incidentResponse } from "../src/adapters/browser/incident-response";

afterEach(() => vi.unstubAllGlobals());
describe("incident-aware browser timing", () => {
  it("pauses Orange and Red transitions without repeatedly overriding player resume", () => {
    expect(incidentResponse("green", "yellow")).toBe("slow");
    expect(incidentResponse("yellow", "orange")).toBe("pause");
    expect(incidentResponse("orange", "red")).toBe("pause");
    expect(incidentResponse("red", "red")).toBe("none");
    expect(incidentResponse(undefined, "orange")).toBe("pause");
    expect(incidentResponse("orange", "green")).toBe("none");
  });
  it("stops frame catch-up at the tick that pauses and does not bank paused time", () => {
    let callback: FrameRequestCallback = () => {};
    vi.stubGlobal("requestAnimationFrame", (next: FrameRequestCallback) => {
      callback = next;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const controller = createController(createInitialState());
    let responded = false;
    controller.subscribe((snapshot) => {
      if (snapshot.game.tick === 1 && snapshot.running && !responded) {
        responded = true;
        controller.setRunning(false);
      }
    });
    const runtime = createBrowserRuntime(controller);
    runtime.setSpeed(4);
    runtime.start();
    callback(0);
    callback(1000);
    expect(controller.getSnapshot().game.tick).toBe(1);
    expect(controller.getSnapshot().running).toBe(false);
    callback(2000);
    runtime.setSpeed(1);
    controller.setRunning(true);
    expect(controller.getSnapshot().running).toBe(true);
    callback(2499);
    expect(controller.getSnapshot().game.tick).toBe(1);
    callback(2500);
    expect(controller.getSnapshot().game.tick).toBe(2);
    runtime.stop();
  });
  it("stops a catch-up burst when an incident slows the runtime", () => {
    let callback: FrameRequestCallback = () => {};
    vi.stubGlobal("requestAnimationFrame", (next: FrameRequestCallback) => {
      callback = next;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const controller = createController(createInitialState());
    const runtime = createBrowserRuntime(controller);
    runtime.setSpeed(4);
    controller.subscribe((snapshot) => {
      if (snapshot.game.tick === 1) runtime.setSpeed(1);
    });
    runtime.start();
    callback(0);
    callback(1000);
    expect(controller.getSnapshot().game.tick).toBe(1);
    callback(1500);
    expect(controller.getSnapshot().game.tick).toBe(2);
    runtime.stop();
  });
});
