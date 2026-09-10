import { element, iconButton } from "./dom";
import folderIcon from "../../browser_shared/assets/folder.svg";
import "./menu.css";

export type MenuEntry =
  | { separator: true }
  | {
      label: string;
      icon?: string;
      action?: () => void;
      children?: readonly MenuEntry[];
      menuClass?: string;
      disabledReason?: string;
    };

export interface MenuPoint {
  x: number;
  y: number;
}

export function createMenu(host: HTMLElement) {
  const panels: HTMLElement[] = [];
  let returnFocus: HTMLElement | SVGElement | null = null;
  let trigger: HTMLElement | null = null;

  function trim(depth: number): void {
    for (const panel of panels.splice(depth)) panel.remove();
    for (const [index, panel] of panels.entries())
      for (const node of panel.querySelectorAll<HTMLElement>("[aria-haspopup]"))
        node.setAttribute(
          "aria-expanded",
          String(panels[index + 1]?.dataset.parent === node.dataset.menuLabel),
        );
  }

  function close(restoreFocus = false): void {
    trim(0);
    trigger?.setAttribute("aria-expanded", "false");
    if (restoreFocus && returnFocus?.isConnected)
      returnFocus.focus({ preventScroll: true });
    trigger = null;
    returnFocus = null;
  }

  function panel(
    entries: readonly MenuEntry[],
    point: MenuPoint,
    label: string,
    depth: number,
    parent?: HTMLButtonElement,
    className = "",
  ): HTMLElement {
    trim(depth);
    parent?.setAttribute("aria-expanded", "true");
    const root = element("div", `desktop-menu ${className}`);
    root.setAttribute("role", "menu");
    root.setAttribute("aria-label", label);
    root.tabIndex = -1;
    panels.push(root);
    for (const entry of entries) {
      if ("separator" in entry) {
        const line = element("hr");
        line.setAttribute("role", "separator");
        root.append(line);
        continue;
      }
      const node = iconButton(entry.label, entry.icon ?? folderIcon, () => {
        if (entry.disabledReason) return;
        if (entry.children) openChild();
        else {
          close(true);
          entry.action?.();
        }
      });
      node.setAttribute("role", "menuitem");
      node.dataset.menuLabel = entry.label;
      node.tabIndex = -1;
      node.setAttribute("aria-disabled", String(!!entry.disabledReason));
      if (entry.disabledReason) node.title = entry.disabledReason;
      const openChild = (focusChild = true) => {
        if (!entry.children || entry.disabledReason) return;
        const rect = node.getBoundingClientRect();
        const child = panel(
          entry.children,
          { x: rect.right - 2, y: rect.top - 2 },
          entry.label,
          depth + 1,
          node,
          entry.menuClass,
        );
        const childRect = child.getBoundingClientRect();
        if (rect.right + childRect.width > innerWidth)
          child.style.left = `${Math.max(3, rect.left - childRect.width + 2)}px`;
        if (focusChild)
          child.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
      };
      if (entry.children) {
        node.setAttribute("aria-haspopup", "menu");
        node.setAttribute("aria-expanded", "false");
        const arrow = element("span", "submenu-arrow", "\u25b6");
        arrow.setAttribute("aria-hidden", "true");
        node.append(arrow);
      }
      node.addEventListener("pointerenter", () => {
        if (panels[depth + 1]?.dataset.parent !== entry.label) {
          trim(depth + 1);
          if (entry.children) openChild(false);
        }
        node.focus({ preventScroll: true });
      });
      node.onkeydown = (event) => {
        if (event.key === "ArrowRight" && entry.children) {
          event.preventDefault();
          openChild();
        }
      };
      root.append(node);
    }
    root.addEventListener("keydown", (event) => {
      const choices = [
        ...root.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      ];
      const active = document.activeElement;
      const index =
        active instanceof HTMLElement ? choices.indexOf(active) : -1;
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? choices.length - 1
              : (index +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  choices.length) %
                choices.length;
        choices[next]?.focus();
      } else if (event.key === "Escape" || event.key === "ArrowLeft") {
        event.preventDefault();
        if (parent) {
          trim(depth);
          parent.focus();
        } else close(true);
      } else if (event.key === "Tab") close();
    });
    if (parent) root.dataset.parent = label;
    host.append(root);
    const rect = root.getBoundingClientRect();
    root.style.left = `${Math.max(3, Math.min(point.x, innerWidth - rect.width - 3))}px`;
    root.style.top = `${Math.max(3, Math.min(point.y, innerHeight - rect.height - 40))}px`;
    return root;
  }

  const outside = (event: PointerEvent) => {
    const target = event.target;
    if (
      target instanceof Node &&
      !panels.some((entry) => entry.contains(target)) &&
      !trigger?.contains(target)
    )
      close();
  };
  const resized = () => close();
  document.addEventListener("pointerdown", outside);
  window.addEventListener("resize", resized);

  return {
    close,
    dispose(): void {
      close();
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", resized);
    },
    get open() {
      return panels.length > 0;
    },
    show(
      entries: readonly MenuEntry[],
      point: MenuPoint,
      label: string,
      owner?: HTMLElement | SVGElement,
      className = "",
    ): void {
      close();
      returnFocus =
        owner ??
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null);
      trigger = owner instanceof HTMLElement ? owner : null;
      trigger?.setAttribute("aria-expanded", "true");
      const root = panel(entries, point, label, 0, undefined, className);
      root.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    },
  };
}
