import type { PlacementRequest } from "./placement";

export function cameraPlacement(controller: GameController): PlacementRequest {
  return {
    label: "Surveillance camera / 1 kit",
    origin: { x: 63, y: 62 },
    footprint: (position) => [{ position }],
    validate: (origin) => {
      const code = controller.previewCamera(origin);
      return code ? cameraMessages[code] : null;
    },
    confirm: (origin) => {
      const result = controller.installCamera(origin);
      return {
        accepted: result.code === "installed-order",
        message: cameraMessages[result.code],
        snapshot: result.snapshot,
      };
    },
  };
}
import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import {
  cameraInstalled,
  type CameraPlacementCode,
} from "../../simulation/observations";
import type { TilePosition } from "../../simulation/world";

export const cameraMessages: Record<CameraPlacementCode, string> = {
  "installed-order": "Camera installation assigned to engineering.",
  "not-visible": "Choose a tile inside the site region.",
  "not-floor": "Camera mounting requires an interior floor tile.",
  occupied: "A camera is already registered at this location.",
  "no-kits": "No installation kits remain.",
};

export function createSurveillanceView(
  container: HTMLElement,
  controller: GameController,
  locate: (position: TilePosition) => void,
  plan: () => void,
) {
  container.innerHTML =
    '<header class="clinical-policy-heading"><h2>Surveillance</h2><p data-surveillance-summary></p></header><div class="planner-toolbar"><button type="button" data-plan-camera>Place camera</button></div><div class="planner-roster-scroll"><table class="data-table" aria-label="Registered cameras"><thead><tr><th>Camera</th><th>Enabled</th><th>Status</th><th>Range</th><th>Location</th></tr></thead><tbody></tbody></table></div>';
  const table = container.querySelector("tbody")!;
  let current = controller.getSnapshot();
  container
    .querySelector("[data-plan-camera]")!
    .addEventListener("click", plan);
  table.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    if (input.dataset.cameraEnabled)
      render(
        controller.setCameraEnabled(input.dataset.cameraEnabled, input.checked),
      );
  });
  table.addEventListener("click", (event) => {
    const id = (event.target as Element).closest<HTMLElement>(
      "[data-locate-camera]",
    )?.dataset.locateCamera;
    const camera = current.game.observations.cameras.find(
      (camera) => camera.id === id,
    );
    if (camera) locate(camera.position);
  });
  function render(snapshot: ControllerSnapshot) {
    current = snapshot;
    container.querySelector("[data-surveillance-summary]")!.textContent =
      `${snapshot.game.observations.cameraKits} installation kits / ${snapshot.game.observations.visibleEntityIds.length} entities currently observed by personnel or cameras`;
    const rows = new Map(
      Array.from(table.children, (row) => [
        (row as HTMLElement).dataset.cameraId,
        row as HTMLElement,
      ]),
    );
    for (const camera of snapshot.game.observations.cameras) {
      let row = rows.get(camera.id);
      if (!row) {
        row = document.createElement("tr");
        row.dataset.cameraId = camera.id;
        row.innerHTML =
          '<td data-camera-name></td><td><div class="field-row"><input type="checkbox"/><label>Enabled</label></div></td><td data-camera-state></td><td data-camera-range></td><td><button type="button">Locate</button></td>';
        const input = row.querySelector("input")!;
        input.id = `enabled-${camera.id}`;
        input.dataset.cameraEnabled = camera.id;
        input.setAttribute("aria-label", `Enable ${camera.name}`);
        row.querySelector("label")!.htmlFor = input.id;
        row.querySelector("button")!.dataset.locateCamera = camera.id;
        table.append(row);
      }
      row.querySelector("[data-camera-name]")!.textContent = camera.name;
      row.querySelector<HTMLInputElement>("input")!.checked = camera.enabled;
      row.querySelector("[data-camera-state]")!.textContent = !cameraInstalled(
        snapshot.game,
        camera,
      )
        ? "Installation pending"
        : camera.enabled
          ? "Online"
          : "Disabled";
      row.querySelector("[data-camera-range]")!.textContent =
        `${camera.range} tiles`;
      rows.delete(camera.id);
    }
    for (const row of rows.values()) row.remove();
  }
  render(current);
  return {
    render,
    selectCamera: (id: string) => {
      for (const row of table.querySelectorAll<HTMLElement>(
        "[data-camera-id]",
      )) {
        row.classList.toggle("selected-record", row.dataset.cameraId === id);
        if (row.dataset.cameraId === id)
          row.scrollIntoView?.({ block: "nearest" });
      }
    },
  };
}
