import { button, element, iconButton } from "./dom";
import folderIcon from "../../browser_shared/assets/folder.svg";

const LAYOUT_KEY = "simfoundation.web.desktop.v1";

interface Layout {
  left: number;
  top: number;
  width: number;
  height: number;
  open: boolean;
  zIndex?: number;
}

export interface DesktopWindow {
  root: HTMLElement;
  body: HTMLElement;
  open(): void;
}

export function createDesktop(
  host: HTMLElement,
  report: (message: string) => void,
) {
  const surface = element("div", "desktop");
  const taskButtons = element("div", "task-buttons");
  const windows = new Map<string, DesktopWindow>();
  let zIndex = 1;
  let saved: Record<string, Layout> = {};
  try {
    const text = localStorage.getItem(LAYOUT_KEY);
    if (text) {
      const value: unknown = JSON.parse(text);
      if (value && typeof value === "object" && !Array.isArray(value))
        saved = value as Record<string, Layout>;
      else report("Desktop layout was invalid; using the default arrangement.");
    }
  } catch (error) {
    report(`Desktop preferences unavailable: ${String(error)}`);
  }
  host.append(surface);

  function persist(): void {
    const layout: Record<string, Layout> = {};
    for (const [id, window] of windows) {
      const node = window.root;
      layout[id] = {
        left: parseFloat(node.style.left),
        top: parseFloat(node.style.top),
        width: node.hidden ? parseFloat(node.style.width) : node.offsetWidth,
        height: node.hidden ? parseFloat(node.style.height) : node.offsetHeight,
        open: !node.hidden,
        zIndex: Number(node.style.zIndex) || 0,
      };
    }
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch (error) {
      report(`Could not save desktop preferences: ${String(error)}`);
    }
  }

  function create(
    id: string,
    title: string,
    defaults: Layout,
    iconUrl = folderIcon,
  ): DesktopWindow {
    const root = element("section", "window desktop-window");
    root.setAttribute("aria-label", title);
    root.tabIndex = -1;
    const titleBar = element("div", "title-bar");
    const controls = element("div", "title-bar-controls");
    const close = button("X", () => {
      root.hidden = true;
      const remaining = [...windows.values()]
        .filter((entry) => !entry.root.hidden)
        .sort(
          (a, b) => Number(b.root.style.zIndex) - Number(a.root.style.zIndex),
        )[0];
      if (remaining) {
        remaining.root.classList.remove("inactive");
        remaining.root.focus({ preventScroll: true });
      }
      updateTasks();
      persist();
    });
    close.setAttribute("aria-label", `Close ${title}`);
    controls.append(close);
    const titleText = element("div", "title-bar-text", title);
    const icon = element("img");
    icon.src = iconUrl;
    icon.alt = "";
    titleText.prepend(icon);
    titleBar.append(titleText, controls);
    const body = element("div", "window-body");
    root.append(titleBar, body);
    const stored = saved[id];
    const rect =
      stored &&
      [stored.left, stored.top, stored.width, stored.height].every(
        Number.isFinite,
      )
        ? stored
        : defaults;
    function place(layout: Layout): void {
      const style = getComputedStyle(root);
      const width = Math.max(
        360,
        parseFloat(style.minWidth) || 0,
        Math.min(layout.width, surface.clientWidth - 8),
      );
      const height = Math.max(
        250,
        parseFloat(style.minHeight) || 0,
        Math.min(layout.height, surface.clientHeight - 8),
      );
      root.style.left = `${Math.max(0, Math.min(layout.left, surface.clientWidth - width))}px`;
      root.style.top = `${Math.max(0, Math.min(layout.top, surface.clientHeight - height))}px`;
      root.style.width = `${width}px`;
      root.style.height = `${height}px`;
    }
    surface.append(root);
    place(rect);
    root.hidden = !rect.open;
    root.style.zIndex = String(
      Number.isFinite(rect.zIndex) ? rect.zIndex : ++zIndex,
    );
    zIndex = Math.max(zIndex, Number(root.style.zIndex));
    function focus(): void {
      for (const window of windows.values())
        window.root.classList.add("inactive");
      root.classList.remove("inactive");
      root.style.zIndex = String(++zIndex);
      updateTasks();
    }
    const window: DesktopWindow = {
      root,
      body,
      open: () => {
        root.hidden = false;
        root.dispatchEvent(new Event("desktop-open"));
        focus();
        root.focus({ preventScroll: true });
        persist();
      },
    };
    windows.set(id, window);
    const active = [...windows.values()]
      .filter((entry) => !entry.root.hidden)
      .sort(
        (a, b) => Number(b.root.style.zIndex) - Number(a.root.style.zIndex),
      )[0];
    for (const entry of windows.values())
      entry.root.classList.toggle("inactive", entry !== active);
    const task = iconButton(title, iconUrl, window.open);
    task.dataset.windowId = id;
    taskButtons.append(task);
    updateTasks();
    root.addEventListener("pointerdown", focus);
    root.addEventListener("focusin", focus);
    titleBar.addEventListener("pointerdown", (event) => {
      if (event.target instanceof Element && event.target.closest("button"))
        return;
      const start = {
        x: event.clientX,
        y: event.clientY,
        left: parseFloat(root.style.left),
        top: parseFloat(root.style.top),
      };
      titleBar.setPointerCapture(event.pointerId);
      const drag = (move: PointerEvent) => {
        root.style.left = `${Math.max(0, Math.min(start.left + move.clientX - start.x, surface.clientWidth - 100))}px`;
        root.style.top = `${Math.max(0, Math.min(start.top + move.clientY - start.y, surface.clientHeight - 40))}px`;
      };
      const finish = () => {
        titleBar.removeEventListener("pointermove", drag);
        titleBar.removeEventListener("pointerup", finish);
        titleBar.removeEventListener("pointercancel", finish);
        persist();
      };
      titleBar.addEventListener("pointermove", drag);
      titleBar.addEventListener("pointerup", finish);
      titleBar.addEventListener("pointercancel", finish);
    });
    new ResizeObserver(() => {
      if (!root.hidden) persist();
    }).observe(root);
    globalThis.addEventListener("resize", () => {
      place({
        left: parseFloat(root.style.left),
        top: parseFloat(root.style.top),
        width: parseFloat(root.style.width),
        height: parseFloat(root.style.height),
        open: !root.hidden,
      });
    });
    return window;
  }
  function updateTasks(): void {
    for (const task of taskButtons.querySelectorAll<HTMLButtonElement>(
      "button",
    )) {
      const window = windows.get(task.dataset.windowId ?? "");
      task.hidden = !window || window.root.hidden;
      task.setAttribute(
        "aria-pressed",
        String(
          !!window &&
            !window.root.hidden &&
            !window.root.classList.contains("inactive"),
        ),
      );
    }
  }
  return { surface, taskButtons, create };
}
