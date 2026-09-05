import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import {
  MATERIALS,
  type MaterialId,
  type SurfaceLayer,
} from "../../simulation/materials";
import { sameTile } from "../../simulation/world";
import type { DoorPolicy, TilePosition } from "../../simulation/world";
import { engineeringRecord } from "./map-objects";
import type { MapPerspective } from "./map-settings";

export function createEngineeringWindow(
  host: HTMLElement,
  controller: GameController,
) {
  const element = document.createElement("section");
  element.id = "engineering-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Site 828 engineering inspector");
  element.innerHTML =
    '<div class="title-bar"><div class="title-bar-text">Engineering - Tile Record</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body construction-body"><h2>Tile Record</h2><dl class="trial-readings" data-tile-record></dl><button type="button" data-open-related-window="construction-window">Construction register</button></div><div class="resize-grip" aria-hidden="true"></div>';
  host.append(element);
  const controls = document.createElement("div");
  controls.className = "surface-controls";
  controls.innerHTML = `<fieldset><legend>Surface work</legend><div class="field-row"><label for="surface-layer">Layer</label><select id="surface-layer"><option value="structure">Structure</option><option value="floor">Floor</option></select><label for="surface-material">Material</label><select id="surface-material">${Object.entries(
    MATERIALS,
  )
    .map(
      ([id, material]) =>
        `<option value="${id}">${material.name} (${material.cost})</option>`,
    )
    .join(
      "",
    )}</select></div><div class="dossier-actions"><button type="button" data-replace-surface>Order replacement</button><button type="button" data-operate-door hidden>Open door</button></div><p data-surface-stock></p><p role="status" data-surface-feedback></p></fieldset><fieldset><legend>Facility maintenance</legend><div class="field-row"><input type="checkbox" id="automatic-surface-repairs"/><label for="automatic-surface-repairs">Replace observed surfaces at 55% or below</label></div></fieldset>`;
  element.querySelector("[data-tile-record]")!.after(controls);
  const layerSelect =
    element.querySelector<HTMLSelectElement>("#surface-layer")!;
  const materialSelect =
    element.querySelector<HTMLSelectElement>("#surface-material")!;
  const replace = element.querySelector<HTMLButtonElement>(
    "[data-replace-surface]",
  )!;
  const doorButton = element.querySelector<HTMLButtonElement>(
    "[data-operate-door]",
  )!;
  const doorControls = document.createElement("div");
  doorControls.className = "field-row";
  doorControls.innerHTML =
    '<label for="door-policy">Door policy</label><select id="door-policy"><option value="automatic">Automatic</option><option value="held-open">Held open</option><option value="held-closed">Held closed</option></select>';
  doorButton.parentElement!.after(doorControls);
  const doorPolicy = doorControls.querySelector<HTMLSelectElement>("select")!;
  const automatic = element.querySelector<HTMLInputElement>(
    "#automatic-surface-repairs",
  )!;
  const feedback = element.querySelector<HTMLElement>(
    "[data-surface-feedback]",
  )!;
  const availability = document.createElement("p");
  availability.dataset.surfaceAvailability = "";
  availability.setAttribute("role", "status");
  availability.id = "surface-availability";
  replace.setAttribute("aria-describedby", availability.id);
  replace.parentElement!.after(availability);
  const chooseTile = document.createElement("button");
  chooseTile.type = "button";
  chooseTile.textContent = "Choose tile";
  chooseTile.dataset.openRelatedWindow = "camera-window";
  availability.after(chooseTile);
  let position: TilePosition | null = null;
  let perspective: MapPerspective = "recorded";
  let current = controller.getSnapshot();
  doorPolicy.addEventListener("change", () => {
    if (!position) return;
    const requested = doorPolicy.value as DoorPolicy;
    const next = controller.setDoorPolicy(position, requested);
    render(next);
    feedback.textContent =
      next.game.world.map.doorPolicies?.[
        position.y * next.game.world.map.width + position.x
      ] === requested
        ? "Door policy saved."
        : "Door policy could not be applied; clear the doorway of people and objects.";
  });
  layerSelect.addEventListener("change", () => render(current));
  materialSelect.addEventListener("change", () => render(current));
  automatic.addEventListener("change", () =>
    render(controller.setAutomaticRepairs(automatic.checked)),
  );
  replace.addEventListener("click", () => {
    if (!position) return;
    const result = controller.orderSurfaceWork(
      position,
      layerSelect.value as SurfaceLayer,
      materialSelect.value as MaterialId,
    );
    const messages = {
      accepted: "Collection and delivery ordered.",
      "unknown-surface": "No installed surface on record.",
      busy: "A replacement is already pending.",
      "insufficient-materials": "Insufficient materials in the store.",
      unreachable: "No reachable work face.",
      "invalid-material": "Unknown material.",
    };
    feedback.textContent = messages[result.code];
    render(result.snapshot);
  });
  doorButton.addEventListener("click", () => {
    if (!position) return;
    const index = position.y * current.game.world.map.width + position.x;
    const open =
      current.game.world.map.surfaces[index]?.structure?.kind === "closed-door";
    const next = controller.setDoorOpen(position, open);
    render(next);
    feedback.textContent =
      next.game.world.map.surfaces[index]?.structure?.kind ===
      (open ? "door" : "closed-door")
        ? `Door control set to ${open ? "open" : "closed"}.`
        : "Door command could not be applied.";
  });
  function render(snapshot: ControllerSnapshot) {
    current = snapshot;
    automatic.checked = snapshot.game.environment.automaticRepairs;
    element.querySelector("[data-surface-stock]")!.textContent =
      `${snapshot.game.construction.availableMaterials} material units in store`;
    const layer = layerSelect.value as SurfaceLayer;
    const surfaces =
      perspective === "world"
        ? snapshot.game.world.map.surfaces
        : snapshot.game.observations.knownSurfaces;
    const cell = position
      ? surfaces[position.y * snapshot.game.world.map.width + position.x]
      : undefined;
    const surface = cell?.[layer];
    const pending = snapshot.game.environment.orders.find(
      (order) =>
        position &&
        sameTile(order.position, position) &&
        order.layer === layer &&
        order.phase !== "completed",
    );
    const cost = MATERIALS[materialSelect.value as MaterialId].cost;
    const reason = !position
      ? "No tile selected."
      : !surface
        ? `No ${layer} ${perspective === "recorded" ? "on record" : "installed"} at this tile.`
        : pending
          ? `Replacement already queued: ${pending.phase}.`
          : snapshot.game.construction.availableMaterials < cost
            ? `Replacement requires ${cost} material units; ${snapshot.game.construction.availableMaterials} available.`
            : "";
    replace.disabled = reason !== "";
    replace.title = reason || "Queue material delivery and installation";
    availability.textContent = reason;
    availability.hidden = reason === "";
    chooseTile.hidden = position !== null;
    doorButton.hidden =
      layer !== "structure" ||
      !surface ||
      !["door", "closed-door"].includes(surface.kind);
    doorButton.disabled = !surface || surface.integrity === 0;
    doorControls.hidden = doorButton.hidden;
    doorPolicy.disabled = doorButton.disabled;
    const doorSetting = position
      ? snapshot.game.world.map.surfaces[
          position.y * snapshot.game.world.map.width + position.x
        ]?.structure?.kind
      : null;
    doorButton.textContent =
      doorSetting === "closed-door" ? "Open door" : "Close door";
    doorPolicy.value = position
      ? (snapshot.game.world.map.doorPolicies?.[
          position.y * snapshot.game.world.map.width + position.x
        ] ?? (doorSetting === "closed-door" ? "held-closed" : "held-open"))
      : "automatic";
    if (!position) {
      element.querySelector("[data-tile-record]")!.replaceChildren();
      return;
    }
    element.querySelector("[data-tile-record]")!.replaceChildren(
      ...engineeringRecord(snapshot.game, position, layer, perspective).map(
        ([label, value]) => {
          const row = document.createElement("div");
          const term = document.createElement("dt");
          const description = document.createElement("dd");
          term.textContent = label;
          description.textContent = value;
          row.append(term, description);
          return row;
        },
      ),
    );
  }
  render(current);
  return {
    element,
    render,
    select: (
      next: TilePosition,
      snapshot: ControllerSnapshot,
      layer?: SurfaceLayer,
      nextPerspective: MapPerspective = "recorded",
    ) => {
      position = next;
      perspective = nextPerspective;
      const surfaces =
        perspective === "world"
          ? snapshot.game.world.map.surfaces
          : snapshot.game.observations.knownSurfaces;
      layerSelect.value =
        layer ??
        (surfaces[next.y * snapshot.game.world.map.width + next.x]?.structure
          ? "structure"
          : "floor");
      const surface =
        surfaces[next.y * snapshot.game.world.map.width + next.x]?.[
          layerSelect.value as SurfaceLayer
        ];
      if (surface) materialSelect.value = surface.material;
      feedback.textContent = "";
      render(snapshot);
    },
  };
}
