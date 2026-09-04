import "98.css";
import "./styles.css";

import {
  createController,
  type ControllerSnapshot,
} from "../../application/controller";
import { createInitialState } from "../../simulation/state";
import { renderSite } from "./renderer";
import { createBrowserRuntime, type SimulationSpeed } from "./runtime";
import { createWindowManager } from "./window-manager";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Application root was not found");

app.innerHTML = `
  <div class="desktop-icons" aria-label="Site Manager desktop">
    <button class="desktop-icon" type="button" data-open-window="facility-window">
      <span class="desktop-icon-image facility-icon" aria-hidden="true"></span>
      <span>Site 828</span>
    </button>
    <button class="desktop-icon" type="button" data-open-window="control-window">
      <span class="desktop-icon-image control-icon" aria-hidden="true"></span>
      <span>Simulation Control</span>
    </button>
    <button class="desktop-icon" type="button" data-open-window="debug-window">
      <span class="desktop-icon-image debug-icon" aria-hidden="true"></span>
      <span>System Monitor</span>
    </button>
  </div>

  <section id="facility-window" class="window managed-window site-window" aria-label="Site 828 facility inspector">
    <div class="title-bar">
      <div class="title-bar-text">Site 828 - Facility Inspector</div>
      <div class="title-bar-controls">
        <button aria-label="Minimize" disabled></button>
        <button aria-label="Maximize" disabled></button>
        <button type="button" aria-label="Close" data-window-close></button>
      </div>
    </div>
    <nav class="menu-bar" aria-label="Facility menu">
      <button type="button"><u>F</u>ile</button>
      <button type="button"><u>S</u>ite</button>
      <button type="button"><u>V</u>iew</button>
      <button type="button"><u>R</u>eports</button>
      <button type="button"><u>H</u>elp</button>
    </nav>
    <div class="window-body">
      <div class="workspace">
        <div class="viewport-shell">
          <canvas id="site-canvas" width="960" height="540" aria-label="Isometric view of Site 828"></canvas>
        </div>

        <aside class="operations-panel" aria-label="Site overview">
          <fieldset>
            <legend>Site status</legend>
            <dl class="status-list">
              <div><dt>Facility</dt><dd id="site-name">Site 828</dd></div>
              <div><dt>Local time</dt><dd id="game-time">08:00</dd></div>
              <div><dt>Personnel</dt><dd>6 assigned</dd></div>
              <div><dt>Containment</dt><dd>2 occupied</dd></div>
            </dl>
          </fieldset>

          <fieldset>
            <legend>Incident response</legend>
            <div id="incident-badge" class="incident-badge incident-green">
              <span class="incident-light" aria-hidden="true"></span>
              <span><strong>GREEN</strong><small id="incident-summary">Routine operations</small></span>
            </div>
            <ol class="response-key" aria-label="Incident response levels">
              <li><span class="key-light green"></span>Green - routine</li>
              <li><span class="key-light yellow"></span>Yellow - attention</li>
              <li><span class="key-light orange"></span>Orange - threat</li>
              <li><span class="key-light red"></span>Red - emergency</li>
            </ol>
          </fieldset>

          <fieldset>
            <legend>Director's log</legend>
            <p class="log-entry"><time>08:00</time> Morning shift assumed control.</p>
            <p class="log-entry"><time>08:00</time> SCP-9620 telemetry remains within provisional limits.</p>
          </fieldset>
        </aside>
      </div>

      <div class="status-bar">
        <p class="status-bar-field">Facility operating normally</p>
        <p class="status-bar-field">Sector B1</p>
        <p class="status-bar-field">No active orders</p>
      </div>
    </div>
    <div class="resize-grip" aria-hidden="true"></div>
  </section>

  <section id="control-window" class="window managed-window control-window" aria-label="Simulation control">
    <div class="title-bar">
      <div class="title-bar-text">Simulation Control</div>
      <div class="title-bar-controls">
        <button type="button" aria-label="Close" data-window-close></button>
      </div>
    </div>
    <div class="window-body control-body">
      <div class="clock-display">
        <span id="control-game-time">08:00</span>
        <small id="runtime-status">RUNNING / 1x</small>
      </div>
      <div class="transport-controls" role="toolbar" aria-label="Simulation controls">
        <button type="button" id="pause-button" aria-label="Pause simulation" aria-pressed="false">||</button>
        <button type="button" data-speed="1" aria-label="Run simulation at normal speed" aria-pressed="true">1x</button>
        <button type="button" data-speed="2" aria-label="Run simulation at double speed" aria-pressed="false">2x</button>
        <button type="button" data-speed="4" aria-label="Run simulation at quadruple speed" aria-pressed="false">4x</button>
      </div>
    </div>
    <div class="resize-grip" aria-hidden="true"></div>
  </section>

  <section id="debug-window" class="window managed-window debug-window" aria-label="System monitor" hidden>
    <div class="title-bar">
      <div class="title-bar-text">System Monitor</div>
      <div class="title-bar-controls">
        <button type="button" aria-label="Close" data-window-close></button>
      </div>
    </div>
    <div class="window-body">
      <fieldset>
        <legend>Simulation internals</legend>
        <dl class="status-list debug-values">
          <div><dt>State version</dt><dd id="state-version">1</dd></div>
          <div><dt>Seed</dt><dd id="simulation-seed">9620</dd></div>
          <div><dt>Simulation tick</dt><dd id="tick-count">0</dd></div>
        </dl>
      </fieldset>
      <p>Developer diagnostics are isolated here and are not part of the Site Director's operational view.</p>
    </div>
    <div class="resize-grip" aria-hidden="true"></div>
  </section>
`;

function requireElement<ElementType extends Element>(
  selector: string,
): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}

const canvas = requireElement<HTMLCanvasElement>("#site-canvas");
const pauseButton = requireElement<HTMLButtonElement>("#pause-button");
const tickCount = requireElement<HTMLElement>("#tick-count");
const gameTime = requireElement<HTMLElement>("#game-time");
const controlGameTime = requireElement<HTMLElement>("#control-game-time");
const siteName = requireElement<HTMLElement>("#site-name");
const incidentBadge = requireElement<HTMLElement>("#incident-badge");
const incidentSummary = requireElement<HTMLElement>("#incident-summary");
const runtimeStatus = requireElement<HTMLElement>("#runtime-status");
const stateVersion = requireElement<HTMLElement>("#state-version");
const simulationSeed = requireElement<HTMLElement>("#simulation-seed");
const speedButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-speed]"),
);

const controller = createController(createInitialState());
const runtime = createBrowserRuntime(controller);
const windowManager = createWindowManager(app);

windowManager.register(requireElement<HTMLElement>("#facility-window"), {
  id: "facility-window",
  defaultRect: { left: 126, top: 34, width: 1100, height: 680 },
  defaultOpen: true,
  minimumWidth: 760,
  minimumHeight: 480,
});
windowManager.register(requireElement<HTMLElement>("#control-window"), {
  id: "control-window",
  defaultRect: { left: 28, top: 568, width: 286, height: 128 },
  defaultOpen: true,
  minimumWidth: 260,
  minimumHeight: 116,
});
windowManager.register(requireElement<HTMLElement>("#debug-window"), {
  id: "debug-window",
  defaultRect: { left: 840, top: 420, width: 320, height: 230 },
  defaultOpen: false,
  minimumWidth: 280,
  minimumHeight: 190,
});

for (const desktopIcon of document.querySelectorAll<HTMLButtonElement>(
  "[data-open-window]",
)) {
  desktopIcon.addEventListener("dblclick", () => {
    const windowId = desktopIcon.dataset.openWindow;
    if (windowId) windowManager.open(windowId);
  });
}

function formatGameTime(totalMinutes: number): string {
  const minutesPerDay = 24 * 60;
  const normalizedMinutes = totalMinutes % minutesPerDay;
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function render(snapshot: ControllerSnapshot): void {
  renderSite(canvas, snapshot);
  siteName.textContent = snapshot.game.siteName;
  tickCount.textContent = snapshot.game.tick.toLocaleString();
  gameTime.textContent = formatGameTime(snapshot.game.gameMinute);
  controlGameTime.textContent = formatGameTime(snapshot.game.gameMinute);
  stateVersion.textContent = snapshot.game.version.toString();
  simulationSeed.textContent = snapshot.game.seed.toString();
  incidentSummary.textContent = snapshot.game.incident.summary;
  incidentBadge.className = `incident-badge incident-${snapshot.game.incident.level}`;
  pauseButton.setAttribute("aria-pressed", String(!snapshot.running));
  pauseButton.textContent = snapshot.running ? "||" : ">";
  pauseButton.setAttribute(
    "aria-label",
    snapshot.running ? "Pause simulation" : "Resume simulation",
  );
  runtimeStatus.textContent = snapshot.running
    ? `RUNNING / ${runtime.getSpeed()}x`
    : "PAUSED";
}

pauseButton.addEventListener("click", () => {
  const { running } = controller.getSnapshot();
  controller.setRunning(!running);
});

for (const speedButton of speedButtons) {
  speedButton.addEventListener("click", () => {
    const speed = Number(speedButton.dataset.speed) as SimulationSpeed;
    runtime.setSpeed(speed);
    for (const button of speedButtons) {
      button.setAttribute("aria-pressed", String(button === speedButton));
    }
    render(controller.getSnapshot());
  });
}

controller.subscribe(render);
render(controller.getSnapshot());
runtime.start();
