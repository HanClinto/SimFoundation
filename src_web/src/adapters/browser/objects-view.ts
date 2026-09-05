import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import {
  OBJECT_DEFINITIONS,
  objectFootprint,
  objectPosition,
  type ObjectOrientation,
} from "../../simulation/objects";
import type { ObjectCommandCode } from "../../simulation/object-work";
import type { PlacementRequest } from "./placement";
import type { MapPerspective } from "./map-settings";
import { observedSnapshot } from "./observed-view";
import type { TilePosition } from "../../simulation/world";

const messages: Record<ObjectCommandCode, string> = {
  accepted: "Object transfer queued.",
  busy: "This object is already reserved.",
  "not-found": "Object no longer available.",
  "invalid-position": "Choose a valid floor footprint and quantity.",
  occupied: "The footprint conflicts with an object or reserved placement.",
  unreachable: "No reachable pickup or delivery face.",
  "already-carried": "Object is already being carried.",
};

export function createObjectsWindow(
  host: HTMLElement,
  controller: GameController,
  begin: (request: PlacementRequest) => void,
  locate: (position: TilePosition) => void,
) {
  const element = document.createElement("section");
  element.id = "objects-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Physical objects");
  element.innerHTML =
    '<div class="title-bar"><div class="title-bar-text">Objects and Supplies</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body construction-body"><div class="field-row"><label for="object-choice">Object</label><select id="object-choice"></select></div><dl class="trial-readings" data-object-record></dl><fieldset><legend>Transfer</legend><div class="field-row"><label for="object-orientation">Orientation</label><select id="object-orientation"><option value="north">North</option><option value="east">East</option><option value="south">South</option><option value="west">West</option></select><label for="object-quantity">Quantity</label><input id="object-quantity" type="number" min="1" step="1" value="1"/></div><div class="dossier-actions"><button type="button" data-object-move>Move / install</button><button type="button" data-object-pack>Pack in place</button><button type="button" data-object-locate>Locate</button><button type="button" data-object-cancel>Cancel order</button></div></fieldset><p role="status" data-object-feedback></p></div><div class="resize-grip" aria-hidden="true"></div>';
  host.append(element);
  const choice = element.querySelector<HTMLSelectElement>("#object-choice")!;
  const orientation = element.querySelector<HTMLSelectElement>(
    "#object-orientation",
  )!;
  const quantity = element.querySelector<HTMLInputElement>("#object-quantity")!;
  const feedback = element.querySelector<HTMLElement>(
    "[data-object-feedback]",
  )!;
  let current = controller.getSnapshot();
  let perspective: MapPerspective = "world";
  let selected: string | null = null;
  let signature = "";
  const displayed = () =>
    perspective === "world" ? current : observedSnapshot(current);
  const selectedObject = () =>
    displayed().game.objects.items.find((item) => item.id === selected);
  function choose(id: string) {
    selected = id;
    const item = selectedObject();
    if (item) {
      orientation.value = item.orientation;
      quantity.value = String(item.quantity);
    }
    feedback.textContent = "";
    render(current);
  }
  choice.addEventListener("change", () => choose(choice.value));
  element.querySelector("[data-object-move]")!.addEventListener("click", () => {
    const item = selectedObject();
    if (!item || item.location.kind !== "ground") return;
    const install = !OBJECT_DEFINITIONS[item.kind].stackable;
    const direction = orientation.value as ObjectOrientation;
    const count = Number(quantity.value);
    if (!Number.isInteger(count) || count < 1 || count > item.quantity) {
      feedback.textContent = "Choose a quantity within the available stack.";
      return;
    }
    begin({
      label: `${OBJECT_DEFINITIONS[item.kind].name} / ${count} / ${direction}`,
      origin: item.location.position,
      footprint: (position) =>
        (install
          ? objectFootprint({ ...item, orientation: direction }, position)
          : [position]
        ).map((position) => ({ position })),
      validate: (position) => {
        const issue = controller.previewObjectMove(
          item.id,
          position,
          direction,
          install,
        );
        return issue ? messages[issue] : null;
      },
      confirm: (position) => {
        const result = controller.orderObjectMove(
          item.id,
          position,
          direction,
          install,
          count,
        );
        if (result.code === "accepted")
          selected = result.snapshot.game.objectOrders.at(-1)!.objectId;
        render(result.snapshot);
        return {
          accepted: result.code === "accepted",
          message: messages[result.code],
          snapshot: result.snapshot,
        };
      },
    });
  });
  element.querySelector("[data-object-pack]")!.addEventListener("click", () => {
    const item = selectedObject();
    if (!item || item.location.kind !== "ground") return;
    const result = controller.orderObjectMove(
      item.id,
      item.location.position,
      item.orientation,
      false,
    );
    feedback.textContent = messages[result.code];
    render(result.snapshot);
  });
  element
    .querySelector("[data-object-locate]")!
    .addEventListener("click", () => {
      const item = selectedObject();
      const position = item
        ? objectPosition(item, displayed().game.world.positions)
        : null;
      if (position) locate(position);
    });
  element
    .querySelector("[data-object-cancel]")!
    .addEventListener("click", () => {
      const order = current.game.objectOrders.find(
        (order) => order.objectId === selected && order.phase === "pickup",
      );
      if (order) render(controller.cancelObjectMove(order.id));
    });
  function render(snapshot: ControllerSnapshot) {
    current = snapshot;
    const state = displayed().game;
    const items = state.objects.items.filter(
      (item) => item.location.kind !== "consumed",
    );
    const nextSignature = JSON.stringify(
      items.map((item) => [item.id, item.quantity]),
    );
    if (signature !== nextSignature) {
      choice.replaceChildren(
        new Option("Select object", ""),
        ...items.map(
          (item) =>
            new Option(
              `${OBJECT_DEFINITIONS[item.kind].name} / ${item.id}${item.quantity > 1 ? ` / ${item.quantity}` : ""}`,
              item.id,
            ),
        ),
      );
      signature = nextSignature;
    }
    choice.value = selected ?? "";
    const item = selectedObject();
    const order = state.objectOrders.find(
      (order) =>
        order.objectId === selected &&
        !["completed", "cancelled"].includes(order.phase),
    );
    const job = state.jobs.find((job) => job.id === order?.jobId);
    const position = item ? objectPosition(item, state.world.positions) : null;
    const rows = item
      ? [
          ["Definition", OBJECT_DEFINITIONS[item.kind].name],
          ["Identity", item.id],
          ["Quantity", String(item.quantity)],
          ["Condition", `${item.condition}%`],
          [
            "State",
            item.location.kind === "carried"
              ? `Carried by ${state.personnel.find((person) => person.id === (item.location.kind === "carried" ? item.location.personId : ""))?.name}`
              : item.installed
                ? "Installed"
                : "Packed / on ground",
          ],
          ["Location", position ? `${position.x}, ${position.y}` : "Unknown"],
          ["Orientation", item.orientation],
          ["Reservation", item.reservedBy ?? "Available"],
          [
            "Work",
            order
              ? `${order.phase} / ${job?.progress ?? 0} of ${job?.requiredProgress ?? 0} / ${order.blockedReason ?? job?.assignmentReason ?? "Queued"}`
              : "No open transfer",
          ],
          [
            "Observation",
            perspective === "world"
              ? "Simulation state"
              : `Last observed ${current.game.tick - (current.game.observations.objects[item.id]?.observedTick ?? 0)} minutes ago`,
          ],
        ]
      : [["Selection", "Choose an object or supply stack."]];
    element.querySelector("[data-object-record]")!.replaceChildren(
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
    element.querySelector<HTMLButtonElement>("[data-object-move]")!.disabled =
      !item || !!item.reservedBy || item.location.kind !== "ground";
    element.querySelector<HTMLButtonElement>("[data-object-pack]")!.disabled =
      !item?.installed || !!item.reservedBy;
    element.querySelector<HTMLButtonElement>("[data-object-locate]")!.disabled =
      !position;
    element.querySelector<HTMLButtonElement>("[data-object-cancel]")!.disabled =
      order?.phase !== "pickup";
    quantity.disabled = !item || !OBJECT_DEFINITIONS[item.kind].stackable;
    quantity.max = String(item?.quantity ?? 1);
    orientation.disabled = !item || OBJECT_DEFINITIONS[item.kind].stackable;
  }
  render(current);
  return {
    element,
    render,
    select(
      id: string,
      snapshot: ControllerSnapshot,
      view: MapPerspective = "world",
    ) {
      current = snapshot;
      perspective = view;
      choose(id);
    },
  };
}
