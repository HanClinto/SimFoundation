import type { SessionController } from "../../../application/SessionController";
import type { createRuntime } from "../runtime";
import { button, element, select } from "./dom";
import "./playback.css";

function icon(path: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
  shape.setAttribute("d", path);
  svg.append(shape);
  return svg;
}

export function createPlayback(
  controller: SessionController,
  runtime: ReturnType<typeof createRuntime>,
  act: (operation: () => void, notice?: string) => void,
): { root: HTMLElement; render(): void } {
  const root = element("div", "playback");
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", "Simulation playback");

  const run = button(
    "",
    () => runtime.setRunning(!runtime.running),
    "playback-run",
  );
  run.className = "playback-button";
  const playIcon = icon("M4 2 14 8 4 14Z");
  const pauseIcon = icon("M3 2H7V14H3ZM9 2H13V14H9Z");
  run.append(playIcon, pauseIcon);

  const step = button(
    "",
    () => {
      runtime.setRunning(false);
      act(() => controller.step());
    },
    "playback-step",
  );
  step.className = "playback-button";
  step.setAttribute("aria-label", "Step");
  step.title = "Step — pause and advance one complete tick";
  step.append(icon("M2 2 11 8 2 14ZM12 2H14V14H12Z"));

  const speed = select(
    "Speed",
    [1, 4, 16].map((value) => ({
      value: String(value),
      label: `${value}x`,
    })),
    String(runtime.speed),
    (value) => runtime.setSpeed(Number(value)),
  );
  speed.className = "playback-speed";
  const speedInput = speed.querySelector("select")!;
  speedInput.title = "Playback speed";

  const clock = element("span", "playback-clock clock");
  clock.setAttribute("role", "timer");
  clock.setAttribute("aria-live", "off");
  clock.title = "Simulation tick — advances only after a complete tick";
  root.append(run, step, speed, clock);

  function render(): void {
    const running = runtime.running;
    run.setAttribute("aria-label", running ? "Pause" : "Run");
    run.setAttribute("aria-pressed", String(running));
    run.title = running ? "Pause simulation" : "Run simulation";
    playIcon.style.display = running ? "none" : "";
    pauseIcon.style.display = running ? "" : "none";
    root.dataset.running = String(running);
    speedInput.value = String(runtime.speed);
    const tick = controller.session.state.tick;
    const status = running ? "RUNNING" : "PAUSED";
    clock.textContent = `Tick ${tick} | ${status}`;
    clock.setAttribute(
      "aria-label",
      `Simulation tick ${tick}, ${status.toLowerCase()}`,
    );
  }

  render();
  return { root, render };
}
