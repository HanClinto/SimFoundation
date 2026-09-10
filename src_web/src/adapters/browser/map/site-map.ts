import type { Entity, Position } from "../../../simulation/core/entity/Entity";
import type { Site } from "../../../simulation/core/site/Site";
import { tileAt } from "../../../simulation/core/site/TileMap";
import { carriedCargo } from "../../../simulation/core/entity/Equipment";
import { entityArt, entitySymbol } from "./art";
import { button, element } from "../desktop/dom";

const NS = "http://www.w3.org/2000/svg";
function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes))
    node.setAttribute(key, value);
  return node;
}

export function createSiteMap(
  inspect: (entityId: string) => void,
  chooseTile: (position: Position) => void,
) {
  const root = element("div", "site-map");
  const toolbar = element("div", "map-toolbar");
  const viewport = element("div", "map-viewport");
  viewport.tabIndex = 0;
  viewport.setAttribute(
    "aria-label",
    "Isometric site map. Select an entity or a floor tile; inspection never orders work.",
  );
  const drawing = svg("svg", {
    role: "group",
    "aria-label": "Site entities and floor",
  });
  viewport.append(drawing);
  let zoom = 1;
  let floorMode = false;
  const floorButton = button("Choose floor destination", () => {
    floorMode = !floorMode;
    floorButton.setAttribute("aria-pressed", String(floorMode));
    drawing.classList.toggle("floor-targeting", floorMode);
  });
  floorButton.title =
    "Temporarily select the floor beneath objects. Selecting a destination does not issue an order.";
  let size = { width: 800, height: 500 };
  const zoomLabel = element("span");
  function resize(): void {
    drawing.style.width = `${size.width * zoom}px`;
    drawing.style.height = `${size.height * zoom}px`;
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }
  toolbar.append(
    floorButton,
    button(
      "-",
      () => {
        zoom = Math.max(0.4, zoom - 0.2);
        resize();
      },
      "Zoom out",
    ),
    zoomLabel,
    button(
      "+",
      () => {
        zoom = Math.min(2, zoom + 0.2);
        resize();
      },
      "Zoom in",
    ),
    button("Fit map", () => {
      zoom = Math.min(
        viewport.clientWidth / size.width,
        viewport.clientHeight / size.height,
      );
      resize();
    }),
    element(
      "span",
      "map-legend",
      "Person / resident | Facility | Cargo | Click to inspect",
    ),
  );
  root.append(toolbar, viewport);
  let previousSite = "";
  function render(
    site: Site,
    subjectId: string | null,
    targetId: string | null,
    selectedTile: Position | null,
  ): void {
    const rows = site.terrain.length;
    const columns = site.terrain[0]?.length ?? 0;
    const ox = rows * 24 + 28;
    size = {
      width: (rows + columns) * 24 + 56,
      height: (rows + columns) * 12 + 92,
    };
    drawing.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
    const project = (x: number, y: number) => ({
      x: ox + (x - y) * 24,
      y: 56 + (x + y) * 12,
    });
    const nodes: SVGElement[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const p = project(x, y);
        const wall = tileAt(site, { x, y })?.blocksMovement;
        const selected = selectedTile?.x === x && selectedTile.y === y;
        const tile = svg("polygon", {
          points: `${p.x},${p.y - 12} ${p.x + 24},${p.y} ${p.x},${p.y + 12} ${p.x - 24},${p.y}`,
          fill: selected
            ? "#fff1a0"
            : wall
              ? "#647779"
              : (x + y) % 2
                ? "#bdc6bd"
                : "#c8cec4",
          stroke: selected ? "#785600" : "#98a69e",
          "stroke-width": selected ? "2" : "0.6",
          "data-tile": `${x},${y}`,
        });
        if (!wall)
          tile.addEventListener("click", () => {
            floorMode = false;
            floorButton.setAttribute("aria-pressed", "false");
            drawing.classList.remove("floor-targeting");
            chooseTile({ x, y });
          });
        nodes.push(tile);
      }
    }
    const entities = Object.values(site.entities)
      .filter((entity) => entity.location.kind === "ground")
      .sort((a, b) => {
        if (a.location.kind !== "ground" || b.location.kind !== "ground")
          return 0;
        return (
          a.location.position.x +
            a.location.position.y -
            (b.location.position.x + b.location.position.y) ||
          Number(a.kind === "pawn") - Number(b.kind === "pawn")
        );
      });
    for (const entity of entities) {
      if (entity.location.kind !== "ground") continue;
      const position = entity.location.position;
      const p = project(position.x, position.y);
      const group = svg("g", {
        transform: `translate(${p.x} ${p.y})`,
        role: "button",
        tabindex: "0",
        "aria-label": `Inspect ${entity.name}`,
        "data-entity-id": entity.id,
        class: `map-entity ${entity.id === subjectId ? "subject" : ""} ${entity.id === targetId ? "target" : ""}`,
      });
      group.append(
        svg("ellipse", {
          cx: "0",
          cy: "0",
          rx: "15",
          ry: "7",
          fill: "#445c54",
          opacity: ".35",
        }),
      );
      if (entity.id === subjectId || entity.id === targetId) {
        group.append(
          svg("ellipse", {
            cx: "0",
            cy: "0",
            rx: "20",
            ry: "10",
            fill: "none",
            stroke: entity.id === subjectId ? "#0039a6" : "#9b6100",
            "stroke-width": "3",
          }),
        );
      }
      const art = entityArt(entity);
      if (art)
        group.append(
          svg("image", {
            href: art,
            x: "-17",
            y: "-34",
            width: "34",
            height: "36",
          }),
        );
      if (entity.kind === "pawn") {
        const cargo = carriedCargo(site.entities, entity.id)[0];
        const cargoArt = cargo ? entityArt(cargo) : null;
        if (cargoArt)
          group.append(
            svg("image", {
              href: cargoArt,
              x: "6",
              y: "-22",
              width: "20",
              height: "23",
            }),
          );
      }
      const label = svg("text", {
        x: "0",
        y: "-43",
        "text-anchor": "middle",
        class: "map-name",
      });
      label.textContent =
        entity.kind === "pawn" || entity.id === targetId
          ? entity.name
          : entity.kind === "door"
            ? entitySymbol(entity)
            : "";
      group.append(label);
      const title = svg("title", {});
      title.textContent = describeEntity(entity);
      group.append(title);
      group.addEventListener("click", () => inspect(entity.id));
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inspect(entity.id);
        }
      });
      nodes.push(group);
    }
    const focused =
      document.activeElement instanceof SVGElement
        ? document.activeElement.getAttribute("data-entity-id")
        : null;
    drawing.replaceChildren(...nodes);
    if (focused)
      [...drawing.querySelectorAll<SVGElement>("[data-entity-id]")]
        .find((node) => node.dataset.entityId === focused)
        ?.focus();
    if (previousSite !== site.id) {
      previousSite = site.id;
      zoom = Math.min(1, Math.max(0.4, viewport.clientWidth / size.width));
    }
    resize();
  }
  return { root, render };
}

export function describeEntity(entity: Entity): string {
  if (entity.kind === "pawn")
    return `${entity.name}: ${entity.health?.death ? "dead" : !entity.canAct ? "incapacitated" : (entity.queue[0]?.action.kind ?? "idle")}`;
  if (entity.kind === "door")
    return `${entity.name}: ${entity.open ? "open" : "closed"}, ${entity.policy}`;
  return `${entity.name} (${entity.kind})${entity.integrity === undefined ? "" : `; integrity ${entity.integrity}`}`;
}
