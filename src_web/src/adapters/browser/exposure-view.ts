import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import {
  exposureTiles,
  exposurePosition,
  type ExposureCommandCode,
  type ExposureSourcePolicy,
} from "../../simulation/environment";
import { surfaceAt } from "../../simulation/materials";
import { OBJECT_DEFINITIONS } from "../../simulation/objects";
import type { TilePosition } from "../../simulation/world";
import type { PlacementRequest } from "./placement";

const messages: Record<ExposureCommandCode, string> = {
  accepted: "Source settings saved.",
  "invalid-source":
    "Set a name, positive intensity up to 1000, radius 0 to 16, and a valid individual object if attached.",
  "invalid-position":
    "Choose an unobstructed tile, not an intact wall or closed door.",
  "limit-reached": "The site supports at most 32 exposure sources.",
  "not-found": "This source no longer exists.",
};

export function createExposureWindow(
  host: HTMLElement,
  controller: GameController,
  begin: (request: PlacementRequest) => void,
  locate: (position: TilePosition) => void,
  openObject?: (id: string) => void,
) {
  const element = document.createElement("section");
  element.id = "exposure-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Exposure sources sandbox");
  element.innerHTML =
    '<div class="title-bar"><div class="title-bar-text">Exposure Sources - Sandbox</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body construction-body"><div class="field-row"><label for="exposure-source">Source</label><select id="exposure-source"></select><button type="button" data-exposure-new>New source</button></div><dl class="trial-readings" data-exposure-record></dl><fieldset><legend>Source settings</legend><div class="field-row"><label for="exposure-name">Name</label><input id="exposure-name" maxlength="60"/></div><div class="field-row"><label for="exposure-kind">Effect</label><select id="exposure-kind"><option value="corrosion">Corrosion</option><option value="impact">Impact</option></select></div><div class="field-row"><label for="exposure-dose">Intensity / minute</label><input id="exposure-dose" type="number" min="0.1" max="1000" step="0.1"/></div><div class="field-row"><label for="exposure-radius">Radius (tiles)</label><input id="exposure-radius" type="number" min="0" max="16" step="1"/></div><div class="field-row"><input id="exposure-enabled" type="checkbox"/><label for="exposure-enabled">Enabled</label></div></fieldset><div class="dossier-actions"><button type="button" data-exposure-place>Place source</button><button type="button" data-exposure-save>Apply settings</button><button type="button" data-exposure-locate>Locate</button><button type="button" data-exposure-remove>Remove source</button></div><p role="status" data-exposure-feedback></p></div><div class="resize-grip" aria-hidden="true"></div>';
  host.append(element);
  const choice = element.querySelector<HTMLSelectElement>("#exposure-source")!;
  const name = element.querySelector<HTMLInputElement>("#exposure-name")!;
  const bindingRow = document.createElement("div");
  bindingRow.className = "field-row";
  bindingRow.innerHTML =
    '<label for="exposure-object">Attachment</label><select id="exposure-object"></select>';
  name.parentElement!.after(bindingRow);
  const binding = bindingRow.querySelector<HTMLSelectElement>("select")!;
  const inspectObject = document.createElement("button");
  inspectObject.type = "button";
  inspectObject.textContent = "Open object";
  inspectObject.dataset.exposureObjectRecord = "";
  element.querySelector(".dossier-actions")!.append(inspectObject);
  const kind = element.querySelector<HTMLSelectElement>("#exposure-kind")!;
  const dose = element.querySelector<HTMLInputElement>("#exposure-dose")!;
  const radius = element.querySelector<HTMLInputElement>("#exposure-radius")!;
  const enabled = element.querySelector<HTMLInputElement>("#exposure-enabled")!;
  const feedback = element.querySelector<HTMLElement>(
    "[data-exposure-feedback]",
  )!;
  let current = controller.getSnapshot();
  let selected: string | undefined;
  let signature = "";
  let objectSignature = "";
  const source = () =>
    current.game.environment.sources.find((source) => source.id === selected);
  inspectObject.addEventListener("click", () => {
    const id = source()?.objectId;
    if (id) openObject?.(id);
  });
  function policy(position: TilePosition): ExposureSourcePolicy {
    return {
      name: name.value,
      kind: kind.value as ExposureSourcePolicy["kind"],
      dose: Number(dose.value),
      radius: Number(radius.value),
      enabled: enabled.checked,
      position,
      objectId: binding.value || undefined,
    };
  }
  function choose(id?: string) {
    selected = id;
    const existing = source();
    name.value = existing?.name ?? "Local exposure";
    kind.value = existing?.kind ?? "corrosion";
    dose.value = String(existing?.dose ?? 4);
    radius.value = String(existing?.radius ?? 4);
    enabled.checked = existing?.enabled !== false;
    binding.value = existing?.objectId ?? "";
    feedback.textContent = "";
    render(current);
  }
  choice.addEventListener("change", () => choose(choice.value || undefined));
  binding.addEventListener("change", () => render(current));
  element
    .querySelector("[data-exposure-new]")!
    .addEventListener("click", () => choose());
  element
    .querySelector("[data-exposure-place]")!
    .addEventListener("click", () => {
      const id = selected;
      if (binding.value) return;
      const existing = source();
      const origin = existing
        ? (exposurePosition(current.game, existing) ?? existing.position)
        : { x: 60, y: 54 };
      const draft = policy(origin);
      begin({
        label: `${draft.name} / ${draft.kind} / ${draft.dose} per minute / radius ${draft.radius}`,
        origin,
        footprint: (position) => [{ position }],
        validate: (position) => {
          const issue = controller.previewExposureSource(
            { ...draft, position },
            id,
          );
          return issue ? messages[issue] : null;
        },
        confirm: (position) => {
          const result = controller.setExposureSource(
            { ...draft, position },
            id,
          );
          current = result.snapshot;
          if (result.code === "accepted")
            choose(id ?? current.game.environment.sources.at(-1)!.id);
          feedback.textContent = messages[result.code];
          return {
            accepted: result.code === "accepted",
            message: messages[result.code],
            snapshot: result.snapshot,
          };
        },
      });
    });
  element
    .querySelector("[data-exposure-save]")!
    .addEventListener("click", () => {
      const existing = source();
      if (!existing && !binding.value) return;
      const result = controller.setExposureSource(
        policy(
          existing
            ? (exposurePosition(current.game, existing) ?? existing.position)
            : { x: 60, y: 54 },
        ),
        existing?.id,
      );
      render(result.snapshot);
      if (result.code === "accepted")
        choose(
          existing?.id ?? result.snapshot.game.environment.sources.at(-1)!.id,
        );
      feedback.textContent = messages[result.code];
    });
  enabled.addEventListener("change", () => {
    const existing = source();
    if (!existing) return;
    const result = controller.setExposureSource(
      { ...existing, enabled: enabled.checked },
      existing.id,
    );
    render(result.snapshot);
    feedback.textContent = messages[result.code];
  });
  element
    .querySelector("[data-exposure-remove]")!
    .addEventListener("click", () => {
      if (!selected) return;
      current = controller.removeExposureSource(selected);
      choose();
      feedback.textContent = "Source removed; existing barrier damage remains.";
    });
  element
    .querySelector("[data-exposure-locate]")!
    .addEventListener("click", () => {
      const existing = source();
      const position = existing
        ? exposurePosition(current.game, existing)
        : null;
      if (position) locate(position);
    });
  function render(snapshot: ControllerSnapshot) {
    current = snapshot;
    const objects = snapshot.game.objects.items.filter(
      (item) =>
        !OBJECT_DEFINITIONS[item.kind].stackable &&
        item.location.kind !== "consumed",
    );
    const nextObjects = JSON.stringify(
      objects.map((item) => [item.id, item.kind]),
    );
    if (nextObjects !== objectSignature) {
      const value = binding.value;
      binding.replaceChildren(
        new Option("Fixed map position", ""),
        ...objects.map(
          (item) =>
            new Option(
              `${OBJECT_DEFINITIONS[item.kind].name} / ${item.id}`,
              item.id,
            ),
        ),
      );
      binding.value = value;
      objectSignature = nextObjects;
    }
    const next = JSON.stringify(
      snapshot.game.environment.sources.map((source) => [
        source.id,
        source.name,
      ]),
    );
    if (next !== signature) {
      choice.replaceChildren(
        new Option("New source", ""),
        ...snapshot.game.environment.sources.map(
          (source) => new Option(source.name, source.id),
        ),
      );
      signature = next;
    }
    choice.value = selected ?? "";
    const existing = source();
    const position = existing
      ? exposurePosition(snapshot.game, existing)
      : null;
    const object = existing?.objectId
      ? snapshot.game.objects.items.find(
          (item) => item.id === existing.objectId,
        )
      : undefined;
    inspectObject.disabled = !object || !openObject;
    inspectObject.hidden = !existing?.objectId;
    const tiles = existing ? exposureTiles(snapshot.game, existing) : [];
    const barriers = tiles
      .map((position) =>
        surfaceAt(snapshot.game.world.map, position, "structure"),
      )
      .filter((surface) => surface && surface.integrity > 0);
    const rows = existing
      ? [
          [
            "Location",
            position ? `${position.x}, ${position.y}` : "Host unavailable",
          ],
          ["Attachment", existing.objectId ?? "Fixed map position"],
          [
            "Host state",
            object
              ? object.location.kind === "carried"
                ? `Carried by ${snapshot.game.personnel.find((person) => object.location.kind === "carried" && person.id === object.location.personId)?.name ?? "unknown carrier"}`
                : object.installed
                  ? "Installed"
                  : object.location.kind === "ground"
                    ? "Packed / on ground"
                    : "Unavailable"
              : "Not attached",
          ],
          [
            "State",
            existing.enabled === false
              ? "Disabled"
              : position
                ? "Emitting"
                : "No host position",
          ],
          [
            "Current reach",
            `${tiles.length} tiles / ${barriers.length} intact barriers`,
          ],
          [
            "Lowest barrier integrity",
            barriers.length
              ? `${Math.min(...barriers.map((surface) => surface!.integrity))}%`
              : "No intact barriers in reach",
          ],
        ]
      : [["Selection", "New sandbox source"]];
    element.querySelector("[data-exposure-record]")!.replaceChildren(
      ...rows.map(([label, value]) => {
        const row = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label!;
        description.textContent = value!;
        row.append(term, description);
        return row;
      }),
    );
    for (const action of ["remove", "locate"])
      element.querySelector<HTMLButtonElement>(
        `[data-exposure-${action}]`,
      )!.disabled = !existing;
    const save = element.querySelector<HTMLButtonElement>(
      "[data-exposure-save]",
    )!;
    save.disabled = !existing && !binding.value;
    save.textContent = existing ? "Apply settings" : "Bind source";
    const place = element.querySelector<HTMLButtonElement>(
      "[data-exposure-place]",
    )!;
    place.disabled = !!binding.value;
    place.title = binding.value
      ? "Move the attached object through Objects and Supplies."
      : "Choose a fixed source location on the map.";
    place.textContent = binding.value
      ? "Attached to object"
      : existing
        ? "Relocate source"
        : "Place source";
  }
  choose();
  return {
    element,
    render,
    select(id: string, snapshot: ControllerSnapshot) {
      current = snapshot;
      choose(id);
    },
  };
}
