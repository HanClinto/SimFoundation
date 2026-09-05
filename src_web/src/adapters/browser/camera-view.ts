import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import type { TilePosition } from "../../simulation/world";
import { availableResearchLaboratories } from "../../simulation/construction";
import {
  constructionMessages,
  updateConstructionRegister,
} from "./construction-view";
import {
  renderSite,
  projectPosition,
  unprojectPosition,
  type MapCamera,
} from "./renderer";

export function createSiteCamera(
  canvas: HTMLCanvasElement,
  windowElement: HTMLElement,
  controller: GameController,
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
  const researchLaboratory = windowElement.querySelector<HTMLSelectElement>(
    "[data-research-laboratory]",
  )!;
  let laboratorySignature = "";
  const status = windowElement.querySelector<HTMLElement>(
    "[data-camera-status]",
  )!;
  const zoomLabel =
    windowElement.querySelector<HTMLOutputElement>("[data-camera-zoom]")!;
  const inspectButton = windowElement.querySelector<HTMLButtonElement>(
    '[data-camera-action="inspect"]',
  )!;
  const mode =
    windowElement.querySelector<HTMLSelectElement>("[data-camera-mode]")!;
  const feedback = windowElement.querySelector<HTMLElement>(
    "[data-construction-feedback]",
  )!;
  const materials = windowElement.querySelector<HTMLElement>(
    "[data-construction-materials]",
  )!;
  const register = windowElement.querySelector<HTMLElement>(
    "[data-construction-register]",
  )!;
  const placeButton = windowElement.querySelector<HTMLButtonElement>(
    '[data-camera-action="place"]',
  )!;
  let registerSignature = "";
  let snapshot = controller.getSnapshot();
  entitySelect.replaceChildren(
    new Option("Select personnel", ""),
    ...snapshot.game.personnel.map(
      (person) => new Option(person.name, person.id),
    ),
    new Option("SCP-999", "SCP-999"),
  );

  function render(nextSnapshot: ControllerSnapshot) {
    snapshot = nextSnapshot;
    if (camera.draft)
      camera = {
        ...camera,
        draft: {
          ...camera.draft,
          valid: controller.previewLaboratory(camera.draft.origin) === null,
        },
      };
    renderSite(canvas, snapshot, camera);
    materials.textContent = `${snapshot.game.construction.availableMaterials} materials available`;
    const laboratories = availableResearchLaboratories(snapshot.game);
    const nextLaboratorySignature = laboratories.map(({ id }) => id).join(",");
    if (nextLaboratorySignature !== laboratorySignature) {
      researchLaboratory.replaceChildren(
        ...laboratories.map((room) => new Option(room.name, room.id)),
      );
      laboratorySignature = nextLaboratorySignature;
    }
    researchLaboratory.value = snapshot.game.construction.researchLaboratoryId;
    placeButton.disabled = !camera.draft?.valid;
    if (camera.draft) {
      const code = controller.previewLaboratory(camera.draft.origin);
      feedback.textContent = code
        ? constructionMessages[code]
        : "Laboratory annex: 9 x 7 / 40 material units / entrance marked.";
    }
    const signature = JSON.stringify([
      snapshot.game.construction,
      snapshot.game.jobs.map(({ id, status, assignmentReason }) => [
        id,
        status,
        assignmentReason,
      ]),
    ]);
    if (signature !== registerSignature) {
      updateConstructionRegister(register, snapshot.game);
      registerSignature = signature;
    }
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

  function placeDraft() {
    if (!camera.draft) return;
    const result = controller.placeLaboratory(camera.draft.origin);
    if (result.code === "placed") {
      camera = { ...camera, draft: null };
      mode.value = "inspect";
    }
    feedback.textContent = constructionMessages[result.code];
    render(result.snapshot);
  }

  mode.addEventListener("change", () => {
    camera = {
      ...camera,
      draft:
        mode.value === "laboratory"
          ? { origin: { x: 59, y: 80 }, valid: false }
          : null,
    };
    if (camera.draft) focus({ x: 63, y: 83 });
    else {
      feedback.textContent = "";
      render(snapshot);
    }
  });

  researchLaboratory.addEventListener("change", () => {
    const result = controller.setResearchLaboratory(researchLaboratory.value);
    feedback.textContent = constructionMessages[result.code];
    render(result.snapshot);
  });

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
    if (action === "place") placeDraft();
    const target = (event.target as Element).closest<HTMLElement>(
      "[data-focus-blueprint], [data-cancel-blueprint]",
    );
    const blueprint = snapshot.game.construction.blueprints.find(
      ({ id }) => id === target?.dataset.focusBlueprint,
    );
    if (blueprint)
      focus({ x: blueprint.origin.x + 4, y: blueprint.origin.y + 3 });
    if (target?.dataset.cancelBlueprint) {
      const result = controller.cancelLaboratory(
        target.dataset.cancelBlueprint,
      );
      feedback.textContent = constructionMessages[result.code];
      render(result.snapshot);
    }
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
    const point = localPoint(event);
    if (!drag) {
      if (mode.value === "laboratory") {
        const origin = unprojectPosition(
          point,
          camera,
          canvas.clientWidth,
          canvas.clientHeight,
        );
        camera = {
          ...camera,
          draft: {
            origin: { x: Math.round(origin.x), y: Math.round(origin.y) },
            valid: false,
          },
        };
        render(snapshot);
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
      if (mode.value === "laboratory") {
        const origin = unprojectPosition(
          localPoint(event),
          camera,
          canvas.clientWidth,
          canvas.clientHeight,
        );
        camera = {
          ...camera,
          draft: {
            origin: { x: Math.round(origin.x), y: Math.round(origin.y) },
            valid: false,
          },
        };
        render(snapshot);
      } else select(entityAt(localPoint(event)));
    }
    drag = null;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointercancel", () => {
    drag = null;
  });
  canvas.addEventListener("dblclick", (event) => {
    if (mode.value === "laboratory") return;
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
      if (camera.draft) {
        camera = {
          ...camera,
          draft: {
            origin: {
              x: camera.draft.origin.x + delta.x / 2,
              y: camera.draft.origin.y + delta.y / 2,
            },
            valid: false,
          },
        };
        render(snapshot);
      } else
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
    if (event.key === "Escape" && camera.draft) {
      camera = { ...camera, draft: null };
      mode.value = "inspect";
      feedback.textContent = "";
      render(snapshot);
    }
    if (event.key === "Enter" && camera.draft) {
      event.preventDefault();
      placeDraft();
    } else if (event.key === "Enter" && camera.selectedId) {
      event.preventDefault();
      openEntity(camera.selectedId);
    }
  });
  canvas.addEventListener("assets-ready", () => render(snapshot));
  const observer = new ResizeObserver(() => render(snapshot));
  observer.observe(canvas);
  return { render, focus };
}
