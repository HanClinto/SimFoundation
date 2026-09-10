import { button, element } from "./dom";
import folderIcon from "../../browser_shared/assets/folder.svg";

const LAYOUT_KEY = "simfoundation.web.desktop.v1";

interface Layout {
  left: number;
  top: number;
  width: number;
  height: number;
  open: boolean;
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
      };
    }
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch (error) {
      report(`Could not save desktop preferences: ${String(error)}`);
    }
  }

  function create(id: string, title: string, defaults: Layout): DesktopWindow {
    const root = element("section", "window desktop-window");
    root.setAttribute("aria-label", title);
    const titleBar = element("div", "title-bar");
    const controls = element("div", "title-bar-controls");
    const close = button("X", () => {
      root.hidden = true;
      const remaining = [...windows.values()]
        .filter((entry) => !entry.root.hidden)
        .sort(
          (a, b) => Number(b.root.style.zIndex) - Number(a.root.style.zIndex),
        )[0];
      if (remaining) remaining.root.classList.remove("inactive");
      persist();
    });
    close.setAttribute("aria-label", `Close ${title}`);
    controls.append(close);
    const titleText = element("div", "title-bar-text", title);
    const icon = element("img");
    icon.src = folderIcon;
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
      root.style.left = `${Math.max(0, Math.min(layout.left, surface.clientWidth - 100))}px`;
      root.style.top = `${Math.max(0, Math.min(layout.top, surface.clientHeight - 40))}px`;
      root.style.width = `${Math.max(360, Math.min(layout.width, surface.clientWidth - 8))}px`;
      root.style.height = `${Math.max(250, Math.min(layout.height, surface.clientHeight - 8))}px`;
    }
    surface.append(root);
    place(rect);
    root.hidden = !rect.open;
    function focus(): void {
      for (const window of windows.values())
        window.root.classList.add("inactive");
      root.classList.remove("inactive");
      root.style.zIndex = String(++zIndex);
    }
    const window: DesktopWindow = {
      root,
      body,
      open: () => {
        root.hidden = false;
        focus();
        persist();
      },
    };
    windows.set(id, window);
    taskButtons.append(button(title, window.open));
    root.addEventListener("pointerdown", focus);
    root.addEventListener("focusin", focus);
    titleBar.addEventListener("pointerdown", (event) => {
      if (event.target instanceof Element && event.target.closest("button"))
        return;
      const start = {
        x: event.clientX,
        y: event.clientY,
        left: root.offsetLeft,
        top: root.offsetTop,
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
        left: root.offsetLeft,
        top: root.offsetTop,
        width: parseFloat(root.style.width),
        height: parseFloat(root.style.height),
        open: !root.hidden,
      });
    });
    return window;
  }
  return { surface, taskButtons, create };
}
