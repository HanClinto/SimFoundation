import "98.css/dist/98.css";
import "./styles.css";
import { SessionController } from "../../application/SessionController";
import { createDesktop } from "./desktop/windows";
import {
  button,
  element,
  iconButton,
  replaceContents,
  select,
} from "./desktop/dom";
import { createSiteMap } from "./map/site-map";
import { queueView, type ViewContext } from "./views/context";
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
import { createInspector } from "./views/inspector";
import { firstAlarm } from "../../application/Alarms";
import type { TickEvent } from "../../simulation/core/Simulation";
import { operatingPhase } from "../../simulation/core/site/OperatingCycle";
import { resetChoices } from "./views/choices";
import folderIcon from "../browser_shared/assets/folder.svg";
import recordsIcon from "../browser_shared/assets/records.svg";
import workerIcon from "../browser_shared/assets/site-worker.svg";
import { entityArt } from "./map/art";
import { createMenu, type MenuEntry, type MenuPoint } from "./desktop/menu";
import { createPlayback } from "./desktop/playback";
import { actionMenu } from "./views/action-menu";
import { personnelView } from "./views/personnel";
import { createTravelView, type OperationsContext } from "./views/travel";
import cameraIcon from "../browser_shared/assets/camera.svg";
import personnelIcon from "../browser_shared/assets/personnel.svg";
import facilityIcon from "../browser_shared/assets/facility.svg";
import scpIcon from "../browser_shared/assets/scp-emblem.svg";
import workIcon from "../browser_shared/assets/work-orders.svg";

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
let latestAlarm: Readonly<TickEvent> | null = null;
const alarmBanner = element("div", "alarm-banner");
alarmBanner.hidden = true;
const desktop = createDesktop(host, report);
const mapWindow = desktop.create(
  "site",
  "Site map & orders",
  {
    left: 12,
    top: 90,
    width: 860,
    height: Math.min(680, innerHeight - 175),
    open: true,
  },
  cameraIcon,
);
const operations = desktop.create(
  "operations",
  "Operations & history",
  {
    left: 140,
    top: 60,
    width: 820,
    height: 570,
    open: false,
  },
  recordsIcon,
);
const inspectionWindow = desktop.create(
  "inspector",
  "Entity inspector",
  {
    left: 895,
    top: 90,
    width: 440,
    height: Math.min(680, innerHeight - 175),
    open: false,
  },
  recordsIcon,
);
const expeditions = desktop.create(
  "expeditions",
  "Expeditions",
  {
    left: 140,
    top: 60,
    width: 820,
    height: 570,
    open: false,
  },
  facilityIcon,
);
const personnel = desktop.create(
  "personnel",
  "Personnel",
  {
    left: 180,
    top: 125,
    width: 590,
    height: 400,
    open: false,
  },
  personnelIcon,
);
const menus = createMenu(host);
const runtime = createRuntime(controller, report, () => renderClock());
let siteId = controller.session.campaign!.homeId;
let subjectId: string | null = null;
let targetId: string | null = null;
let tile: Position | null = null;
const siteToolbar = element("div", "site-toolbar");
const mapLayout = element("div", "map-layout");
const inspector = createInspector(() => render());
const inspection = inspector.root;
const inspectorToolbar = element("div", "inspector-toolbar");
const queueDock = element("div", "queue-dock");
const portraits = element("div", "portrait-strip");
const selection = element("div", "selection-summary");
const map = createSiteMap(
  (id, event) => {
    const entity = controller.session.state.sites[siteId]?.entities[id];
    const subject =
      controller.session.state.sites[siteId]?.entities[subjectId ?? ""];
    if (!subject && entity?.kind === "pawn" && entity.playerControllable) {
      control(id);
      report(
        `Selected ${entity.name}. Click a target or floor and choose an action to add it to the queue.`,
      );
      return;
    }
    targetId = id;
    tile = null;
    render();
    if (event) showActions(event);
  },
  (position, event) => {
    tile = position;
    render();
    if (event) showActions(event);
  },
  inspect,
);
mapLayout.append(map.root);
inspectionWindow.body.append(inspectorToolbar, inspection);
const menuBar = element("nav", "window-menu-bar");
menuBar.setAttribute("aria-label", "Site window menus");
mapWindow.body.append(
  menuBar,
  siteToolbar,
  portraits,
  selection,
  mapLayout,
  queueDock,
);
function operationsContext(): OperationsContext {
  return {
    controller,
    siteId,
    act,
    report,
    refresh: () => render(),
    locate: (id, entityId) => {
      changeSite(id);
      mapWindow.open();
      if (entityId) inspect(entityId);
    },
  };
}
const operationsView = createOperationsView(operations.body, operationsContext);
const travelView = createTravelView();
function showTravel(): void {
  expeditions.open();
  render();
}
function showInspector(): void {
  inspectionWindow.open();
  render();
}
function viewContext(): ViewContext {
  return {
    controller,
    site: controller.session.state.sites[siteId]!,
    subjectId,
    targetId,
    tile,
    act,
    inspect,
    control,
  };
}
function showActions(event: MouseEvent | KeyboardEvent): void {
  if (event instanceof MouseEvent && event.detail > 1) return;
  const context = viewContext();
  const subject = context.site.entities[subjectId ?? ""];
  const target = tile ? undefined : context.site.entities[targetId ?? ""];
  const entries = actionMenu(tile ? { ...context, targetId: null } : context);
  if (!entries.length) {
    if (target) inspect(target.id);
    else report("Choose a worker portrait before queuing a floor action.");
    return;
  }
  const owner =
    event.currentTarget instanceof HTMLElement ||
    event.currentTarget instanceof SVGElement
      ? event.currentTarget
      : map.root;
  const rect = owner.getBoundingClientRect();
  const point: MenuPoint =
    event instanceof MouseEvent && event.detail !== 0
      ? { x: event.clientX + 8, y: event.clientY + 4 }
      : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  menus.show(
    entries,
    point,
    `${subject?.name ?? "Inspect"}: ${target?.name ?? "Floor actions"}`,
    owner,
  );
}
operations.root.addEventListener("desktop-open", () => operationsView.render());
mapWindow.root.addEventListener("desktop-open", () => render());
inspectionWindow.root.addEventListener("desktop-open", () => render());
expeditions.root.addEventListener("desktop-open", () => render());
personnel.root.addEventListener("desktop-open", () => render());
const taskbar = element("footer", "taskbar");
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
  inspectionWindow.open();
  render();
}
function control(id: string | null): void {
  subjectId = id;
  if (id) targetId = id;
  render();
}
function changeSite(id: string): void {
  if (!controller.session.state.sites[id]) {
    report("That site is not present in this session.");
    return;
  }
  siteId = id;
  menus.close();
  targetId = null;
  tile = null;
  render();
}
function resetSessionPresentation(): void {
  menus.close();
  latestAlarm = null;
  alarmBanner.hidden = true;
  subjectId = null;
  targetId = null;
  tile = null;
  resetChoices();
  inspector.reset();
  operationsView.reset();
  travelView.reset();
  changeSite(
    controller.session.campaign?.homeId ??
      Object.keys(controller.session.state.sites)[0]!,
  );
}
function renderClock(): void {
  playback.render();
}
const scp = iconButton("SCP", scpIcon, () => {
  if (scp.getAttribute("aria-expanded") === "true") menus.close(true);
  else {
    const rect = scp.getBoundingClientRect();
    menus.show(
      startEntries(),
      { x: rect.left, y: rect.top },
      "SCP",
      scp,
      "scp-menu",
    );
  }
});
scp.setAttribute("aria-label", "SCP menu");
scp.setAttribute("aria-expanded", "false");
scp.setAttribute("aria-haspopup", "menu");
const playback = createPlayback(controller, runtime, act);
taskbar.append(scp, desktop.taskButtons, playback.root);
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
      resetSessionPresentation();
    }, "Imported session. Paused.");
  } catch (error) {
    report(`Import failed: ${String(error)}`);
  }
  fileInput.value = "";
});
function siteEntries(): MenuEntry[] {
  return Object.values(controller.session.state.sites).map((entry) => ({
    label: entry.name,
    icon: folderIcon,
    action: () => {
      changeSite(entry.id);
      mapWindow.open();
    },
  }));
}
function windowEntries(): MenuEntry[] {
  return [
    { label: "Site map & orders", icon: cameraIcon, action: mapWindow.open },
    { label: "Expeditions", icon: facilityIcon, action: showTravel },
    { label: "Personnel", icon: personnelIcon, action: personnel.open },
    { label: "Entity inspector", icon: recordsIcon, action: showInspector },
    { label: "Operations & history", icon: workIcon, action: operations.open },
  ];
}
function startEntries(): MenuEntry[] {
  return [
    {
      label: "Facilities",
      icon: folderIcon,
      children: siteEntries(),
      menuClass: "facility-menu",
    },
    { label: "Windows", icon: cameraIcon, children: windowEntries() },
    { separator: true },
    {
      label: "Save",
      icon: recordsIcon,
      action: () =>
        act(() => saveSession(controller), "Session saved in this browser."),
    },
    {
      label: "Load saved session",
      icon: folderIcon,
      action: () => {
        runtime.setRunning(false);
        act(() => {
          loadSavedSession(controller);
          resetSessionPresentation();
        }, "Saved session loaded. Paused.");
      },
    },
    {
      label: "Export session",
      icon: recordsIcon,
      action: () => act(() => exportSession(controller), "Session exported."),
    },
    {
      label: "Import session",
      icon: folderIcon,
      action: () => fileInput.click(),
    },
    { separator: true },
    {
      label: "New campaign",
      icon: scpIcon,
      action: () => {
        runtime.setRunning(false);
        if (
          window.confirm(
            "Start a fresh campaign? Export or save first to keep the current session.",
          )
        )
          act(() => {
            controller.fresh();
            resetSessionPresentation();
          }, "Fresh campaign. The previous browser save is unchanged until you Save.");
      },
    },
    {
      label: `Build ${import.meta.env.VITE_BUILD_VERSION}`,
      icon: recordsIcon,
      disabledReason:
        "Current loaded build. Startup checks for a newer deployment.",
    },
  ];
}
for (const [label, entries] of [
  ["Site", siteEntries],
  ["Windows", windowEntries],
  [
    "Orders",
    () => [
      {
        label: "Inspect target / more orders",
        icon: recordsIcon,
        action: showInspector,
      },
      {
        label: "Select personnel",
        icon: personnelIcon,
        action: personnel.open,
      },
    ],
  ],
] as const) {
  const opener = button(label, () => {
    if (opener.getAttribute("aria-expanded") === "true") menus.close(true);
    else {
      const rect = opener.getBoundingClientRect();
      menus.show(entries(), { x: rect.left, y: rect.bottom }, label, opener);
    }
  });
  opener.setAttribute("aria-haspopup", "menu");
  opener.setAttribute("aria-expanded", "false");
  menuBar.append(opener);
}
host.append(message, alarmBanner, taskbar, fileInput);
const shortcuts = element("nav", "desktop-shortcuts");
shortcuts.setAttribute("aria-label", "Site folders");
for (const key of ["home", "blackwood", "kestrel"]) {
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
    const id = controller.session.campaign?.siteIds[key];
    if (!id) {
      report("This session has no named campaign site for that shortcut.");
      return;
    }
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
  iconButton("Expeditions", facilityIcon, showTravel),
  iconButton("Personnel", personnelIcon, personnel.open),
);
desktop.surface.prepend(shortcuts);

function render(): void {
  const session = controller.session;
  const site =
    session.state.sites[siteId] ?? Object.values(session.state.sites)[0]!;
  siteId = site.id;
  const context = viewContext();
  const subject = site.entities[subjectId ?? ""];
  const target = site.entities[targetId ?? ""];
  if (!mapWindow.root.hidden) {
    replaceContents(
      siteToolbar,
      iconButton("Travel / preparation", facilityIcon, showTravel),
      select(
        "Site",
        Object.values(session.state.sites).map((entry) => ({
          value: entry.id,
          label: entry.name,
        })),
        site.id,
        changeSite,
      ),
      iconButton("Personnel", personnelIcon, personnel.open),
    );
    if (site.cycle) {
      const phase = operatingPhase(site.cycle, session.state.tick);
      siteToolbar.append(
        element(
          "strong",
          "site-cycle",
          `Site cycle: ${phase.phase.toUpperCase()}${phase.changesAt === null ? "" : `; changes at tick ${phase.changesAt}`}`,
        ),
      );
    }
    map.render(site, subjectId, targetId, tile);
    replaceContents(
      portraits,
      ...Object.values(site.entities)
        .filter((entry) => entry.kind === "pawn" && entry.playerControllable)
        .map((entry) => {
          const portrait = iconButton(
            entry.name,
            entityArt(entry) ?? workerIcon,
            () => control(entry.id === subjectId ? null : entry.id),
            `portrait:${entry.id}`,
          );
          portrait.setAttribute("aria-pressed", String(entry.id === subjectId));
          return portrait;
        }),
    );
    replaceContents(
      queueDock,
      ...(subject ? [queueView(context, subject)] : []),
    );
    replaceContents(
      selection,
      element(
        "strong",
        "",
        subject ? `Selected: ${subject.name}` : "Choose a worker portrait",
      ),
      element(
        "span",
        "",
        target
          ? `Target: ${target.name}`
          : tile
            ? `Floor (${tile.x}, ${tile.y})`
            : "Click a target or floor to queue an action.",
      ),
      iconButton("Inspect / more orders", recordsIcon, showInspector),
    );
  }
  if (!inspectionWindow.root.hidden) {
    replaceContents(
      inspectorToolbar,
      select(
        "Worker",
        [
          { value: "", label: "No command recipient" },
          ...Object.values(site.entities)
            .filter(
              (entry) => entry.kind === "pawn" && entry.playerControllable,
            )
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
            label: `${entry.name} (${entry.kind}) [${session.labels[entry.id] ?? entry.id}]`,
          })),
        ],
        target?.id ?? "",
        inspect,
      ),
    );
    inspector.render(context);
  }
  if (!personnel.root.hidden)
    replaceContents(personnel.body, personnelView(context));
  if (!expeditions.root.hidden)
    replaceContents(expeditions.body, travelView.render(operationsContext()));
  if (!operations.root.hidden) operationsView.render();
  renderClock();
}

controller.subscribe((_session, events) => {
  const alarm = firstAlarm(events);
  if (alarm) {
    latestAlarm = alarm;
    alarmBanner.hidden = false;
    replaceContents(
      alarmBanner,
      element(
        "strong",
        "",
        `${alarm.kind.toUpperCase()} | tick ${alarm.tick}: ${alarm.reason ?? alarm.entityId}`,
      ),
      button("Locate incident", () => {
        if (latestAlarm && controller.session.state.sites[latestAlarm.siteId]) {
          changeSite(latestAlarm.siteId);
          inspect(latestAlarm.targetId ?? latestAlarm.entityId);
          mapWindow.open();
        }
      }),
      button("Open response desk", () => {
        operationsView.showResponse();
        operations.open();
      }),
      button("Acknowledge alarm", () => {
        latestAlarm = null;
        alarmBanner.hidden = true;
      }),
    );
  }
  render();
});
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
