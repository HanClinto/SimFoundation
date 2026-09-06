import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import { MATERIALS } from "../../simulation/materials";
import { OBJECT_DEFINITIONS } from "../../simulation/objects";
import type { DoorPolicy, TilePosition } from "../../simulation/world";
import { pawnCues } from "./pawn-cues";
import { observedSnapshot } from "./observed-view";
import { mapObjects } from "./map-objects";
import type { MapPerspective } from "./map-settings";
import { pawnPortrait } from "./pawn-art";
import residentUrl from "./assets/site-999.svg";

export function createMapSelection(
  host: HTMLElement,
  controller: GameController,
  inspect: (id: string, perspective: MapPerspective) => void,
  move?: (id: string, snapshot: ControllerSnapshot) => void,
) {
  const element = document.createElement("section");
  element.className = "map-selection-panel";
  element.setAttribute("aria-label", "Map selection");
  element.innerHTML =
    '<img data-selection-portrait alt="" hidden/><div class="map-selection-detail"><strong data-selection-name>No selection</strong><p data-selection-state></p><div class="map-selection-needs" data-selection-needs hidden><label>Rest <meter data-selection-rest min="0" max="100" low="30" high="70" optimum="100"></meter></label><label>Satiety <meter data-selection-satiety min="0" max="100" low="40" high="70" optimum="100"></meter></label></div></div><div class="map-selection-actions"><button type="button" data-selection-inspect>Inspect</button><button type="button" data-selection-move>Move</button><label data-selection-door hidden>Door <select aria-label="Selected door policy"><option value="automatic">Automatic</option><option value="held-open">Held open</option><option value="held-closed">Held closed</option></select></label></div><p role="status" data-selection-feedback></p>';
  host.append(element);
  const portrait = element.querySelector<HTMLImageElement>(
    "[data-selection-portrait]",
  )!;
  const name = element.querySelector<HTMLElement>("[data-selection-name]")!;
  const stateText = element.querySelector<HTMLElement>(
    "[data-selection-state]",
  )!;
  const inspectButton = element.querySelector<HTMLButtonElement>(
    "[data-selection-inspect]",
  )!;
  const moveButton = element.querySelector<HTMLButtonElement>(
    "[data-selection-move]",
  )!;
  const doorLabel = element.querySelector<HTMLElement>(
    "[data-selection-door]",
  )!;
  const door = doorLabel.querySelector<HTMLSelectElement>("select")!;
  const needs = element.querySelector<HTMLElement>("[data-selection-needs]")!;
  const feedback = element.querySelector<HTMLElement>(
    "[data-selection-feedback]",
  )!;
  let current = controller.getSnapshot();
  let selected: string | null = null;
  let perspective: MapPerspective = "world";
  let doorPosition: TilePosition | null = null;
  inspectButton.addEventListener("click", () => {
    if (selected) inspect(selected, perspective);
  });
  moveButton.addEventListener("click", () => {
    if (
      selected?.startsWith("object:") &&
      perspective === "world" &&
      !moveButton.disabled
    )
      move?.(selected.slice(7), current);
  });
  door.addEventListener("change", () => {
    if (!doorPosition || perspective !== "world") return;
    const requested = door.value as DoorPolicy;
    const result = controller.setDoorPolicy(doorPosition, requested);
    render(result, selected, perspective);
    feedback.textContent =
      result.game.world.map.doorPolicies?.[
        doorPosition.y * result.game.world.map.width + doorPosition.x
      ] === requested
        ? "Door policy updated."
        : "Doorway blocked; policy unchanged.";
  });
  function render(
    snapshot: ControllerSnapshot,
    id: string | null,
    view: MapPerspective,
  ) {
    if (selected !== id || perspective !== view) feedback.textContent = "";
    current = snapshot;
    selected = id;
    perspective = view;
    const state =
      view === "recorded" ? observedSnapshot(snapshot).game : snapshot.game;
    const entry = mapObjects(state, view).find((item) => item.id === id);
    const person = state.personnel.find((person) => person.id === id);
    const object = id?.startsWith("object:")
      ? state.objects.items.find((item) => item.id === id.slice(7))
      : undefined;
    const source = state.environment.sources.find((source) => source.id === id);
    const resident = id === "SCP-999" && !!entry;
    portrait.hidden = !(person && entry) && !resident;
    if (!portrait.hidden) {
      const portraitUrl = resident ? residentUrl : pawnPortrait(person!.id);
      if (portrait.src !== portraitUrl) portrait.src = portraitUrl;
    }
    name.textContent =
      entry?.name ??
      (id?.startsWith("tile:")
        ? `Tile ${id.slice(5).split(":")[0]!.replace(",", ", ")}`
        : "No selection");
    stateText.textContent =
      person && entry
        ? pawnCues(state, person.id, view)
            .map((cue) => cue.label)
            .join(" / ") || person.activity
        : object
          ? `${object.location.kind === "carried" ? "Being carried" : object.installed ? "Installed" : "Packed"} / ${object.condition.toFixed(0)}% condition${object.reservedBy ? " / Reserved for work" : ""}`
          : resident
            ? state.scp999.status
            : source
              ? `${source.kind} source / ${source.enabled === false ? "disabled" : "enabled"}`
              : "";
    needs.hidden = !person || !entry || view !== "world";
    if (person && !needs.hidden)
      for (const key of ["rest", "satiety"] as const) {
        const meter = needs.querySelector<HTMLMeterElement>(
          `[data-selection-${key}]`,
        )!;
        meter.value = person.needs[key];
        meter.title = `${Math.round(person.needs[key])} / 100`;
        meter.setAttribute(
          "aria-label",
          `${key === "rest" ? "Rest" : "Satiety"}: ${Math.round(person.needs[key])} of 100`,
        );
      }
    doorPosition = null;
    if (id?.startsWith("tile:")) {
      const [coordinates, layer] = id.slice(5).split(":");
      const [column, row] = coordinates!.split(",").map(Number);
      const position = { x: column!, y: row! };
      const cell =
        state.world.map.surfaces[
          position.y * state.world.map.width + position.x
        ];
      const surface = cell?.[layer === "floor" ? "floor" : "structure"];
      stateText.textContent = surface
        ? `${MATERIALS[surface.material].name} ${surface.kind} / ${surface.integrity.toFixed(0)}% integrity`
        : view === "recorded" &&
            state.observations.knownTiles[
              position.y * state.world.map.width + position.x
            ] == null
          ? "Not observed"
          : layer === "floor"
            ? "Unfinished ground"
            : "No structure";
      if (surface && ["door", "closed-door"].includes(surface.kind)) {
        doorPosition = position;
        door.value =
          snapshot.game.world.map.doorPolicies?.[
            position.y * state.world.map.width + position.x
          ] ?? (surface.kind === "door" ? "held-open" : "held-closed");
        door.disabled = view !== "world" || surface.integrity <= 0;
      }
    }
    doorLabel.hidden = !doorPosition;
    moveButton.hidden = !object;
    moveButton.textContent =
      object && OBJECT_DEFINITIONS[object.kind].stackable
        ? "Move stack"
        : "Move";
    moveButton.disabled =
      !move ||
      !object ||
      view !== "world" ||
      object.location.kind !== "ground" ||
      !!object.reservedBy;
    moveButton.title =
      view !== "world"
        ? "Switch to World view to move an object."
        : object?.reservedBy
          ? "Object reserved for active work."
          : object?.location.kind !== "ground"
            ? "Object must be on the ground."
            : "Choose a destination; workers perform the move.";
    inspectButton.disabled = !id || (!entry && !id.startsWith("tile:"));
    element.dataset.perspective = view;
  }
  render(current, null, "world");
  return { element, render };
}
