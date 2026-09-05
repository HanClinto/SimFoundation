import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import type { TilePosition } from "../../simulation/world";
import { observedSnapshot } from "./observed-view";
import { mapObjects } from "./map-objects";
import { layoutPawnBubbles, bubbleAt, type PawnBubble } from "./pawn-bubbles";
import { pawnCues } from "./pawn-cues";
import {
  renderSite,
  projectPosition,
  unprojectPosition,
  type MapCamera,
} from "./renderer";
import { createPlacementSession, type PlacementRequest } from "./placement";
import {
  DEFAULT_MAP_OVERLAYS,
  type MapOverlay,
  type MapPerspective,
} from "./map-settings";

export function createSiteMap(
  canvas: HTMLCanvasElement,
  element: HTMLElement,
  controller: GameController,
  openRecord: (id: string, perspective: MapPerspective) => void,
) {
  let current = controller.getSnapshot();
  let placement: ReturnType<typeof createPlacementSession> | null = null;
  const fitZoom = () =>
    Math.max(
      0.3,
      Math.min(0.7, canvas.clientWidth / 1280, canvas.clientHeight / 680),
    );
  let camera: MapCamera = {
    center: { x: 62.5, y: 62.5 },
    zoom: fitZoom(),
    selectedId: null,
    perspective: "world",
    base: "site",
    surfaceLayer: "structure",
    overlays: { ...DEFAULT_MAP_OVERLAYS },
  };
  const entitySelect = element.querySelector<HTMLSelectElement>(
    "[data-camera-entity]",
  )!;
  const status = element.querySelector<HTMLElement>("[data-camera-status]")!;
  const zoomLabel =
    element.querySelector<HTMLOutputElement>("[data-camera-zoom]")!;
  const inspect = element.querySelector<HTMLButtonElement>(
    '[data-camera-action="inspect"]',
  )!;
  const placementBar = element.querySelector<HTMLElement>(
    "[data-placement-bar]",
  )!;
  const feedback = element.querySelector<HTMLElement>(
    "[data-placement-feedback]",
  )!;
  const confirm = element.querySelector<HTMLButtonElement>(
    '[data-camera-action="confirm"]',
  )!;
  let objectSignature = "";
  let bubbles: readonly PawnBubble[] = [];
  let hoverPoint: TilePosition | null = null;
  const tooltip = document.createElement("div");
  tooltip.className = "pawn-cue-tooltip";
  tooltip.id = "pawn-cue-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  canvas.parentElement!.append(tooltip);
  function updateTooltip() {
    const bubble =
      !placement && hoverPoint ? bubbleAt(bubbles, hoverPoint) : undefined;
    tooltip.hidden = !bubble;
    canvas.style.cursor = bubble ? "pointer" : "";
    if (!bubble || !hoverPoint) {
      canvas.removeAttribute("aria-describedby");
      return;
    }
    tooltip.textContent = bubble.title;
    canvas.setAttribute("aria-describedby", tooltip.id);
    tooltip.style.maxWidth = `${Math.max(100, Math.min(280, canvas.clientWidth - 12))}px`;
    tooltip.style.left = `${canvas.offsetLeft + Math.max(4, Math.min(canvas.clientWidth - tooltip.offsetWidth - 4, hoverPoint.x + 12))}px`;
    tooltip.style.top = `${canvas.offsetTop + Math.max(4, Math.min(canvas.clientHeight - tooltip.offsetHeight - 4, hoverPoint.y + 16))}px`;
  }
  const displayed = () =>
    camera.perspective === "recorded" ? observedSnapshot(current) : current;

  function render(snapshot: ControllerSnapshot) {
    current = snapshot;
    const preview = placement?.preview(current);
    camera = {
      ...camera,
      draft: preview ? { tiles: preview.tiles, valid: preview.valid } : null,
    };
    placementBar.hidden = placement === null;
    confirm.disabled = !preview?.valid;
    element.querySelector("[data-placement-label]")!.textContent =
      placement?.request.label ?? "";
    if (preview) feedback.textContent = preview.issue ?? "";
    const materialLegend = element.querySelector<HTMLElement>(
      "[data-material-legend]",
    );
    const conditionLegend = element.querySelector<HTMLElement>(
      "[data-condition-legend]",
    );
    if (materialLegend) materialLegend.hidden = camera.base !== "materials";
    if (conditionLegend) conditionLegend.hidden = !camera.overlays?.condition;
    const objects = mapObjects(displayed().game, camera.perspective);
    const signature = JSON.stringify(objects.map(({ id, name }) => [id, name]));
    if (signature !== objectSignature) {
      entitySelect.replaceChildren(
        new Option("Select object", ""),
        ...objects.map((object) => new Option(object.name, object.id)),
      );
      objectSignature = signature;
    }
    entitySelect.value = camera.selectedId ?? "";
    const selected = objects.find((object) => object.id === camera.selectedId);
    const selectedCues = selected
      ? pawnCues(displayed().game, selected.id, camera.perspective ?? "world")
      : [];
    status.textContent = camera.selectedId?.startsWith("tile:")
      ? `Tile ${camera.selectedId.slice(5).replace(":", " / ")}`
      : selected
        ? `${selected.name}${selectedCues.length ? ` / ${selectedCues.map((cue) => cue.label).join(" / ")}` : ""}`
        : "No selection";
    const perspectiveLabel = element.querySelector(
      "[data-camera-perspective-label]",
    );
    if (perspectiveLabel)
      perspectiveLabel.textContent =
        camera.perspective === "world" ? "SIMULATION" : "RECORDED";
    zoomLabel.value = `${Math.round(camera.zoom * 100)}%`;
    inspect.disabled = camera.selectedId === null;
    renderSite(canvas, current, camera);
    bubbles =
      camera.overlays?.objects && camera.overlays.activity
        ? layoutPawnBubbles(
            displayed().game,
            camera.perspective ?? "world",
            camera.zoom,
            canvas.clientWidth,
            canvas.clientHeight,
            (position) =>
              projectPosition(
                position,
                camera,
                canvas.clientWidth,
                canvas.clientHeight,
              ),
            camera.selectedId,
          )
        : [];
    updateTooltip();
  }
  function focus(position: TilePosition) {
    camera = {
      ...camera,
      center: {
        x: Math.max(0, Math.min(current.game.world.map.width - 1, position.x)),
        y: Math.max(0, Math.min(current.game.world.map.height - 1, position.y)),
      },
    };
    render(current);
  }
  function zoom(
    multiplier: number,
    point = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 },
  ) {
    const before = unprojectPosition(
      point,
      camera,
      canvas.clientWidth,
      canvas.clientHeight,
    );
    camera = {
      ...camera,
      zoom: Math.max(0.3, Math.min(2.5, camera.zoom * multiplier)),
    };
    const after = unprojectPosition(
      point,
      camera,
      canvas.clientWidth,
      canvas.clientHeight,
    );
    focus({
      x: camera.center.x + before.x - after.x,
      y: camera.center.y + before.y - after.y,
    });
  }
  function cancelPlacement() {
    placement = null;
    feedback.textContent = "";
    render(current);
  }
  function confirmPlacement() {
    if (!placement) return;
    const result = placement.confirm(current);
    if (result.accepted) placement = null;
    render(result.snapshot);
    feedback.textContent = result.message;
    status.textContent = result.message;
  }
  element.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement;
    if (target.dataset.mapBase)
      camera = {
        ...camera,
        base: target.dataset.mapBase === "materials" ? "materials" : "site",
      };
    if (target.dataset.mapPerspective)
      camera = {
        ...camera,
        perspective:
          target.dataset.mapPerspective === "recorded" ? "recorded" : "world",
        selectedId: null,
      };
    if (target.dataset.mapLayer) {
      const layer = target.dataset.mapLayer === "floor" ? "floor" : "structure";
      camera = {
        ...camera,
        surfaceLayer: layer,
        selectedId: camera.selectedId?.startsWith("tile:")
          ? `${camera.selectedId.split(":").slice(0, 2).join(":")}:${layer}`
          : camera.selectedId,
      };
    }
    if (target.dataset.mapOverlay)
      camera = {
        ...camera,
        overlays: {
          ...DEFAULT_MAP_OVERLAYS,
          ...camera.overlays,
          [target.dataset.mapOverlay as MapOverlay]: target.checked,
        },
        selectedId:
          target.dataset.mapOverlay === "objects" &&
          !target.checked &&
          !camera.selectedId?.startsWith("tile:")
            ? null
            : camera.selectedId,
      };
    render(current);
  });
  entitySelect.addEventListener("change", () => {
    camera = { ...camera, selectedId: entitySelect.value || null };
    const object = mapObjects(displayed().game, camera.perspective).find(
      (object) => object.id === camera.selectedId,
    );
    if (object) focus(object.position);
    else render(current);
  });
  element.addEventListener("click", (event) => {
    const action = (event.target as Element).closest<HTMLElement>(
      "[data-camera-action]",
    )?.dataset.cameraAction;
    if (action === "in") zoom(1.25);
    if (action === "out") zoom(0.8);
    if (action === "home") {
      camera = { ...camera, zoom: fitZoom() };
      focus({ x: 62.5, y: 62.5 });
    }
    if (action === "inspect" && camera.selectedId)
      openRecord(camera.selectedId, camera.perspective ?? "world");
    if (action === "confirm") confirmPlacement();
    if (action === "cancel") cancelPlacement();
  });
  const localPoint = (event: MouseEvent) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  const tileAtPoint = (point: TilePosition) => {
    const position = unprojectPosition(
      point,
      camera,
      canvas.clientWidth,
      canvas.clientHeight,
    );
    return { x: Math.round(position.x), y: Math.round(position.y) };
  };
  function selectionAt(point: TilePosition) {
    const bubble = bubbleAt(bubbles, point);
    if (bubble) return bubble.personId;
    const position = tileAtPoint(point);
    if (
      position.x < 0 ||
      position.y < 0 ||
      position.x >= current.game.world.map.width ||
      position.y >= current.game.world.map.height
    )
      return null;
    const object = camera.overlays?.objects
      ? mapObjects(displayed().game, camera.perspective)
          .map((object) => {
            const projected = projectPosition(
              object.position,
              camera,
              canvas.clientWidth,
              canvas.clientHeight,
            );
            return {
              id: object.id,
              distance: Math.hypot(
                projected.x - point.x,
                projected.y - 12 * camera.zoom - point.y,
              ),
            };
          })
          .filter((object) => object.distance < Math.max(14, 18 * camera.zoom))
          .sort(
            (first, second) =>
              first.distance - second.distance ||
              first.id.localeCompare(second.id),
          )[0]
      : null;
    return (
      object?.id ??
      `tile:${position.x},${position.y}:${camera.surfaceLayer ?? "structure"}`
    );
  }
  let drag: {
    start: TilePosition;
    center: TilePosition;
    moved: boolean;
  } | null = null;
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    hoverPoint = null;
    updateTooltip();
    canvas.focus();
    drag = { start: localPoint(event), center: camera.center, moved: false };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    const point = localPoint(event);
    if (!drag) {
      if (placement) {
        placement.move(tileAtPoint(point));
        render(current);
      } else {
        hoverPoint = point;
        updateTooltip();
      }
      return;
    }
    const deltaX = point.x - drag.start.x;
    const deltaY = point.y - drag.start.y;
    if (Math.hypot(deltaX, deltaY) > 4) drag.moved = true;
    if (drag.moved)
      focus({
        x:
          drag.center.x -
          deltaX / (40 * camera.zoom) -
          deltaY / (20 * camera.zoom),
        y:
          drag.center.y +
          deltaX / (40 * camera.zoom) -
          deltaY / (20 * camera.zoom),
      });
  });
  canvas.addEventListener("pointerup", (event) => {
    if (drag && !drag.moved) {
      if (placement) placement.move(tileAtPoint(localPoint(event)), true);
      else camera = { ...camera, selectedId: selectionAt(localPoint(event)) };
      render(current);
    }
    drag = null;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointercancel", () => {
    drag = null;
    hoverPoint = null;
    updateTooltip();
  });
  canvas.addEventListener("pointerleave", () => {
    hoverPoint = null;
    updateTooltip();
  });
  canvas.addEventListener("dblclick", (event) => {
    if (placement) return;
    camera = { ...camera, selectedId: selectionAt(localPoint(event)) };
    render(current);
    if (camera.selectedId)
      openRecord(camera.selectedId, camera.perspective ?? "world");
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoom(event.deltaY < 0 ? 1.1 : 1 / 1.1, localPoint(event));
    },
    { passive: false },
  );
  canvas.addEventListener("keydown", (event) => {
    const deltas: Record<string, TilePosition> = {
      ArrowLeft: { x: -1, y: 1 },
      ArrowRight: { x: 1, y: -1 },
      ArrowUp: { x: -1, y: -1 },
      ArrowDown: { x: 1, y: 1 },
    };
    const delta = deltas[event.key];
    if (delta) {
      event.preventDefault();
      if (placement) {
        placement.move(
          { x: placement.origin.x + delta.x, y: placement.origin.y + delta.y },
          true,
        );
        render(current);
      } else
        focus({
          x: camera.center.x + delta.x * 2,
          y: camera.center.y + delta.y * 2,
        });
    }
    if (event.key === "Escape") cancelPlacement();
    if (event.key === "Enter") {
      event.preventDefault();
      if (placement) confirmPlacement();
      else if (camera.selectedId)
        openRecord(camera.selectedId, camera.perspective ?? "world");
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoom(1.25);
    }
    if (event.key === "-") {
      event.preventDefault();
      zoom(0.8);
    }
    if (event.key === "Home") {
      event.preventDefault();
      camera = { ...camera, zoom: fitZoom() };
      focus({ x: 62.5, y: 62.5 });
    }
  });
  canvas.addEventListener("assets-ready", () => render(current));
  new ResizeObserver(() => render(current)).observe(canvas);
  render(current);
  return {
    render,
    focus,
    beginPlacement(request: PlacementRequest) {
      placement = createPlacementSession(request);
      focus(request.origin);
    },
  };
}
