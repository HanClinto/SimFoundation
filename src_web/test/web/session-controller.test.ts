import { describe, expect, it } from "vitest";
import { SessionController } from "../../src/application/SessionController";
import { openConsole, executeLine } from "../../src/adapters/cli/Console";

describe("shared replacement application controller", () => {
  it("uses the same physical command and completion as the CLI", () => {
    const controller = new SessionController();
    controller.dispatch({
      kind: "enqueue",
      siteId: "site-1",
      entityId: "site-1:alex",
      action: { kind: "take", targetId: "site-1:kit" },
    });
    controller.finish(["site-1:alex"]);
    let cli = openConsole();
    cli = executeLine(cli, "order alex take kit").console;
    cli = executeLine(cli, "finish --alarms alex").console;
    expect(controller.session).toEqual(cli.session);
    const restored = new SessionController();
    restored.restore(controller.serialize());
    expect(restored.session).toEqual(controller.session);
  });

  it("rejects invalid commands and saves without publishing a new state", () => {
    const controller = new SessionController();
    const original = controller.session;
    expect(() =>
      controller.dispatch({
        kind: "enqueue",
        siteId: "site-1",
        entityId: "missing",
        action: { kind: "wait", ticks: 1 },
      }),
    ).toThrow("Choose a pawn");
    expect(() => controller.restore('{"version":1}')).toThrow("incompatible");
    expect(controller.session).toBe(original);
  });

  it("delivers complete current tick events separately from retained history", () => {
    const controller = new SessionController();
    controller.dispatch({
      kind: "enqueue",
      siteId: "site-1",
      entityId: "site-1:alex",
      action: { kind: "wait", ticks: 1 },
    });
    const batches: number[] = [];
    controller.subscribe((session, events) => {
      batches.push(events.length);
      expect(events.every((event) => event.tick === session.state.tick)).toBe(
        true,
      );
    });
    controller.step();
    expect(batches).toHaveLength(1);
    expect(batches[0]).toBeGreaterThan(0);
  });
});
