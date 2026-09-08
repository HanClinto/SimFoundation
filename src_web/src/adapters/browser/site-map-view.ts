import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import type { TilePosition } from "../../simulation/world";
import { observedSnapshot } from "./observed-view";
import { mapObjects } from "./map-objects";
import { storageContains } from "../../simulation/storage";
import { layoutPawnBubbles, bubbleAt, type PawnBubble } from "./pawn-bubbles";
import { pawnCues } from "./pawn-cues";
import { createPawnVisuals, type PawnVisual } from "./pawn-visuals";
import { createMapSelection } from "./map-selection";
import { createPawnControl } from "./pawn-control";
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
  moveObject?: (id: string, snapshot: ControllerSnapshot) => void,
) {
  let current = controller.getSnapshot();
  let mapId = current.game.world.map.id;
  let visualTime = 0;
  const updatePawnVisuals = createPawnVisuals();
  let pawnVisuals: Readonly<Record<string, PawnVisual>> = {};
  const reducedMotion = canvas.ownerDocument.defaultView?.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  );
  let placement: ReturnType<typeof createPlacementSession> | null = null;
  const fitZoom = () =>
    Math.max(
      0.3,
      Math.min(0.7, canvas.clientWidth / 1280, canvas.clientHeight / 680),
    );
  let camera: MapCamera = {
    center:
      current.game.world.map.width === 128
        ? { x: 62.5, y: 62.5 }
        : {
            x: current.game.world.map.width / 2,
            y: current.game.world.map.height / 2,
          },
    zoom: current.game.world.map.width === 128 ? fitZoom() : 1,
    selectedId: null,
    perspective: "world",
    base: "site",
    surfaceLayer: "structure",
    overlays: { ...DEFAULT_MAP_OVERLAYS },
  };
  const entitySelect = element.querySelector<HTMLSelectElement>(
    "[data-camera-entity]",
  )!;
  const followControl = element.querySelector<HTMLInputElement>(
    "[data-camera-follow]",
  );
  let following = false;
  let followId: string | null = null;
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
  const selectionHost = element.querySelector<HTMLElement>(
    "[data-map-selection]",
  );
  const selectionPanel = selectionHost
    ? createMapSelection(selectionHost, controller, openRecord, moveObject)
    : null;
  let objectSignature = "";
  const pawnControl = createPawnControl(
    canvas,
    controller,
    (snapshot) => render(snapshot),
    openRecord,
  );
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

  function visualPosition(id: string, fallback: TilePosition): TilePosition {
    if (pawnVisuals[id]) return pawnVisuals[id].position;
    const item = displayed().game.objects.items.find((item) => item.id === id);
    return item?.location.kind === "carried"
      ? (pawnVisuals[item.location.personId]?.position ?? fallback)
      : fallback;
  }

  function drawFrame() {
    pawnVisuals = updatePawnVisuals(
      current.game,
      camera.perspective ?? "world",
      visualTime,
      current.running,
      reducedMotion?.matches ?? false,
    );
    if (following && followId) {
      const selected = mapObjects(displayed().game, camera.perspective).find(
        (object) => object.id === followId,
      );
      if (selected)
        camera = {
          ...camera,
          center: visualPosition(selected.id, selected.position),
        };
    }
    renderSite(
      canvas,
      current,
      { ...camera, activePawnId: pawnControl.activeId },
      reducedMotion?.matches ? 0 : visualTime,
      pawnVisuals,
    );
    bubbles =
      camera.overlays?.objects && camera.overlays.activity
        ? layoutPawnBubbles(
            displayed().game,
            camera.perspective ?? "world",
            camera.zoom,
            canvas.clientWidth,
            canvas.clientHeight,
            (position, id) =>
              projectPosition(
                visualPosition(id, position),
                camera,
                canvas.clientWidth,
                canvas.clientHeight,
              ),
            camera.selectedId,
          )
        : [];
    updateTooltip();
  }

  function render(snapshot: ControllerSnapshot) {
    if (snapshot.game.world.map.id !== mapId) {
      mapId = snapshot.game.world.map.id;
      placement = null;
      following = false;
      camera = {
        ...camera,
        zoom: snapshot.game.world.map.width === 128 ? fitZoom() : 1,
        center: {
          x: snapshot.game.world.map.width / 2,
          y: snapshot.game.world.map.height / 2,
        },
        selectedId: null,
        draft: null,
      };
    }
    current = snapshot;
    pawnControl.render(snapshot, camera.perspective ?? "world", !!placement);
    selectionPanel?.render(
      snapshot,
      placement ? null : camera.selectedId,
      camera.perspective ?? "world",
    );
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
    const followed = objects.find((object) => object.id === followId);
    if (!followed || placement) following = false;
    if (following && followed)
      camera = { ...camera, center: followed.position };
    if (followControl) {
      followControl.checked = following;
      followControl.disabled = (!selected && !following) || !!placement;
    }
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
    drawFrame();
  }
  function focus(position: TilePosition, preserveFollow = false) {
    if (!preserveFollow) following = false;
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
    focus(
      {
        x: camera.center.x + before.x - after.x,
        y: camera.center.y + before.y - after.y,
      },
      true,
    );
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
    if (target === followControl) {
      following = target.checked;
      followId = following ? camera.selectedId : null;
    }
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
    if (object) focus(object.position, true);
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
      focus(
        current.game.world.map.width === 128
          ? { x: 62.5, y: 62.5 }
          : {
              x: current.game.world.map.width / 2,
              y: current.game.world.map.height / 2,
            },
      );
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
          .filter((object) => !object.id.startsWith("storage:"))
          .filter(
            (object) =>
              camera.overlays?.power ||
              !displayed().game.objects.items.some(
                (item) =>
                  object.id === `object:${item.id}` &&
                  item.kind === "cable" &&
                  item.installed,
              ),
          )
          .map((object) => {
            const projected = projectPosition(
              visualPosition(object.id, object.position),
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
    const storage = camera.overlays?.storage
      ? current.game.storage.areas.find((area) =>
          storageContains(area, position),
        )
      : undefined;
    return (
      object?.id ??
      (storage ? `storage:${storage.id}` : null) ??
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
    pawnControl.close();
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
      else {
        const point = localPoint(event);
        const id = selectionAt(point);
        camera = { ...camera, selectedId: id };
        if (
          id &&
          current.game.personnel.some((person) => person.id === id) &&
          !pawnControl.activeId
        )
          pawnControl.select(id);
        else if (id) pawnControl.ground(tileAtPoint(point), id, point);
      }
      render(current);
    }
    drag = null;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointercancel", () => {
    pawnControl.close();
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
    pawnControl.close();
    camera = { ...camera, selectedId: selectionAt(localPoint(event)) };
    render(current);
    if (camera.selectedId)
      openRecord(camera.selectedId, camera.perspective ?? "world");
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      pawnControl.close();
      zoom(event.deltaY < 0 ? 1.1 : 1 / 1.1, localPoint(event));
    },
    { passive: false },
  );
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && pawnControl.menuOpen) {
      event.preventDefault();
      pawnControl.close();
      return;
    }
    if (
      (event.key === "ContextMenu" ||
        (event.key === "F10" && event.shiftKey)) &&
      !placement
    ) {
      event.preventDefault();
      const point = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
      const position = tileAtPoint(point);
      pawnControl.ground(
        position,
        camera.selectedId ??
          `tile:${position.x},${position.y}:${camera.surfaceLayer ?? "structure"}`,
        point,
        true,
      );
      return;
    }
    const deltas: Record<string, TilePosition> = {
      ArrowLeft: { x: -1, y: 1 },
      ArrowRight: { x: 1, y: -1 },
      ArrowUp: { x: -1, y: -1 },
      ArrowDown: { x: 1, y: 1 },
    };
    const delta = deltas[event.key];
    if (delta) {
      event.preventDefault();
      pawnControl.close();
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
      else if (camera.selectedId?.startsWith("tile:")) {
        const [column, row] = camera.selectedId
          .slice(5)
          .split(":")[0]!
          .split(",")
          .map(Number);
        const position = { x: column!, y: row! };
        pawnControl.ground(
          position,
          camera.selectedId,
          projectPosition(
            position,
            camera,
            canvas.clientWidth,
            canvas.clientHeight,
          ),
          true,
        );
      } else if (camera.selectedId)
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
      focus(
        current.game.world.map.width === 128
          ? { x: 62.5, y: 62.5 }
          : {
              x: current.game.world.map.width / 2,
              y: current.game.world.map.height / 2,
            },
      );
    }
  });
  canvas.addEventListener("assets-ready", () => render(current));
  new ResizeObserver(() => render(current)).observe(canvas);
  render(current);
  return {
    render,
    animate(timeMs: number) {
      if (element.hidden || canvas.ownerDocument.hidden || !current.running)
        return;
      if (reducedMotion?.matches) {
        if (visualTime !== 0) {
          visualTime = 0;
          drawFrame();
        }
        return;
      }
      if (timeMs - visualTime < 32) return;
      visualTime = timeMs;
      drawFrame();
    },
    focus,
    beginPlacement(request: PlacementRequest) {
      pawnControl.close();
      placement = createPlacementSession(request);
      focus(request.origin);
    },
  };
}
