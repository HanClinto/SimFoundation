// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionController } from "../../src/application/SessionController";
import { createRuntime } from "../../src/adapters/browser/runtime";
import { createPlayback } from "../../src/adapters/browser/desktop/playback";

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function setup() {
  const controller = new SessionController();
  const act = vi.fn((operation: () => void) => operation());
  let render = () => {};
  const runtime = createRuntime(controller, vi.fn(), () => render());
  const playback = createPlayback(controller, runtime, act);
  render = playback.render;
  cleanups.push(
    runtime.dispose,
    controller.subscribe(() => render()),
  );
  document.body.append(playback.root);
  const buttons = playback.root.querySelectorAll("button");
  return {
    controller,
    runtime,
    act,
    playback,
    run: buttons[0]!,
    step: buttons[1]!,
    speed: playback.root.querySelector("select")!,
    clock: playback.root.querySelector<HTMLElement>('[role="timer"]')!,
  };
}

describe("compact simulation playback", () => {
  it("toggles Run/Pause with honest pressed state and preserves keyboard focus", () => {
    const { run, runtime, playback, clock } = setup();
    expect(playback.root.getAttribute("aria-label")).toBe(
      "Simulation playback",
    );
    expect(run.getAttribute("aria-label")).toBe("Run");
    expect(run.getAttribute("aria-pressed")).toBe("false");
    expect(run.disabled).toBe(false);
    expect(run.type).toBe("button");
    expect(run.title).toBe("Run simulation");
    expect(clock.matches(".clock")).toBe(true);
    expect(clock.textContent).toBe("Tick 0 | PAUSED");
    run.focus();
    run.click();
    expect(runtime.running).toBe(true);
    expect(run.getAttribute("aria-label")).toBe("Pause");
    expect(run.getAttribute("aria-pressed")).toBe("true");
    expect(run.title).toBe("Pause simulation");
    expect(clock.textContent).toBe("Tick 0 | RUNNING");
    expect(clock.getAttribute("aria-label")).toBe("Simulation tick 0, running");
    expect(document.activeElement).toBe(run);
    run.click();
    expect(runtime.running).toBe(false);
    expect(run.getAttribute("aria-label")).toBe("Run");
    runtime.setRunning(true);
    runtime.setRunning(false);
    expect(run.getAttribute("aria-pressed")).toBe("false");
    for (const svg of playback.root.querySelectorAll("svg")) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
      expect(svg.getAttribute("focusable")).toBe("false");
    }
  });

  it("pauses before invoking act and advances exactly one complete controller tick", () => {
    const { controller, runtime, act, step, clock } = setup();
    runtime.setRunning(true);
    const tick = controller.session.state.tick;
    const originalStep = controller.step.bind(controller);
    const advance = vi.spyOn(controller, "step").mockImplementation(() => {
      expect(runtime.running).toBe(false);
      originalStep();
    });
    act.mockImplementation((operation) => {
      expect(runtime.running).toBe(false);
      operation();
    });
    expect(step.getAttribute("aria-label")).toBe("Step");
    expect(step.title).toContain("one complete tick");
    expect(step.disabled).toBe(false);
    step.click();
    expect(act).toHaveBeenCalledOnce();
    expect(advance).toHaveBeenCalledOnce();
    expect(runtime.running).toBe(false);
    expect(controller.session.state.tick).toBe(tick + 1);
    expect(clock.textContent).toBe(`Tick ${tick + 1} | PAUSED`);
  });

  it("offers only supported speeds and reflects external speed changes", () => {
    const { runtime, speed } = setup();
    expect(speed.getAttribute("aria-label")).toBe("Speed");
    expect(
      [...speed.options].map((option) => [option.value, option.text]),
    ).toEqual([
      ["1", "1x"],
      ["4", "4x"],
      ["16", "16x"],
    ]);
    expect(speed.value).toBe("1");
    for (const value of ["4", "16", "1"]) {
      speed.value = value;
      speed.dispatchEvent(new Event("change", { bubbles: true }));
      expect(runtime.speed).toBe(Number(value));
      expect(runtime.running).toBe(false);
    }
    runtime.setSpeed(4);
    expect(speed.value).toBe("4");
  });

  it("displays authoritative ticks without implying wall-clock time or announcing every tick", () => {
    const { controller, clock, playback } = setup();
    const saved = JSON.parse(controller.serialize());
    saved.state.tick = 12345;
    controller.restore(JSON.stringify(saved));
    playback.render();
    expect(clock.textContent).toBe("Tick 12345 | PAUSED");
    expect(clock.getAttribute("aria-label")).toBe(
      "Simulation tick 12345, paused",
    );
    expect(clock.getAttribute("aria-live")).toBe("off");
    expect(clock.title).toContain("complete tick");
  });
});
