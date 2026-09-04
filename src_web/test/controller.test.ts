import { describe, expect, it, vi } from "vitest";

import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";

describe("game controller", () => {
  it("loads and advances without browser globals", () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");

    const controller = createController(createInitialState(42));
    const snapshot = controller.advance(3);

    expect(snapshot.game).toMatchObject({
      seed: 42,
      tick: 3,
      gameMinute: 483,
    });
  });

  it("does not advance while paused", () => {
    const controller = createController(createInitialState());

    controller.setRunning(false);
    controller.advance(10);

    expect(controller.getSnapshot()).toMatchObject({
      running: false,
      game: { tick: 0, gameMinute: 480 },
    });
  });

  it("publishes detached snapshots after state changes", () => {
    const controller = createController(createInitialState());
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    const snapshot = controller.advance();
    unsubscribe();
    controller.advance();

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(snapshot);
    expect(snapshot).not.toBe(controller.getSnapshot());
    expect(snapshot.game).not.toBe(controller.getSnapshot().game);
  });

  it("rejects invalid tick counts", () => {
    const controller = createController(createInitialState());

    expect(() => controller.advance(0)).toThrow(RangeError);
    expect(() => controller.advance(1.5)).toThrow(RangeError);
  });
});
