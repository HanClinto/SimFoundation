import type { ControllerSnapshot } from "../../application/controller";
import type { TilePosition } from "../../simulation/world";
import {
  renderSite,
  projectPosition,
  unprojectPosition,
  type MapCamera,
} from "./renderer";

export function createSiteCamera(
  canvas: HTMLCanvasElement,
  windowElement: HTMLElement,
  getSnapshot: () => ControllerSnapshot,
  openEntity: (id: string) => void,
) {
  let camera: MapCamera = {
    center: { x: 62.5, y: 62.5 },
    zoom: Math.max(
      0.3,
      Math.min(0.7, canvas.clientWidth / 1280, canvas.clientHeight / 680),
    ),
    selectedId: null,
  };
  const entitySelect = windowElement.querySelector<HTMLSelectElement>(
    "[data-camera-entity]",
  )!;
  const status = windowElement.querySelector<HTMLElement>(
    "[data-camera-status]",
  )!;
  const zoomLabel =
    windowElement.querySelector<HTMLOutputElement>("[data-camera-zoom]")!;
  const inspectButton = windowElement.querySelector<HTMLButtonElement>(
    '[data-camera-action="inspect"]',
  )!;
  let snapshot = getSnapshot();
  entitySelect.replaceChildren(
    new Option("Select personnel", ""),
    ...snapshot.game.personnel.map(
      (person) => new Option(person.name, person.id),
    ),
    new Option("SCP-999", "SCP-999"),
  );

  function render(nextSnapshot: ControllerSnapshot) {
    snapshot = nextSnapshot;
    renderSite(canvas, snapshot, camera);
    const selected = snapshot.game.personnel.find(
      ({ id }) => id === camera.selectedId,
    );
    status.textContent = selected
      ? `${selected.name}: ${selected.activity}`
      : camera.selectedId === "SCP-999"
        ? `SCP-999: ${snapshot.game.scp999.status}`
        : "Site 828 / Live surveillance";
    zoomLabel.value = `${Math.round(camera.zoom * 100)}%`;
    inspectButton.disabled = camera.selectedId === null;
  }

  function select(id: string | null) {
    camera = { ...camera, selectedId: id };
    entitySelect.value = id ?? "";
    render(snapshot);
  }

  function focus(position: TilePosition) {
    camera = {
      ...camera,
      center: {
        x: Math.max(0, Math.min(127, position.x)),
        y: Math.max(0, Math.min(127, position.y)),
      },
    };
    render(snapshot);
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

  entitySelect.addEventListener("change", () => {
    select(entitySelect.value || null);
    const position = snapshot.game.world.positions[entitySelect.value];
    if (position) focus(position);
  });
  windowElement.addEventListener("click", (event) => {
    const action = (event.target as Element).closest<HTMLElement>(
      "[data-camera-action]",
    )?.dataset.cameraAction;
    if (action === "in") zoom(1.25);
    if (action === "out") zoom(0.8);
    if (action === "home") {
      camera = {
        ...camera,
        zoom: Math.max(
          0.3,
          Math.min(0.7, canvas.clientWidth / 1280, canvas.clientHeight / 680),
        ),
      };
      focus({ x: 62.5, y: 62.5 });
    }
    if (action === "inspect" && camera.selectedId)
      openEntity(camera.selectedId);
  });

  const localPoint = (event: MouseEvent): TilePosition => {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  function entityAt(point: TilePosition): string | null {
    return (
      Object.entries(snapshot.game.world.positions)
        .map(([id, position]) => {
          const projected = projectPosition(
            position,
            camera,
            canvas.clientWidth,
            canvas.clientHeight,
          );
          return {
            id,
            distance: Math.hypot(
              projected.x - point.x,
              projected.y - 12 * camera.zoom - point.y,
            ),
          };
        })
        .filter(({ distance }) => distance < Math.max(14, 18 * camera.zoom))
        .sort(
          (first, second) =>
            first.distance - second.distance ||
            first.id.localeCompare(second.id),
        )[0]?.id ?? null
    );
  }
  let drag: {
    readonly start: TilePosition;
    readonly center: TilePosition;
    moved: boolean;
  } | null = null;
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    canvas.focus();
    drag = { start: localPoint(event), center: camera.center, moved: false };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const point = localPoint(event);
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
    if (drag && !drag.moved) select(entityAt(localPoint(event)));
    drag = null;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointercancel", () => {
    drag = null;
  });
  canvas.addEventListener("dblclick", (event) => {
    const id = entityAt(localPoint(event));
    if (id) {
      select(id);
      openEntity(id);
    }
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
      ArrowLeft: { x: -2, y: 2 },
      ArrowRight: { x: 2, y: -2 },
      ArrowUp: { x: -2, y: -2 },
      ArrowDown: { x: 2, y: 2 },
    };
    const delta = deltas[event.key];
    if (delta) {
      event.preventDefault();
      focus({ x: camera.center.x + delta.x, y: camera.center.y + delta.y });
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
      camera = {
        ...camera,
        zoom: Math.max(
          0.3,
          Math.min(0.7, canvas.clientWidth / 1280, canvas.clientHeight / 680),
        ),
      };
      focus({ x: 62.5, y: 62.5 });
    }
    if (event.key === "Enter" && camera.selectedId) {
      event.preventDefault();
      openEntity(camera.selectedId);
    }
  });
  canvas.addEventListener("assets-ready", () => render(snapshot));
  const observer = new ResizeObserver(() => render(snapshot));
  observer.observe(canvas);
  return { render, focus };
}
