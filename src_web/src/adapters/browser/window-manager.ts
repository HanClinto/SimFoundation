export interface ManagedWindowOptions {
  readonly id: string;
  readonly defaultRect: WindowRect;
  readonly defaultOpen: boolean;
  readonly minimumWidth: number;
  readonly minimumHeight: number;
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
  const styleRect = {
    left: Number.parseFloat(element.style.left),
    top: Number.parseFloat(element.style.top),
    width: Number.parseFloat(element.style.width),
    height: Number.parseFloat(element.style.height),
  };

  return {
    left: Number.isFinite(styleRect.left) ? styleRect.left : element.offsetLeft,
    top: Number.isFinite(styleRect.top) ? styleRect.top : element.offsetTop,
    width: Number.isFinite(styleRect.width)
      ? styleRect.width
      : element.offsetWidth,
    height: Number.isFinite(styleRect.height)
      ? styleRect.height
      : element.offsetHeight,
  };
}

export function createWindowManager(desktop: HTMLElement) {
  const windows = new Map<string, ManagedWindow>();
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

    titleBar.addEventListener("pointerdown", (event) => {
      if ((event.target as Element).closest("button")) return;
      titleBar.setPointerCapture(event.pointerId);
      const start = {
        x: event.clientX,
        y: event.clientY,
        ...readRect(element),
      };

      function drag(moveEvent: PointerEvent): void {
        applyRect(managedWindow, {
          left: start.left + moveEvent.clientX - start.x,
          top: start.top + moveEvent.clientY - start.y,
          width: start.width,
          height: start.height,
        });
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
  }

  window.addEventListener("resize", () => {
    for (const managedWindow of windows.values()) {
      applyRect(managedWindow, readRect(managedWindow.element));
    }
    saveLayout();
  });

  return { register, open, close };
}
