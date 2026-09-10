import "98.css/dist/98.css";
import "./styles.css";
import { SessionController } from "../../application/SessionController";
import { createDesktop } from "./desktop/windows";
import {
  button,
  element,
  fieldset,
  iconButton,
  replaceContents,
  select,
} from "./desktop/dom";
import { createSiteMap } from "./map/site-map";
import {
  basicOrders,
  entityFacts,
  queueView,
  type ViewContext,
} from "./views/context";
import { createRuntime } from "./runtime";
import {
  exportSession,
  loadSavedSession,
  saveSession,
  SAVE_KEY,
} from "./persistence";
import { refreshForNewDeployment } from "../browser_shared/deployment-version";
import type { Position } from "../../simulation/core/entity/Entity";
import { createOperationsView } from "./views/operations";
import { physicalOrders } from "./views/physical";
import folderIcon from "../browser_shared/assets/folder.svg";
import recordsIcon from "../browser_shared/assets/records.svg";
import workerIcon from "../browser_shared/assets/site-worker.svg";

const host = document.querySelector<HTMLElement>("#app");
if (!host) throw new Error("Application host missing.");
const controller = new SessionController();
const message = element(
  "div",
  "desktop-message",
  "New campaign paused. Choose a worker, inspect a target, then issue an order.",
);
message.setAttribute("role", "status");
const report = (text: string) => {
  message.textContent = text;
};
const desktop = createDesktop(host, report);
const mapWindow = desktop.create("site", "Site map & orders", {
  left: 12,
  top: 90,
  width: 1120,
  height: Math.min(680, innerHeight - 175),
  open: true,
});
const operations = desktop.create("operations", "Operations & history", {
  left: 140,
  top: 60,
  width: 820,
  height: 570,
  open: false,
});
const runtime = createRuntime(controller, report, () => renderClock());
let siteId = controller.session.campaign!.homeId;
let subjectId: string | null = null;
let targetId: string | null = null;
let tile: Position | null = null;
const siteToolbar = element("div", "site-toolbar");
const mapLayout = element("div", "map-layout");
const inspection = element("div", "inspection-pane");
const queueDock = element("div", "queue-dock");
const portraits = element("div", "portrait-strip");
const map = createSiteMap(inspect, (position) => {
  tile = position;
  render();
});
mapLayout.append(map.root, inspection);
mapWindow.body.append(siteToolbar, portraits, mapLayout, queueDock);
const operationsView = createOperationsView(operations.body, () => ({
  controller,
  siteId,
  act,
  report,
  refresh: () => operationsView.render(),
  locate: (id, entityId) => {
    changeSite(id);
    if (entityId) inspect(entityId);
    mapWindow.open();
  },
}));
const taskbar = element("footer", "taskbar");
const menu = element("div", "scp-menu window");
menu.hidden = true;
function act(operation: () => void, notice?: string): void {
  try {
    operation();
    if (notice) report(notice);
  } catch (error) {
    report(
      `Cannot complete: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  render();
}
function inspect(id: string): void {
  targetId = id;
  tile = null;
  render();
}
function control(id: string | null): void {
  subjectId = id;
  if (id) targetId = id;
  render();
}
function changeSite(id: string): void {
  siteId = id;
  targetId = null;
  tile = null;
  render();
}
function renderClock(): void {
  runButton.textContent = runtime.running ? "Pause" : "Run";
  clock.textContent = `Tick ${controller.session.state.tick} | ${runtime.running ? "RUNNING" : "PAUSED"}`;
}
const scp = button("SCP", () => {
  menu.hidden = !menu.hidden;
});
scp.setAttribute("aria-label", "SCP menu");
const runButton = button("Run", () => runtime.setRunning(!runtime.running));
const clock = element("span", "clock");
taskbar.append(
  scp,
  desktop.taskButtons,
  runButton,
  button("Step", () => {
    runtime.setRunning(false);
    act(() => controller.step());
  }),
  select(
    "Speed",
    [1, 4, 16].map((speed) => ({ value: String(speed), label: `${speed}x` })),
    "1",
    (value) => runtime.setSpeed(Number(value)),
  ),
  clock,
);
const fileInput = element("input");
fileInput.type = "file";
fileInput.accept = ".json,application/json";
fileInput.hidden = true;
fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  runtime.setRunning(false);
  try {
    const text = await file.text();
    act(() => {
      controller.restore(text);
      changeSite(
        controller.session.campaign?.homeId ??
          Object.keys(controller.session.state.sites)[0]!,
      );
    }, "Imported session. Paused.");
  } catch (error) {
    report(`Import failed: ${String(error)}`);
  }
  fileInput.value = "";
});
menu.append(
  button("Save", () =>
    act(() => saveSession(controller), "Session saved in this browser."),
  ),
  button("Load saved session", () => {
    runtime.setRunning(false);
    act(() => {
      loadSavedSession(controller);
      changeSite(
        controller.session.campaign?.homeId ??
          Object.keys(controller.session.state.sites)[0]!,
      );
    }, "Saved session loaded. Paused.");
  }),
  button("Export session", () =>
    act(() => exportSession(controller), "Session exported."),
  ),
  button("Import session", () => fileInput.click()),
  button("New campaign", () => {
    runtime.setRunning(false);
    if (
      window.confirm(
        "Start a fresh campaign? Export or save first to keep the current session.",
      )
    )
      act(() => {
        controller.fresh();
        subjectId = null;
        changeSite(controller.session.campaign!.homeId);
      }, "Fresh campaign. The previous browser save is unchanged until you Save.");
  }),
  element("p", "", `Build ${import.meta.env.VITE_BUILD_VERSION}`),
  element(
    "p",
    "",
    "Development saves are disposable. Incompatible versions are rejected.",
  ),
);
host.append(message, menu, taskbar, fileInput);
const shortcuts = element("nav", "desktop-shortcuts");
shortcuts.setAttribute("aria-label", "Site folders");
for (const key of ["home", "blackwood", "kestrel"]) {
  const id = controller.session.campaign!.siteIds[key]!;
  const shortcut = iconButton(
    key === "home"
      ? "Home site"
      : key === "blackwood"
        ? "Blackwood"
        : "Kestrel Marsh",
    folderIcon,
    () => {},
    `folder:${key}`,
  );
  const open = () => {
    changeSite(id);
    mapWindow.open();
  };
  shortcut.addEventListener("dblclick", open);
  shortcut.addEventListener("click", (event) => {
    if (event.detail === 0) open();
  });
  shortcuts.append(shortcut);
}
shortcuts.append(
  iconButton("Operations", recordsIcon, () => operations.open()),
);
desktop.surface.prepend(shortcuts);

function render(): void {
  const session = controller.session;
  const site =
    session.state.sites[siteId] ?? Object.values(session.state.sites)[0]!;
  siteId = site.id;
  const context: ViewContext = {
    controller,
    site,
    subjectId,
    targetId,
    tile,
    act,
    inspect,
    control,
  };
  const subject = site.entities[subjectId ?? ""];
  const target = site.entities[targetId ?? ""];
  replaceContents(
    siteToolbar,
    button("Travel / preparation", () => {
      operationsView.showTravel();
      operations.open();
    }),
    select(
      "Site",
      Object.values(session.state.sites).map((entry) => ({
        value: entry.id,
        label: entry.name,
      })),
      site.id,
      changeSite,
    ),
    select(
      "Worker",
      [
        { value: "", label: "No command recipient" },
        ...Object.values(site.entities)
          .filter((entry) => entry.kind === "pawn" && entry.playerControllable)
          .map((entry) => ({ value: entry.id, label: entry.name })),
      ],
      subject?.id ?? "",
      (id) => control(id || null),
    ),
    select(
      "Inspect",
      [
        { value: "", label: "Choose an entity" },
        ...Object.values(site.entities).map((entry) => ({
          value: entry.id,
          label: `${entry.name} (${entry.kind})`,
        })),
      ],
      target?.id ?? "",
      (id) => inspect(id),
    ),
  );
  map.render(site, subjectId, targetId, tile);
  replaceContents(
    portraits,
    ...Object.values(site.entities)
      .filter((entry) => entry.kind === "pawn" && entry.playerControllable)
      .map((entry) => {
        const portrait = iconButton(
          entry.name,
          workerIcon,
          () => control(entry.id === subjectId ? null : entry.id),
          `portrait:${entry.id}`,
        );
        portrait.setAttribute("aria-pressed", String(entry.id === subjectId));
        return portrait;
      }),
  );
  const content: HTMLElement[] = [];
  if (subject?.kind === "pawn" && subject.id !== target?.id)
    content.push(
      fieldset(
        `Command recipient: ${subject.name}`,
        button("Deselect", () => control(null)),
      ),
    );
  if (subjectId && !subject)
    content.push(
      element(
        "p",
        "",
        "Selected worker is at another site or in transit. Inspection does not issue remote orders.",
      ),
    );
  if (target) content.push(entityFacts(context, target));
  else
    content.push(
      element(
        "p",
        "",
        tile
          ? `Floor target (${tile.x}, ${tile.y})`
          : "Inspect a person or object on the map, or use the entity list.",
      ),
    );
  if (target && tile)
    content.push(
      element(
        "p",
        "destination-notice",
        `Floor destination: (${tile.x}, ${tile.y}). Inspected target remains ${target.name}.`,
      ),
    );
  content.push(basicOrders(context, target));
  content.push(...physicalOrders(context, target));
  replaceContents(queueDock, ...(subject ? [queueView(context, subject)] : []));
  replaceContents(inspection, ...content);
  operationsView.render();
  renderClock();
}

controller.subscribe(() => render());
try {
  if (localStorage.getItem(SAVE_KEY)) {
    loadSavedSession(controller);
    report("Browser save restored. Simulation is paused.");
  }
} catch (error) {
  report(
    `Saved session not loaded: ${String(error)}. A fresh campaign is available; the save has not been overwritten.`,
  );
}
render();
void refreshForNewDeployment();
