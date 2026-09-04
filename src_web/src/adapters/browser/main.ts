import "98.css";
import "./styles.css";

import {
  createController,
  type ControllerSnapshot,
} from "../../application/controller";
import { createInitialState } from "../../simulation/state";
import { renderSite } from "./renderer";
import { createBrowserRuntime, type SimulationSpeed } from "./runtime";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Application root was not found");

app.innerHTML = `
  <section class="window site-window" aria-label="SCPSiteManager operations window">
    <div class="title-bar">
      <div class="title-bar-text">SCPSiteManager - Site 828 Operations</div>
      <div class="title-bar-controls">
        <button aria-label="Minimize" disabled></button>
        <button aria-label="Maximize" disabled></button>
        <button aria-label="Close" disabled></button>
      </div>
    </div>
    <nav class="menu-bar" aria-label="Application menu">
      <button type="button"><u>F</u>ile</button>
      <button type="button"><u>S</u>ite</button>
      <button type="button"><u>V</u>iew</button>
      <button type="button"><u>R</u>eports</button>
      <button type="button"><u>H</u>elp</button>
    </nav>
    <div class="window-body">
      <div class="command-bar" role="toolbar" aria-label="Simulation controls">
        <button type="button" id="pause-button" aria-pressed="false">||&nbsp; Pause</button>
        <div class="toolbar-divider" aria-hidden="true"></div>
        <span class="toolbar-label">Speed</span>
        <div class="speed-controls" aria-label="Simulation speed">
          <button type="button" data-speed="1" aria-pressed="true">1x</button>
          <button type="button" data-speed="2" aria-pressed="false">2x</button>
          <button type="button" data-speed="4" aria-pressed="false">4x</button>
        </div>
      </div>

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
              <div><dt>Simulation tick</dt><dd id="tick-count">0</dd></div>
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
        <p class="status-bar-field" id="runtime-status">Running at 1x</p>
        <p class="status-bar-field">Sector B1</p>
        <p class="status-bar-field">No active orders</p>
      </div>
    </div>
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
const siteName = requireElement<HTMLElement>("#site-name");
const incidentBadge = requireElement<HTMLElement>("#incident-badge");
const incidentSummary = requireElement<HTMLElement>("#incident-summary");
const runtimeStatus = requireElement<HTMLElement>("#runtime-status");
const speedButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-speed]"),
);

const controller = createController(createInitialState());
const runtime = createBrowserRuntime(controller);

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
  incidentSummary.textContent = snapshot.game.incident.summary;
  incidentBadge.className = `incident-badge incident-${snapshot.game.incident.level}`;
  pauseButton.setAttribute("aria-pressed", String(!snapshot.running));
  pauseButton.innerHTML = snapshot.running
    ? "||&nbsp; Pause"
    : "&gt;&nbsp; Resume";
  runtimeStatus.textContent = snapshot.running
    ? `Running at ${runtime.getSpeed()}x`
    : "Simulation paused";
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
