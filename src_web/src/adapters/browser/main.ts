import "98.css";
import "./98-extensions.css";
import "./styles.css";

import {
  createController,
  type ControllerSnapshot,
} from "../../application/controller";
import { createInitialState } from "../../simulation/state";
import bookIconUrl from "./assets/book.svg";
import alarmIconUrl from "./assets/alarm.svg";
import budgetIconUrl from "./assets/budget.svg";
import cameraIconUrl from "./assets/camera.svg";
import controlIconUrl from "./assets/control.svg";
import debugIconUrl from "./assets/debug.svg";
import facilityIconUrl from "./assets/facility.svg";
import folderIconUrl from "./assets/folder.svg";
import medicalIconUrl from "./assets/medical.svg";
import personnelIconUrl from "./assets/personnel.svg";
import recordsIconUrl from "./assets/records.svg";
import scpEmblemUrl from "./assets/scp-emblem.svg";
import {
  createPersonnelMedicalWindows,
  updatePersonnelMedicalWindows,
} from "./medical-view";
import {
  createPersonnelInspectorWindows,
  updatePersonnelInspectors,
  updatePersonnelRoster,
} from "./personnel-view";
import { refreshForNewDeployment } from "./deployment-version";
import { renderSite } from "./renderer";
import { createBrowserRuntime, type SimulationSpeed } from "./runtime";
import { createWindowManager } from "./window-manager";

void refreshForNewDeployment();

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Application root was not found");

app.innerHTML = `
  <div class="desktop-icons" aria-label="Site Manager desktop">
    <button class="desktop-icon" type="button" data-open-window="facility-window">
      <img class="desktop-icon-asset" src="${facilityIconUrl}" alt="" />
      <span>Site 828</span>
    </button>
    <button class="desktop-icon" type="button" data-open-window="knowledge-window">
      <span class="desktop-icon-image knowledge-icon" aria-hidden="true"></span>
      <span>Foundation Library</span>
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
      <div class="address-bar">
        <label for="facility-address">Address</label>
        <input id="facility-address" value="C:\\FOUNDATION\\SITES\\SITE828" readonly />
      </div>
      <div class="folder-workspace">
        <div class="subsystem-grid" aria-label="Site 828 subsystems">
          <button class="subsystem-icon" type="button" data-open-window="camera-window">
            <span class="subsystem-image camera-subsystem" aria-hidden="true"></span>
            <span>Camera Feed</span>
          </button>
          <button class="subsystem-icon" type="button" data-open-window="personnel-window">
            <span class="subsystem-image personnel-subsystem" aria-hidden="true"></span>
            <span>Personnel Roster</span>
          </button>
          <button class="subsystem-icon" type="button" data-open-window="alarm-window">
            <span class="subsystem-image alarm-subsystem" aria-hidden="true"></span>
            <span>Alarm Manager</span>
          </button>
          <button class="subsystem-icon" type="button" data-open-window="budget-window">
            <span class="subsystem-image budget-subsystem" aria-hidden="true"></span>
            <span>Budget Report</span>
          </button>
          <button class="subsystem-icon" type="button" data-open-window="knowledge-window">
            <span class="subsystem-image archive-subsystem" aria-hidden="true"></span>
            <span>Research Archive</span>
          </button>
        </div>
        <aside class="folder-details" aria-label="Facility summary">
          <h2 id="site-name">Site 828</h2>
          <p>Provisional anomalous research and containment facility.</p>
          <dl class="status-list">
            <div><dt>Local time</dt><dd id="game-time">08:00</dd></div>
            <div><dt>Personnel</dt><dd id="personnel-count">6 assigned</dd></div>
            <div><dt>Containment</dt><dd>2 occupied</dd></div>
            <div><dt>Systems</dt><dd>5 available</dd></div>
          </dl>
        </aside>
      </div>
      <div class="status-bar">
        <p class="status-bar-field">5 objects</p>
        <p class="status-bar-field">Site systems online</p>
      </div>
    </div>
    <div class="resize-grip" aria-hidden="true"></div>
  </section>

  <section id="camera-window" class="window managed-window camera-window" aria-label="Site 828 camera feed">
    <div class="title-bar">
      <div class="title-bar-text">Site 828 - Camera Feed / Sector B1</div>
      <div class="title-bar-controls">
        <button aria-label="Minimize" disabled></button>
        <button aria-label="Maximize" disabled></button>
        <button type="button" aria-label="Close" data-window-close></button>
      </div>
    </div>
    <nav class="menu-bar" aria-label="Camera feed menu">
      <button type="button"><u>F</u>eed</button>
      <button type="button"><u>V</u>iew</button>
      <button type="button"><u>O</u>verlays</button>
      <button type="button"><u>H</u>elp</button>
    </nav>
    <div class="window-body camera-body">
      <div class="viewport-shell">
        <canvas id="site-canvas" width="960" height="540" aria-label="Isometric view of Site 828"></canvas>
      </div>
      <div class="status-bar">
        <p class="status-bar-field">LIVE</p>
        <p class="status-bar-field" id="camera-game-time">08:00</p>
        <p class="status-bar-field">Sector B1</p>
      </div>
    </div>
    <div class="resize-grip" aria-hidden="true"></div>
  </section>

  <section id="control-window" class="window managed-window control-window" aria-label="Simulation control">
    <div class="title-bar">
      <div class="title-bar-text">Simulation Control</div>
      <div class="title-bar-controls">
        <button id="control-expand" type="button" aria-label="Maximize" title="Switch to standard view" data-control-view="standard"></button>
        <button type="button" aria-label="Close" data-window-close></button>
      </div>
    </div>
    <nav class="menu-bar compact-menu-bar" role="menubar" aria-label="Simulation control menu">
      <div class="menu-bar-item"><button type="button" role="menuitem"><u>F</u>ile</button></div>
      <div class="menu-bar-item">
        <button id="control-view-menu-button" type="button" role="menuitem" aria-haspopup="menu" aria-expanded="false" aria-controls="control-view-menu"><u>V</u>iew</button>
        <ul id="control-view-menu" class="menu control-view-menu" role="menu">
          <li role="none"><button class="view-choice" type="button" role="menuitemradio" aria-checked="true" data-control-view="standard"><span class="menu-check" aria-hidden="true"></span>Standard</button></li>
          <li role="none"><button class="view-choice" type="button" role="menuitemradio" aria-checked="false" data-control-view="minimal"><span class="menu-check" aria-hidden="true"></span>Minimal</button></li>
        </ul>
      </div>
      <div class="menu-bar-item"><button type="button" role="menuitem"><u>H</u>elp</button></div>
    </nav>
    <div class="window-body control-body">
      <div class="clock-display">
        <span id="control-game-time">08:00</span>
        <small id="runtime-status">RUNNING / 1x</small>
      </div>
      <div class="transport-controls" role="toolbar" aria-label="Simulation controls">
        <button type="button" id="pause-button" class="media-button" aria-label="Pause simulation" aria-pressed="false"><span aria-hidden="true">Ⅱ</span></button>
        <button type="button" class="media-button" data-speed="1" aria-label="Run simulation at normal speed" aria-pressed="true"><span aria-hidden="true">▶</span></button>
        <button type="button" class="media-button" data-speed="2" aria-label="Run simulation at double speed" aria-pressed="false"><span aria-hidden="true">▶▶</span></button>
        <button type="button" class="media-button" data-speed="4" aria-label="Run simulation at quadruple speed" aria-pressed="false"><span aria-hidden="true">▶▶▶</span></button>
      </div>
    </div>
    <div class="resize-grip" aria-hidden="true"></div>
  </section>

  <section id="alarm-window" class="window managed-window alarm-window" aria-label="Site 828 alarm manager" hidden>
    <div class="title-bar">
      <div class="title-bar-text">Site 828 - Alarm Manager</div>
      <div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div>
    </div>
    <div class="window-body alarm-body">
      <div id="incident-badge" class="incident-badge incident-green">
        <span class="incident-light" aria-hidden="true"></span>
        <span><strong>GREEN / NORMAL</strong><small id="incident-summary">Routine operations</small></span>
      </div>
      <fieldset>
        <legend>Automatic response profile</legend>
        <label><input type="checkbox" checked disabled /> Yellow events reduce speed to 1x</label>
        <label><input type="checkbox" checked disabled /> Orange events pause simulation</label>
        <label><input type="checkbox" checked disabled /> Red events pause and sound facility alarm</label>
      </fieldset>
      <fieldset>
        <legend>Physical system</legend>
        <dl class="status-list">
          <div><dt>Console</dt><dd>B1-SEC-03</dd></div>
          <div><dt>Condition</dt><dd class="online-status">ONLINE</dd></div>
          <div><dt>Controller</dt><dd>Basic Mk I</dd></div>
        </dl>
        <p class="system-note">Automatic responses require power and a functioning alarm controller inside the facility.</p>
      </fieldset>
      <ol class="response-key" aria-label="Incident response levels">
        <li><span class="key-light green"></span>Green - routine</li>
        <li><span class="key-light yellow"></span>Yellow - attention</li>
        <li><span class="key-light orange"></span>Orange - threat</li>
        <li><span class="key-light red"></span>Red - emergency</li>
      </ol>
    </div>
    <div class="resize-grip" aria-hidden="true"></div>
  </section>

  <section id="personnel-window" class="window managed-window personnel-window" aria-label="Site 828 personnel roster" hidden>
    <div class="title-bar">
      <div class="title-bar-text">Site 828 - Personnel Roster</div>
      <div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div>
    </div>
    <div class="window-body">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Assignment</th><th>Current activity</th><th>Mood</th><th>Sanity</th></tr></thead>
        <tbody id="personnel-rows"></tbody>
      </table>
      <p class="preview-note">Double-click a person to open an independent inspector.</p>
    </div>
    <div class="resize-grip" aria-hidden="true"></div>
  </section>

  <section id="budget-window" class="window managed-window budget-window" aria-label="Site 828 budget report" hidden>
    <div class="title-bar">
      <div class="title-bar-text">Site 828 - Budget Report</div>
      <div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div>
    </div>
    <div class="window-body report-paper">
      <h2>Quarterly Discretionary Account</h2>
      <dl class="ledger">
        <div><dt>Current allocation</dt><dd>$ 240,000</dd></div>
        <div><dt>Committed construction</dt><dd>$ (38,400)</dd></div>
        <div><dt>Payroll forecast</dt><dd>$ (71,200)</dd></div>
        <div class="ledger-total"><dt>Available funds</dt><dd>$ 130,400</dd></div>
      </dl>
      <p class="preview-note">Provisional planning figures. Economy simulation is not active yet.</p>
    </div>
    <div class="resize-grip" aria-hidden="true"></div>
  </section>

  <section id="knowledge-window" class="window managed-window knowledge-window" aria-label="Foundation knowledgebase" hidden>
    <div class="title-bar">
      <div class="title-bar-text">Foundation Library '98 - Site 828</div>
      <div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div>
    </div>
    <nav class="menu-bar" aria-label="Knowledgebase menu">
      <button type="button"><u>T</u>opics</button><button type="button"><u>S</u>earch</button><button type="button"><u>H</u>istory</button><button type="button"><u>H</u>elp</button>
    </nav>
    <div class="window-body encyclopedia-body">
      <aside class="topic-tree">
        <strong>Contents</strong>
        <ul class="tree-view"><li>Foundation Operations<ul><li><strong>Site 828</strong></li><li>Containment Classes</li><li>Incident Protocols</li></ul></li><li>Known Anomalies</li><li>Personnel Handbook</li></ul>
      </aside>
      <article class="encyclopedia-article">
        <p class="article-section">FOUNDATION SITES / NORTH AMERICA</p>
        <h1>Site 828</h1>
        <div class="article-media"><span>INTERACTIVE FACILITY INDEX</span><small>5 linked systems available</small></div>
        <p>Site 828 is a provisional research and containment installation established near Jarbridge, Nevada.</p>
        <p>Its founding mandate concerns the study and classification of <a href="#">SCP-9620</a>. Access to detailed records remains restricted.</p>
        <fieldset class="research-capability">
          <legend>Personnel screening research</legend>
          <dl class="status-list">
            <div><dt>Anomalous Psychometrics</dt><dd id="psychometrics-status">NOT AVAILABLE</dd></div>
          </dl>
          <button id="unlock-psychometrics" type="button">Complete Research</button>
          <p class="system-note">Enables automatic analysis of anomalous personnel evidence and targeted follow-up screening.</p>
        </fieldset>
      </article>
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

  <div class="start-menu" id="start-menu" hidden>
    <div class="start-menu-rail">FOUNDATION</div>
    <div class="start-menu-items">
      <details class="start-submenu">
        <summary><img class="menu-item-icon" src="${folderIconUrl}" alt="" /><span><strong>Facilities</strong><small>Manage Foundation sites</small></span></summary>
        <div class="start-submenu-panel">
          <button type="button" data-open-window="facility-window"><img class="menu-item-icon" src="${facilityIconUrl}" alt="" /><span><strong>Site 828</strong><small>Jarbridge, Nevada</small></span></button>
        </div>
      </details>
      <button type="button" data-open-window="knowledge-window"><img class="menu-item-icon" src="${bookIconUrl}" alt="" /><span><strong>Foundation Library</strong><small>Browse available records</small></span></button>
      <hr />
      <button type="button" disabled><strong>Save Site...</strong><small>Not available in this build</small></button>
      <button type="button" disabled><strong>Load Site...</strong><small>Not available in this build</small></button>
      <button type="button" disabled><strong>Settings</strong><small>Desktop and simulation options</small></button>
    </div>
  </div>

  <footer id="taskbar" class="taskbar" aria-label="Simulation desktop taskbar">
    <button type="button" id="scp-menu-button" class="scp-menu-button" aria-expanded="false"><img class="scp-mark" src="${scpEmblemUrl}" alt="" /><strong>SCP</strong></button>
    <div class="taskbar-divider" aria-hidden="true"></div>
    <div id="taskbar-window-list" class="taskbar-window-list" aria-label="Open windows"></div>
    <button type="button" id="taskbar-clock" class="taskbar-clock" data-open-window="control-window" aria-label="Open Simulation Control">
      <span id="taskbar-status">▶</span><time id="taskbar-game-time">08:00</time>
    </button>
  </footer>
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
const cameraGameTime = requireElement<HTMLElement>("#camera-game-time");
const controlGameTime = requireElement<HTMLElement>("#control-game-time");
const taskbarGameTime = requireElement<HTMLElement>("#taskbar-game-time");
const taskbarStatus = requireElement<HTMLElement>("#taskbar-status");
const siteName = requireElement<HTMLElement>("#site-name");
const incidentBadge = requireElement<HTMLElement>("#incident-badge");
const incidentSummary = requireElement<HTMLElement>("#incident-summary");
const runtimeStatus = requireElement<HTMLElement>("#runtime-status");
const psychometricsStatus = requireElement<HTMLElement>(
  "#psychometrics-status",
);
const unlockPsychometricsButton = requireElement<HTMLButtonElement>(
  "#unlock-psychometrics",
);
const controlWindow = requireElement<HTMLElement>("#control-window");
const controlViewMenu = requireElement<HTMLElement>("#control-view-menu");
const controlViewMenuButton = requireElement<HTMLButtonElement>(
  "#control-view-menu-button",
);
const taskbar = requireElement<HTMLElement>("#taskbar");
const taskbarWindowList = requireElement<HTMLElement>("#taskbar-window-list");
const startMenu = requireElement<HTMLElement>("#start-menu");
const scpMenuButton = requireElement<HTMLButtonElement>("#scp-menu-button");
const stateVersion = requireElement<HTMLElement>("#state-version");
const simulationSeed = requireElement<HTMLElement>("#simulation-seed");
const personnelRows = requireElement<HTMLElement>("#personnel-rows");
const personnelCount = requireElement<HTMLElement>("#personnel-count");
const speedButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-speed]"),
);

const controller = createController(createInitialState());
const runtime = createBrowserRuntime(controller);
const personnelInspectors = createPersonnelInspectorWindows(
  app,
  controller.getSnapshot().game.personnel,
);
const personnelMedicalWindows = createPersonnelMedicalWindows(
  app,
  controller.getSnapshot().game.personnel,
);
const windowManager = createWindowManager(app);

windowManager.register(requireElement<HTMLElement>("#facility-window"), {
  id: "facility-window",
  title: "Site 828",
  iconUrl: facilityIconUrl,
  defaultRect: { left: 112, top: 28, width: 590, height: 410 },
  defaultOpen: true,
  minimumWidth: 120,
  minimumHeight: 32,
});
windowManager.register(requireElement<HTMLElement>("#camera-window"), {
  id: "camera-window",
  title: "Camera Feed",
  iconUrl: cameraIconUrl,
  defaultRect: { left: 484, top: 92, width: 760, height: 540 },
  defaultOpen: true,
  minimumWidth: 120,
  minimumHeight: 32,
});
windowManager.register(requireElement<HTMLElement>("#control-window"), {
  id: "control-window",
  title: "Simulation Control",
  iconUrl: controlIconUrl,
  defaultRect: { left: 22, top: 612, width: 330, height: 142 },
  defaultOpen: true,
  minimumWidth: 120,
  minimumHeight: 32,
});
windowManager.register(requireElement<HTMLElement>("#alarm-window"), {
  id: "alarm-window",
  title: "Alarm Manager",
  iconUrl: alarmIconUrl,
  defaultRect: { left: 770, top: 202, width: 390, height: 440 },
  defaultOpen: false,
  minimumWidth: 120,
  minimumHeight: 32,
});
windowManager.register(requireElement<HTMLElement>("#personnel-window"), {
  id: "personnel-window",
  title: "Personnel Roster",
  iconUrl: personnelIconUrl,
  defaultRect: { left: 218, top: 164, width: 500, height: 330 },
  defaultOpen: false,
  minimumWidth: 120,
  minimumHeight: 32,
});
windowManager.register(requireElement<HTMLElement>("#budget-window"), {
  id: "budget-window",
  title: "Budget Report",
  iconUrl: budgetIconUrl,
  defaultRect: { left: 322, top: 238, width: 420, height: 330 },
  defaultOpen: false,
  minimumWidth: 120,
  minimumHeight: 32,
});
windowManager.register(requireElement<HTMLElement>("#knowledge-window"), {
  id: "knowledge-window",
  title: "Foundation Library",
  iconUrl: bookIconUrl,
  defaultRect: { left: 264, top: 82, width: 720, height: 520 },
  defaultOpen: false,
  minimumWidth: 120,
  minimumHeight: 32,
});
windowManager.register(requireElement<HTMLElement>("#debug-window"), {
  id: "debug-window",
  title: "System Monitor",
  iconUrl: debugIconUrl,
  defaultRect: { left: 840, top: 420, width: 320, height: 230 },
  defaultOpen: false,
  minimumWidth: 120,
  minimumHeight: 32,
});
personnelInspectors.forEach((inspector, index) => {
  windowManager.register(inspector, {
    id: inspector.id,
    title:
      inspector.querySelector<HTMLElement>(".title-bar-text")?.textContent ??
      "Personnel Dossier",
    iconUrl: personnelIconUrl,
    defaultRect: {
      left: 150 + index * 34,
      top: 90 + index * 28,
      width: 440,
      height: 590,
    },
    defaultOpen: false,
    minimumWidth: 120,
    minimumHeight: 32,
  });
});
personnelMedicalWindows.medicalCharts.forEach((chart, index) => {
  const personName =
    chart.querySelector<HTMLElement>(".title-bar-text")?.textContent ??
    "Medical Chart";
  windowManager.register(chart, {
    id: chart.id,
    title: personName,
    iconUrl: medicalIconUrl,
    defaultRect: {
      left: 190 + index * 28,
      top: 72 + index * 24,
      width: 610,
      height: 500,
    },
    defaultOpen: false,
    minimumWidth: 360,
    minimumHeight: 260,
  });
});
personnelMedicalWindows.assessmentRecords.forEach((record, index) => {
  const personName =
    record.querySelector<HTMLElement>(".title-bar-text")?.textContent ??
    "Assessment Record";
  windowManager.register(record, {
    id: record.id,
    title: personName,
    iconUrl: recordsIconUrl,
    defaultRect: {
      left: 310 + index * 24,
      top: 118 + index * 20,
      width: 500,
      height: 390,
    },
    defaultOpen: false,
    minimumWidth: 300,
    minimumHeight: 220,
  });
});

function openPersonnelInspector(personId: string): void {
  windowManager.open(`personnel-inspector-${personId}`);
}

personnelRows.addEventListener("dblclick", (event) => {
  const row = (event.target as Element).closest<HTMLElement>(
    "[data-person-id]",
  );
  if (row?.dataset.personId) openPersonnelInspector(row.dataset.personId);
});
personnelRows.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const row = (event.target as Element).closest<HTMLElement>(
    "[data-person-id]",
  );
  if (!row?.dataset.personId) return;
  event.preventDefault();
  openPersonnelInspector(row.dataset.personId);
});

for (const desktopIcon of document.querySelectorAll<HTMLButtonElement>(
  "[data-open-window]",
)) {
  desktopIcon.addEventListener("dblclick", () => {
    const windowId = desktopIcon.dataset.openWindow;
    if (windowId) windowManager.open(windowId);
  });
}

for (const directLauncher of document.querySelectorAll<HTMLButtonElement>(
  ".start-menu [data-open-window]",
)) {
  directLauncher.addEventListener("click", () => {
    const windowId = directLauncher.dataset.openWindow;
    if (windowId) windowManager.open(windowId);
    startMenu.hidden = true;
    scpMenuButton.setAttribute("aria-expanded", "false");
  });
}

taskbar.addEventListener("click", (event) => {
  const launcher = (event.target as Element).closest<HTMLButtonElement>(
    "[data-open-window]",
  );
  const windowId = launcher?.dataset.openWindow;
  if (windowId) windowManager.open(windowId);
});

app.addEventListener("click", (event) => {
  const relatedWindowButton = (
    event.target as Element
  ).closest<HTMLButtonElement>("[data-open-related-window]");
  const relatedWindowId = relatedWindowButton?.dataset.openRelatedWindow;
  if (relatedWindowId) windowManager.open(relatedWindowId);

  const assessmentButton = (event.target as Element).closest<HTMLButtonElement>(
    "[data-assess-person-id]",
  );
  const personId = assessmentButton?.dataset.assessPersonId;
  if (personId) controller.orderPhysicalAssessment(personId);

  const traitAssessmentButton = (
    event.target as Element
  ).closest<HTMLButtonElement>("[data-assess-traits-person-id]");
  const traitPersonId = traitAssessmentButton?.dataset.assessTraitsPersonId;
  if (traitPersonId) controller.orderAnomalousAssessment(traitPersonId);
});

unlockPsychometricsButton.addEventListener("click", () => {
  controller.unlockAnomalousPsychometrics();
});

windowManager.subscribe((windows) => {
  taskbarWindowList.replaceChildren(
    ...windows
      .filter((windowState) => windowState.open)
      .map((windowState) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "task-button";
        button.dataset.openWindow = windowState.id;
        button.setAttribute("aria-pressed", String(windowState.active));
        button.setAttribute("aria-label", `Focus ${windowState.title}`);

        const icon = document.createElement("img");
        icon.src = windowState.iconUrl;
        icon.alt = "";

        const label = document.createElement("span");
        label.textContent = windowState.title;
        button.append(icon, label);
        return button;
      }),
  );
});

scpMenuButton.addEventListener("click", () => {
  startMenu.hidden = !startMenu.hidden;
  scpMenuButton.setAttribute("aria-expanded", String(!startMenu.hidden));
});

document.addEventListener("pointerdown", (event) => {
  const target = event.target as Element;
  if (!startMenu.hidden && !target.closest("#start-menu, #scp-menu-button")) {
    startMenu.hidden = true;
    scpMenuButton.setAttribute("aria-expanded", "false");
  }
  if (!target.closest("#control-view-menu, #control-view-menu-button")) {
    controlViewMenuButton.setAttribute("aria-expanded", "false");
  }
});

const CONTROL_VIEW_KEY = "scp-site-manager.control-view.v1";

function setControlViewMenuOpen(open: boolean): void {
  controlViewMenuButton.setAttribute("aria-expanded", String(open));
}

controlViewMenuButton.addEventListener("click", () => {
  setControlViewMenuOpen(
    controlViewMenuButton.getAttribute("aria-expanded") !== "true",
  );
});

controlViewMenuButton.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setControlViewMenuOpen(false);
    return;
  }
  if (event.key !== "ArrowDown") return;
  event.preventDefault();
  setControlViewMenuOpen(true);
  controlViewMenu.querySelector<HTMLButtonElement>("button")?.focus();
});

controlViewMenu.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  setControlViewMenuOpen(false);
  controlViewMenuButton.focus();
});

function setControlView(view: "standard" | "minimal"): void {
  controlWindow.classList.toggle("minimal", view === "minimal");
  for (const choice of document.querySelectorAll<HTMLButtonElement>(
    ".view-choice",
  )) {
    const selected = choice.dataset.controlView === view;
    choice.setAttribute("aria-checked", String(selected));
    choice.classList.toggle("selected", selected);
  }
  if (view === "minimal") {
    controlWindow.style.width = "150px";
    controlWindow.style.height = "64px";
  } else {
    controlWindow.style.width = "304px";
    controlWindow.style.height = "130px";
  }
  localStorage.setItem(CONTROL_VIEW_KEY, view);
}

for (const viewButton of document.querySelectorAll<HTMLButtonElement>(
  "[data-control-view]",
)) {
  viewButton.addEventListener("click", () => {
    const view = viewButton.dataset.controlView;
    if (view === "standard" || view === "minimal") setControlView(view);
    setControlViewMenuOpen(false);
  });
}

setControlView(
  localStorage.getItem(CONTROL_VIEW_KEY) === "minimal" ? "minimal" : "standard",
);

function formatGameTime(totalMinutes: number): string {
  const minutesPerDay = 24 * 60;
  const normalizedMinutes = totalMinutes % minutesPerDay;
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function render(snapshot: ControllerSnapshot): void {
  renderSite(canvas, snapshot);
  updatePersonnelRoster(personnelRows, snapshot.game.personnel);
  updatePersonnelInspectors(personnelInspectors, snapshot.game.personnel);
  updatePersonnelMedicalWindows(
    personnelMedicalWindows,
    snapshot.game.personnel,
    snapshot.game.tick,
    snapshot.game.capabilities.anomalousPsychometrics,
  );
  psychometricsStatus.textContent = snapshot.game.capabilities
    .anomalousPsychometrics
    ? "AVAILABLE"
    : "NOT AVAILABLE";
  psychometricsStatus.className = snapshot.game.capabilities
    .anomalousPsychometrics
    ? "online-status"
    : "";
  unlockPsychometricsButton.disabled =
    snapshot.game.capabilities.anomalousPsychometrics;
  unlockPsychometricsButton.textContent = snapshot.game.capabilities
    .anomalousPsychometrics
    ? "Research Complete"
    : "Complete Research";
  personnelCount.textContent = `${snapshot.game.personnel.length} assigned`;
  siteName.textContent = snapshot.game.siteName;
  tickCount.textContent = snapshot.game.tick.toLocaleString();
  gameTime.textContent = formatGameTime(snapshot.game.gameMinute);
  cameraGameTime.textContent = formatGameTime(snapshot.game.gameMinute);
  controlGameTime.textContent = formatGameTime(snapshot.game.gameMinute);
  taskbarGameTime.textContent = formatGameTime(snapshot.game.gameMinute);
  stateVersion.textContent = snapshot.game.version.toString();
  simulationSeed.textContent = snapshot.game.seed.toString();
  incidentSummary.textContent = snapshot.game.incident.summary;
  incidentBadge.className = `incident-badge incident-${snapshot.game.incident.level}`;
  pauseButton.setAttribute("aria-pressed", String(!snapshot.running));
  pauseButton.setAttribute(
    "aria-label",
    snapshot.running ? "Pause simulation" : "Resume simulation",
  );
  runtimeStatus.textContent = snapshot.running
    ? `RUNNING / ${runtime.getSpeed()}x`
    : "PAUSED";
  const speedGlyphs: Record<SimulationSpeed, string> = {
    1: "▶",
    2: "▶▶",
    4: "▶▶▶",
  };
  taskbarStatus.textContent = snapshot.running
    ? speedGlyphs[runtime.getSpeed()]
    : "Ⅱ";
  requireElement<HTMLButtonElement>("#taskbar-clock").setAttribute(
    "aria-label",
    snapshot.running
      ? `Simulation running at ${runtime.getSpeed()}x; open Simulation Control`
      : "Simulation paused; open Simulation Control",
  );
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
