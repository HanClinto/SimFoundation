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
    const personnelBeforePause = controller.getSnapshot().game.personnel;

    controller.setRunning(false);
    controller.advance(10);

    expect(controller.getSnapshot()).toMatchObject({
      running: false,
      game: { tick: 0, gameMinute: 480 },
    });
    expect(controller.getSnapshot().game.personnel).toEqual(
      personnelBeforePause,
    );
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

  it("orders a physical assessment without changing authoritative injuries", () => {
    const controller = createController(createInitialState());
    const before = controller
      .getSnapshot()
      .game.personnel.find(({ id }) => id === "person-jon-bell");
    const after = controller
      .orderPhysicalAssessment("person-jon-bell")
      .game.personnel.find(({ id }) => id === "person-jon-bell");

    expect(before?.physicalAssessments).toHaveLength(0);
    expect(after?.effects).toEqual(before?.effects);
    expect(after?.physicalAssessments).toHaveLength(1);
    expect(() => controller.orderPhysicalAssessment("missing-person")).toThrow(
      "Unknown person: missing-person",
    );
  });
});
