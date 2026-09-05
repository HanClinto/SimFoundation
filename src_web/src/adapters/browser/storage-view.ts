import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import { OBJECT_DEFINITIONS, type ObjectKind } from "../../simulation/objects";
import {
  incomingQuantity,
  storageQuantity,
  storageStatus,
  storageTiles,
  type StorageCommandCode,
  type StoragePolicy,
} from "../../simulation/storage";
import type { PlacementRequest } from "./placement";
import type { TilePosition } from "../../simulation/world";

const messages: Record<StorageCommandCode, string> = {
  accepted: "Storage policy saved.",
  "invalid-policy":
    "Set a name, accepted items, valid dimensions, and a target no larger than capacity.",
  "invalid-floor":
    "Storage requires reachable, unobstructed interior floor tiles.",
  overlap: "Storage areas cannot overlap.",
  occupied:
    "Existing furniture, stock, or reservations conflict with this policy.",
  busy: "Finish or cancel committed transfers before changing this area.",
  "not-found": "Storage area no longer exists.",
};
export function createStorageWindow(
  host: HTMLElement,
  controller: GameController,
  begin: (request: PlacementRequest) => void,
  locate: (position: TilePosition) => void,
) {
  const element = document.createElement("section");
  element.id = "storage-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Storage policies");
  element.innerHTML = `<div class="title-bar"><div class="title-bar-text">Storage and Hauling</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body construction-body"><div class="field-row"><label for="storage-area">Area</label><select id="storage-area"></select><button type="button" data-storage-new>New area</button></div><dl class="trial-readings" data-storage-record></dl><fieldset><legend>Policy</legend><label class="storage-field">Name <input id="storage-name" maxlength="60" value="Storage area"/></label><div class="field-row"><label for="storage-width">Width</label><input id="storage-width" type="number" min="1" max="8" value="1"/><label for="storage-height">Height</label><input id="storage-height" type="number" min="1" max="8" value="1"/></div><div class="field-row"><label for="storage-capacity">Capacity</label><input id="storage-capacity" type="number" min="1" max="1000" value="36"/><label for="storage-target">Target</label><input id="storage-target" type="number" min="0" max="1000" value="24"/></div><fieldset><legend>Accepted items</legend>${Object.entries(
    OBJECT_DEFINITIONS,
  )
    .map(
      ([id, definition]) =>
        `<div class="field-row"><input id="storage-accept-${id}" type="checkbox" data-storage-accept="${id}" ${id === "meals" ? "checked" : ""}/><label for="storage-accept-${id}">${definition.name}</label></div>`,
    )
    .join(
      "",
    )}</fieldset><div class="field-row"><input id="storage-serving" type="checkbox" checked/><label for="storage-serving">Diners collect meals here</label></div><div class="field-row"><input id="storage-enabled" type="checkbox" checked/><label for="storage-enabled">Enable stocking policy</label></div></fieldset><div class="dossier-actions"><button type="button" data-storage-place>Designate area</button><button type="button" data-storage-save>Apply policy</button><button type="button" data-storage-locate>Locate</button><button type="button" data-storage-remove>Remove designation</button></div><p role="status" data-storage-feedback></p></div><div class="resize-grip" aria-hidden="true"></div>`;
  host.append(element);
  const choice = element.querySelector<HTMLSelectElement>("#storage-area")!;
  const feedback = element.querySelector<HTMLElement>(
    "[data-storage-feedback]",
  )!;
  let selected: string | undefined;
  let current = controller.getSnapshot();
  let signature = "";
  const input = (id: string) =>
    element.querySelector<HTMLInputElement>(`#storage-${id}`)!;
  function policy(origin: TilePosition): StoragePolicy {
    return {
      name: input("name").value.trim(),
      origin,
      width: Number(input("width").value),
      height: Number(input("height").value),
      capacity: Number(input("capacity").value),
      target: Number(input("target").value),
      accepts: [
        ...element.querySelectorAll<HTMLInputElement>(
          "[data-storage-accept]:checked",
        ),
      ].map((input) => input.dataset.storageAccept as ObjectKind),
      serveMeals: input("serving").checked,
      enabled: input("enabled").checked,
    };
  }
  function choose(id?: string) {
    selected = id;
    const area = current.game.storage.areas.find((area) => area.id === id);
    input("name").value = area?.name ?? "Storage area";
    for (const field of ["width", "height", "capacity", "target"] as const)
      input(field).value = String(
        area?.[field] ??
          { width: 1, height: 1, capacity: 36, target: 24 }[field],
      );
    input("serving").checked = area?.serveMeals ?? true;
    input("enabled").checked = area?.enabled ?? true;
    for (const checkbox of element.querySelectorAll<HTMLInputElement>(
      "[data-storage-accept]",
    ))
      checkbox.checked = area
        ? area.accepts.includes(checkbox.dataset.storageAccept as ObjectKind)
        : checkbox.dataset.storageAccept === "meals";
    feedback.textContent = "";
    render(current);
  }
  choice.addEventListener("change", () => choose(choice.value || undefined));
  element
    .querySelector("[data-storage-new]")!
    .addEventListener("click", () => choose());
  element
    .querySelector("[data-storage-place]")!
    .addEventListener("click", () => {
      const id = selected;
      const origin = current.game.storage.areas.find((area) => area.id === id)
        ?.origin ?? { x: 59, y: 65 };
      const draft = policy(origin);
      if (
        !Number.isInteger(draft.width) ||
        !Number.isInteger(draft.height) ||
        draft.width < 1 ||
        draft.height < 1 ||
        draft.width > 8 ||
        draft.height > 8
      ) {
        feedback.textContent = messages["invalid-policy"];
        return;
      }
      begin({
        label: `${draft.name} / ${draft.width} x ${draft.height} / capacity ${draft.capacity}`,
        origin,
        footprint: (position) =>
          storageTiles({ ...draft, origin: position }).map((position) => ({
            position,
          })),
        validate: (position) => {
          const issue = controller.previewStorageArea(
            { ...draft, origin: position },
            id,
          );
          return issue ? messages[issue] : null;
        },
        confirm: (position) => {
          const result = controller.setStorageArea(
            { ...draft, origin: position },
            id,
          );
          current = result.snapshot;
          if (result.code === "accepted")
            choose(id ?? result.snapshot.game.storage.areas.at(-1)!.id);
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
    .querySelector("[data-storage-save]")!
    .addEventListener("click", () => {
      const area = current.game.storage.areas.find(
        (area) => area.id === selected,
      );
      if (!area) return;
      const result = controller.setStorageArea(policy(area.origin), area.id);
      render(result.snapshot);
      feedback.textContent = messages[result.code];
    });
  element
    .querySelector("[data-storage-remove]")!
    .addEventListener("click", () => {
      if (!selected) return;
      const result = controller.removeStorageArea(selected);
      current = result.snapshot;
      if (result.code === "accepted") choose();
      render(current);
      feedback.textContent =
        result.code === "accepted"
          ? "Designation removed; objects remain in place."
          : messages[result.code];
    });
  element
    .querySelector("[data-storage-locate]")!
    .addEventListener("click", () => {
      const area = current.game.storage.areas.find(
        (area) => area.id === selected,
      );
      if (area) locate(area.origin);
    });
  function render(snapshot: ControllerSnapshot) {
    current = snapshot;
    const next = JSON.stringify(
      snapshot.game.storage.areas.map((area) => [area.id, area.name]),
    );
    if (next !== signature) {
      choice.replaceChildren(
        new Option("New designation", ""),
        ...snapshot.game.storage.areas.map(
          (area) => new Option(area.name, area.id),
        ),
      );
      signature = next;
    }
    choice.value = selected ?? "";
    const area = snapshot.game.storage.areas.find(
      (area) => area.id === selected,
    );
    const rows = area
      ? [
          [
            "Location",
            `${area.origin.x}, ${area.origin.y} / ${area.width} x ${area.height}`,
          ],
          [
            "Stock / capacity",
            `${storageQuantity(snapshot.game, area)} / ${area.capacity}`,
          ],
          ["Incoming", String(incomingQuantity(snapshot.game, area))],
          ["Target", String(area.target)],
          ["Hauling", storageStatus(snapshot.game, area)],
        ]
      : [["Selection", "New storage designation"]];
    element.querySelector("[data-storage-record]")!.replaceChildren(
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
    for (const action of ["save", "remove", "locate"])
      element.querySelector<HTMLButtonElement>(
        `[data-storage-${action}]`,
      )!.disabled = !area;
    element.querySelector("[data-storage-place]")!.textContent = area
      ? "Relocate area"
      : "Designate area";
  }
  render(current);
  return {
    element,
    render,
    select(id: string, snapshot: ControllerSnapshot) {
      current = snapshot;
      choose(id);
    },
  };
}
