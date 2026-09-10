export interface ManagedWindowOptions {
  readonly id: string;
  readonly title: string;
  readonly iconUrl: string;
  readonly defaultRect: WindowRect;
  readonly defaultOpen: boolean;
  readonly minimumWidth: number;
  readonly minimumHeight: number;
}

export interface ManagedWindowSnapshot {
  readonly id: string;
  readonly title: string;
  readonly iconUrl: string;
  readonly open: boolean;
  readonly active: boolean;
}

interface WindowRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface StoredWindowState extends WindowRect {
  readonly open: boolean;
  readonly zIndex: number;
}

interface ManagedWindow {
  readonly element: HTMLElement;
  readonly options: ManagedWindowOptions;
}

const STORAGE_KEY = "scp-site-manager.window-layout.v2";

function loadLayout(): Record<string, StoredWindowState> {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value
      ? (JSON.parse(value) as Record<string, StoredWindowState>)
      : {};
  } catch {
    return {};
  }
}

function clampRect(
  rect: WindowRect,
  options: ManagedWindowOptions,
  desktop: HTMLElement,
): WindowRect {
  const desktopWidth = desktop.clientWidth;
  const desktopHeight = desktop.clientHeight;
  const width = Math.max(
    options.minimumWidth,
    Math.min(rect.width, desktopWidth),
  );
  const height = Math.max(
    options.minimumHeight,
    Math.min(rect.height, desktopHeight),
  );

  return {
    left: Math.max(0, Math.min(rect.left, desktopWidth - 80)),
    top: Math.max(0, Math.min(rect.top, desktopHeight - 32)),
    width,
    height,
  };
}

function readRect(element: HTMLElement): WindowRect {
  if (!element.hidden && element.offsetWidth > 0 && element.offsetHeight > 0) {
    return {
      left: element.offsetLeft,
      top: element.offsetTop,
      width: element.offsetWidth,
      height: element.offsetHeight,
    };
  }

  const styleRect = {
    left: Number.parseFloat(element.style.left),
    top: Number.parseFloat(element.style.top),
    width: Number.parseFloat(element.style.width),
    height: Number.parseFloat(element.style.height),
  };

  return {
    left: Number.isFinite(styleRect.left) ? styleRect.left : element.offsetLeft,
    top: Number.isFinite(styleRect.top) ? styleRect.top : element.offsetTop,
    width: styleRect.width,
    height: styleRect.height,
  };
}

export function synchronizeLauncherIcons(
  launchers: Iterable<HTMLElement>,
  windowId: string,
  iconUrl: string,
): void {
  for (const launcher of launchers) {
    if (launcher.dataset.openWindow !== windowId) continue;
    const icon = launcher.querySelector<HTMLImageElement>("[data-window-icon]");
    if (icon) icon.src = iconUrl;
  }
}

export function bindWindowShortcuts(
  shortcuts: Iterable<HTMLButtonElement>,
  open: (windowId: string) => void,
): void {
  for (const shortcut of shortcuts) {
    const activate = () => {
      const windowId = shortcut.dataset.openWindow;
      if (windowId) open(windowId);
    };
    const desktop = shortcut.classList.contains("desktop-icon");
    shortcut.addEventListener("click", (event) => {
      if (!desktop || event.detail === 0) activate();
    });
    if (desktop) shortcut.addEventListener("dblclick", activate);
  }
}

export function createWindowManager(desktop: HTMLElement) {
  const windows = new Map<string, ManagedWindow>();
  const listeners = new Set<
    (snapshot: readonly ManagedWindowSnapshot[]) => void
  >();
  const layout = loadLayout();
  let highestZIndex = Math.max(
    10,
    ...Object.values(layout).map(({ zIndex }) => zIndex ?? 0),
  );

  function saveLayout(): void {
    const nextLayout: Record<string, StoredWindowState> = {};
    for (const [id, managedWindow] of windows) {
      nextLayout[id] = {
        ...readRect(managedWindow.element),
        open: !managedWindow.element.hidden,
        zIndex: Number.parseInt(managedWindow.element.style.zIndex, 10) || 10,
      };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLayout));
  }

  function getSnapshot(): readonly ManagedWindowSnapshot[] {
    const visibleWindows = [...windows.values()].filter(
      ({ element }) => !element.hidden,
    );
    const activeWindow = visibleWindows.reduce<ManagedWindow | undefined>(
      (active, candidate) =>
        !active ||
        Number.parseInt(candidate.element.style.zIndex, 10) >
          Number.parseInt(active.element.style.zIndex, 10)
          ? candidate
          : active,
      undefined,
    );

    return [...windows.values()].map((managedWindow) => ({
      id: managedWindow.options.id,
      title: managedWindow.options.title,
      iconUrl: managedWindow.options.iconUrl,
      open: !managedWindow.element.hidden,
      active: managedWindow === activeWindow,
    }));
  }

  function notify(): void {
    const snapshot = getSnapshot();
    for (const listener of listeners) listener(snapshot);
  }

  function refreshFocusStyles(): void {
    const visibleWindows = [...windows.values()].filter(
      ({ element }) => !element.hidden,
    );
    const activeWindow = visibleWindows.sort(
      (first, second) =>
        Number.parseInt(second.element.style.zIndex, 10) -
        Number.parseInt(first.element.style.zIndex, 10),
    )[0];

    for (const candidate of windows.values()) {
      candidate.element.classList.toggle(
        "inactive",
        candidate !== activeWindow,
      );
    }
  }

  function focusWindow(managedWindow: ManagedWindow): void {
    highestZIndex += 1;
    managedWindow.element.style.zIndex = String(highestZIndex);
    refreshFocusStyles();
    saveLayout();
    notify();
  }

  function applyRect(managedWindow: ManagedWindow, rect: WindowRect): void {
    const clamped = clampRect(rect, managedWindow.options, desktop);
    managedWindow.element.style.left = `${clamped.left}px`;
    managedWindow.element.style.top = `${clamped.top}px`;
    managedWindow.element.style.width = `${clamped.width}px`;
    managedWindow.element.style.height = `${clamped.height}px`;
  }

  function open(id: string): void {
    const managedWindow = windows.get(id);
    if (!managedWindow) throw new Error(`Unknown window: ${id}`);
    managedWindow.element.hidden = false;
    focusWindow(managedWindow);
    saveLayout();
  }

  function close(id: string): void {
    const managedWindow = windows.get(id);
    if (!managedWindow) throw new Error(`Unknown window: ${id}`);
    managedWindow.element.hidden = true;
    refreshFocusStyles();
    saveLayout();
    notify();
  }

  function register(element: HTMLElement, options: ManagedWindowOptions): void {
    const managedWindow = { element, options };
    windows.set(options.id, managedWindow);

    const storedState = layout[options.id];
    applyRect(managedWindow, storedState ?? options.defaultRect);
    element.hidden = !(storedState?.open ?? options.defaultOpen);
    element.style.zIndex = String(storedState?.zIndex ?? ++highestZIndex);
    refreshFocusStyles();

    const titleBarElement = element.querySelector<HTMLElement>(".title-bar");
    if (!titleBarElement)
      throw new Error(`Window ${options.id} has no title bar`);
    const titleBar = titleBarElement;
    const titleText = titleBar.querySelector<HTMLElement>(".title-bar-text");
    if (titleText) {
      titleText.classList.add("window-title-with-icon");
      titleText.style.backgroundImage = `url("${options.iconUrl}")`;
    }
    synchronizeLauncherIcons(
      desktop.querySelectorAll<HTMLElement>("[data-open-window]"),
      options.id,
      options.iconUrl,
    );

    titleBar.addEventListener("pointerdown", (event) => {
      if ((event.target as Element).closest("button")) return;
      titleBar.setPointerCapture(event.pointerId);
      const start = {
        x: event.clientX,
        y: event.clientY,
        ...readRect(element),
      };

      function drag(moveEvent: PointerEvent): void {
        const left = start.left + moveEvent.clientX - start.x;
        const top = start.top + moveEvent.clientY - start.y;
        element.style.left = `${Math.max(0, Math.min(left, desktop.clientWidth - 80))}px`;
        element.style.top = `${Math.max(0, Math.min(top, desktop.clientHeight - 32))}px`;
      }

      function finish(): void {
        titleBar.removeEventListener("pointermove", drag);
        titleBar.removeEventListener("pointerup", finish);
        titleBar.removeEventListener("pointercancel", finish);
        saveLayout();
      }

      titleBar.addEventListener("pointermove", drag);
      titleBar.addEventListener("pointerup", finish);
      titleBar.addEventListener("pointercancel", finish);
    });

    element.addEventListener("pointerdown", () => focusWindow(managedWindow));
    element
      .querySelector<HTMLElement>("[data-window-close]")
      ?.addEventListener("click", () => {
        close(options.id);
      });

    const resizeObserver = new ResizeObserver(() => saveLayout());
    resizeObserver.observe(element);
    notify();
  }

  function subscribe(
    listener: (snapshot: readonly ManagedWindowSnapshot[]) => void,
  ): () => void {
    listeners.add(listener);
    listener(getSnapshot());
    return () => listeners.delete(listener);
  }

  window.addEventListener("resize", () => {
    for (const managedWindow of windows.values()) {
      applyRect(managedWindow, readRect(managedWindow.element));
    }
    saveLayout();
  });

  return { register, open, close, subscribe };
}
