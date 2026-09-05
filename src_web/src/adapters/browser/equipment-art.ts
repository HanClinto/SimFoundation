import atlasSource from "./assets/equipment-atlas.svg?raw";
import type { PersonnelItem } from "../../simulation/personnel";

const illustrations = new Map<string, string>();

export function equipmentIllustration(
  item: PersonnelItem | null,
): string | null {
  if (!item) return null;
  const id = item.id;
  const kind = /helmet|hardhat/.test(id)
    ? "headgear"
    : /coat|coveralls|scrubs|vest|jacket/.test(id)
      ? "clothing"
      : /tablet|scanner|multimeter|radio|dosimeter/.test(id)
        ? "device"
        : /medkit|sedative/.test(id)
          ? "medical"
          : /notebook|manifest/.test(id)
            ? "document"
            : /coffee|snack/.test(id)
              ? "food"
              : /mop|baton/.test(id)
                ? "tool"
                : "utility";
  const cached = illustrations.get(kind);
  if (cached) return cached;
  const document = new DOMParser().parseFromString(
    atlasSource,
    "image/svg+xml",
  );
  const view = document.getElementById(kind);
  if (!view) throw new Error(`Missing equipment illustration: ${kind}`);
  document.documentElement.setAttribute(
    "viewBox",
    view.getAttribute("viewBox")!,
  );
  document.documentElement.setAttribute("width", "80");
  document.documentElement.setAttribute("height", "80");
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(document))}`;
  illustrations.set(kind, url);
  return url;
}
