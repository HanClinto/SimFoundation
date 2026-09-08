import type { ControllerSnapshot } from "../../application/controller";
import { fieldSnapshot } from "./expedition-controller";
import { observedSnapshot } from "./observed-view";
import { engineeringRecord, exposureMapPosition } from "./map-objects";
import { OBJECT_DEFINITIONS, objectPosition } from "../../simulation/objects";
import { ENCOUNTER_RADIUS, adversaryBehavior } from "../../simulation/combat";
import type { MapPerspective } from "./map-settings";
import type { TilePosition } from "../../simulation/world";

export function fieldInspectionTarget(id: string): {
  kind: "orders" | "personnel" | "record";
  id: string;
} {
  if (id.startsWith("tactical:")) return { kind: "orders", id: id.slice(9) };
  if (id.startsWith("person-")) return { kind: "personnel", id };
  return { kind: "record", id };
}

export function fieldRecord(
  snapshot: ControllerSnapshot,
  id: string,
  perspective: MapPerspective,
): {
  title: string;
  position: TilePosition | null;
  rows: readonly (readonly [string, string])[];
} {
  const field = fieldSnapshot(snapshot);
  if (
    !field ||
    !["field", "regrouping"].includes(
      snapshot.game.expeditions.active?.phase ?? "",
    )
  )
    return {
      title: "Field Record",
      position: null,
      rows: [["Location", "Expedition location is no longer accessible."]],
    };
  const state =
    perspective === "recorded" ? observedSnapshot(field).game : field.game;
  const coordinates = (position: TilePosition | null) =>
    position ? `${position.x}, ${position.y}` : "Off map";
  if (id === "SCP-049-2") {
    const actor = state.combat.adversary;
    if (!actor)
      return {
        title: "SCP-049-2",
        position: null,
        rows: [["Observation", "No recorded sighting."]],
      };
    const behavior = adversaryBehavior(state.combat);
    return {
      title: "SCP-049-2",
      position: actor.position,
      rows: [
        ["Behavior", behavior],
        ["Location", coordinates(actor.position)],
        ["Integrity", `${actor.health} / 120`],
        ["Action", `${actor.phase} / ${actor.remaining} steps remaining`],
        [
          "Target",
          state.personnel.find((person) => person.id === actor.targetId)
            ?.name ?? "No visible target",
        ],
        [
          "Last sighting position",
          actor.lastKnown ? coordinates(actor.lastKnown) : "None",
        ],
        [
          "Movement",
          "One tile every two simulation steps; automatic doors can open",
        ],
        [
          "Detection",
          "6 tiles with line of sight; attacks require clear adjacent reach",
        ],
        [
          "Response area",
          `${ENCOUNTER_RADIUS} tiles from encounter origin; enrolled responders only`,
        ],
        [
          "Observation",
          perspective === "world"
            ? "World state"
            : `Last observed ${state.tick - state.combat.sighting!.observedTick} minutes ago`,
        ],
        ["Simulation", snapshot.running ? "Running" : "Paused"],
      ],
    };
  }
  if (id.startsWith("object:")) {
    const object = state.objects.items.find((item) => item.id === id.slice(7));
    if (!object)
      return {
        title: "Object Record",
        position: null,
        rows: [["Observation", "Object not present in this perspective."]],
      };
    const position = objectPosition(
      object,
      state.world.positions,
      state.objects,
    );
    return {
      title: OBJECT_DEFINITIONS[object.kind].name,
      position,
      rows: [
        ["Identity", object.id],
        ["Location", coordinates(position)],
        ["Condition", `${object.condition}%`],
        ["Quantity", String(object.quantity)],
        [
          "State",
          object.location.kind === "carried"
            ? `Carried by ${state.personnel.find((person) => object.location.kind === "carried" && person.id === object.location.personId)?.name ?? "unobserved carrier"}`
            : object.installed
              ? "Installed"
              : object.location.kind,
        ],
        [
          "Reservation",
          object.reservedBy ? "Reserved for physical recovery" : "Available",
        ],
        [
          "Attached sources",
          state.environment.sources
            .filter((source) => source.objectId === object.id)
            .map((source) => `${source.name} / ${source.kind}`)
            .join("; ") || "None",
        ],
        [
          "Observation",
          perspective === "world"
            ? "World state"
            : `Last observed ${state.tick - (state.observations.objects[object.id]?.observedTick ?? state.tick)} minutes ago`,
        ],
      ],
    };
  }
  if (id.startsWith("tile:")) {
    const [coordinates, layer] = id.slice(5).split(":");
    const [column, row] = coordinates!.split(",").map(Number);
    const position = { x: column!, y: row! };
    return {
      title: `Field tile ${column}, ${row}`,
      position,
      rows: engineeringRecord(
        state,
        position,
        layer === "floor" ? "floor" : "structure",
        perspective,
      ),
    };
  }
  const source = state.environment.sources.find((source) => source.id === id);
  if (source)
    return {
      title: source.name,
      position: exposureMapPosition(state, source, perspective),
      rows: [
        ["Type", source.kind],
        ["Attachment", source.objectId ?? "Fixed position"],
        [
          "Live emission",
          perspective === "world"
            ? `${source.enabled === false ? "Disabled" : "Enabled"} / dose ${source.dose} / radius ${source.radius}`
            : "Not recorded",
        ],
      ],
    };
  return {
    title: "Field Record",
    position: null,
    rows: [["Selection", "No record available."]],
  };
}

export function createFieldInspector(
  host: HTMLElement,
  locate: (position: TilePosition) => void,
) {
  const element = document.createElement("section");
  element.id = "field-inspector-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Field object inspector");
  element.innerHTML =
    '<div class="title-bar"><div class="title-bar-text">Field Record</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body construction-body"><dl class="trial-readings" data-field-record></dl><button type="button" data-field-locate>Locate</button></div><div class="resize-grip" aria-hidden="true"></div>';
  host.append(element);
  let selected: string | null = null;
  let expeditionId: string | null = null;
  let perspective: MapPerspective = "world";
  let position: TilePosition | null = null;
  const locateButton = element.querySelector<HTMLButtonElement>(
    "[data-field-locate]",
  )!;
  locateButton.addEventListener("click", () => {
    if (position) locate(position);
  });
  function render(snapshot: ControllerSnapshot) {
    if (!selected) return;
    const record =
      snapshot.game.expeditions.active?.id === expeditionId
        ? fieldRecord(snapshot, selected, perspective)
        : {
            title: "Field Record",
            position: null,
            rows: [["Location", "This expedition has ended."]],
          };
    position = record.position;
    element.querySelector(".title-bar-text")!.textContent = record.title;
    element.querySelector("[data-field-record]")!.replaceChildren(
      ...record.rows.flatMap(([label, value]) => {
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label!;
        description.textContent = value!;
        return [term, description];
      }),
    );
    locateButton.disabled = !position;
  }
  return {
    element,
    render,
    select(id: string, snapshot: ControllerSnapshot, view: MapPerspective) {
      selected = id;
      expeditionId = snapshot.game.expeditions.active?.id ?? null;
      perspective = view;
      render(snapshot);
    },
  };
}
