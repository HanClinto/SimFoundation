import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import {
  ELECTRICAL,
  isElectrical,
  powerNetwork,
  type ElectricalKind,
} from "../../simulation/power";
import { OBJECT_DEFINITIONS, objectPosition } from "../../simulation/objects";
import type { TilePosition } from "../../simulation/world";
import type { PlacementRequest } from "./placement";
import type { MapPerspective } from "./map-settings";
import { observedSnapshot } from "./observed-view";

export function createPowerWindow(
  host: HTMLElement,
  controller: GameController,
  begin: (request: PlacementRequest) => void,
  locate: (position: TilePosition) => void,
  move: (id: string, snapshot: ControllerSnapshot) => void,
) {
  const element = document.createElement("section");
  element.id = "power-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Power and lighting");
  element.innerHTML =
    '<div class="title-bar"><div class="title-bar-text">Power and Lighting</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body construction-body"><p data-power-summary></p><fieldset><legend>Installation</legend><div class="field-row"><label for="power-kind">Equipment</label><select id="power-kind"><option value="light">Light fixture</option><option value="cable">Power cable</option><option value="generator">Generator</option></select><button type="button" data-power-place>Place spare</button></div><p data-power-stock></p></fieldset><div class="field-row"><label for="power-device">Device</label><select id="power-device"></select></div><dl class="trial-readings" data-power-readings></dl><div class="field-row"><input type="checkbox" id="power-enabled"/><label for="power-enabled">Enabled</label></div><div class="dossier-actions"><button type="button" data-power-locate>Locate</button><button type="button" data-power-move>Move / install</button><button type="button" data-power-pack>Pack in place</button><button type="button" data-power-repair>Repair</button><button type="button" data-power-cancel>Cancel repair</button></div><p data-power-repair-reason></p><p role="status" data-power-feedback></p><div class="planner-roster-scroll"><table class="data-table" aria-label="Power circuits"><thead><tr><th>Circuit</th><th>Supply</th><th>Demand</th><th>Status</th></tr></thead><tbody></tbody></table></div></div><div class="resize-grip" aria-hidden="true"></div>';
  host.append(element);
  const choice = element.querySelector<HTMLSelectElement>("#power-device")!;
  const kind = element.querySelector<HTMLSelectElement>("#power-kind")!;
  const enabled = element.querySelector<HTMLInputElement>("#power-enabled")!;
  const feedback = element.querySelector<HTMLElement>("[data-power-feedback]")!;
  let current = controller.getSnapshot();
  let selected: string | null = "generator-main";
  let perspective: MapPerspective = "world";
  let signature = "";
  const displayed = () =>
    perspective === "recorded" ? observedSnapshot(current).game : current.game;
  const item = () =>
    displayed().objects.items.find((item) => item.id === selected);
  const spare = () =>
    current.game.objects.items.find(
      (item) =>
        item.kind === kind.value &&
        !item.installed &&
        !item.reservedBy &&
        item.condition > 0 &&
        item.location.kind === "ground",
    );
  choice.addEventListener("change", () => {
    selected = choice.value || null;
    feedback.textContent = "";
    render(current);
  });
  kind.addEventListener("change", () => render(current));
  enabled.addEventListener("change", () => {
    if (selected && perspective === "world")
      render(controller.setUtilityEnabled(selected, enabled.checked));
  });
  element.querySelector("[data-power-place]")!.addEventListener("click", () => {
    const equipment = spare();
    if (!equipment || perspective !== "world") return;
    begin({
      label: `Install ${OBJECT_DEFINITIONS[equipment.kind].name.toLowerCase()}`,
      origin: { x: 73, y: 66 },
      footprint: (position) => [{ position }],
      validate: (position) =>
        controller.previewObjectMove(equipment.id, position, "north", true),
      confirm: (position) => {
        const result = controller.orderObjectMove(
          equipment.id,
          position,
          "north",
          true,
        );
        if (result.code === "accepted") selected = equipment.id;
        render(result.snapshot);
        return {
          accepted: result.code === "accepted",
          message:
            result.code === "accepted"
              ? "Hauling and installation queued."
              : `Installation unavailable: ${result.code}.`,
          snapshot: result.snapshot,
        };
      },
    });
  });
  element
    .querySelector("[data-power-locate]")!
    .addEventListener("click", () => {
      const equipment = item();
      const position = equipment
        ? objectPosition(
            equipment,
            displayed().world.positions,
            displayed().objects,
          )
        : null;
      if (position) locate(position);
    });
  element.querySelector("[data-power-move]")!.addEventListener("click", () => {
    if (selected && perspective === "world") move(selected, current);
  });
  element.querySelector("[data-power-pack]")!.addEventListener("click", () => {
    const equipment = item();
    if (
      !equipment ||
      equipment.location.kind !== "ground" ||
      perspective !== "world"
    )
      return;
    const result = controller.orderObjectMove(
      equipment.id,
      equipment.location.position,
      equipment.orientation,
      false,
    );
    render(result.snapshot);
    feedback.textContent =
      result.code === "accepted"
        ? "Packing queued; service ends when equipment is picked up."
        : `Packing unavailable: ${result.code}.`;
  });
  element
    .querySelector("[data-power-repair]")!
    .addEventListener("click", () => {
      if (!selected || perspective !== "world") return;
      const result = controller.repairUtility(selected);
      render(result.snapshot);
      feedback.textContent =
        result.code === "accepted"
          ? "Repair materials reserved; delivery and engineering queued."
          : `Repair unavailable: ${result.code}.`;
    });
  element
    .querySelector("[data-power-cancel]")!
    .addEventListener("click", () => {
      const order = current.game.vesselWork.orders.find(
        (order) =>
          order.vesselId === selected &&
          order.action === "repair" &&
          ["collecting", "working"].includes(order.phase),
      );
      if (order && perspective === "world")
        render(controller.cancelVesselWork(order.id));
    });
  function render(snapshot: ControllerSnapshot) {
    current = snapshot;
    const state = displayed();
    const items = state.objects.items
      .filter(isElectrical)
      .filter((item) => item.location.kind !== "consumed");
    const next = JSON.stringify(items.map((item) => [item.id, item.installed]));
    if (signature !== next) {
      choice.replaceChildren(
        new Option("Select device", ""),
        ...items.map(
          (item) =>
            new Option(
              `${OBJECT_DEFINITIONS[item.kind].name} / ${item.id}${item.installed ? "" : " / packed"}`,
              item.id,
            ),
        ),
      );
      signature = next;
    }
    choice.value = selected ?? "";
    const equipment = item();
    const network = perspective === "world" ? powerNetwork(state) : null;
    const reading = selected ? network?.readings[selected] : null;
    const order = state.vesselWork.orders.find(
      (order) =>
        order.vesselId === selected &&
        order.action === "repair" &&
        !["completed", "cancelled"].includes(order.phase),
    );
    const job = state.jobs.find((job) => job.id === order?.jobId);
    element.querySelector("[data-power-summary]")!.textContent = network
      ? `World / ${network.circuits.length} circuits / ${Object.values(network.readings).filter((reading) => ["disconnected", "overloaded", "damaged"].includes(reading.status)).length} devices without service`
      : "Recorded equipment / current circuit and lighting state unavailable";
    const rows = equipment
      ? [
          ["Service", reading?.status ?? "Not recorded"],
          [
            "Condition",
            `${equipment.condition.toFixed(0)}%${perspective === "recorded" ? ` / observed ${state.tick - (state.observations.objects[equipment.id]?.observedTick ?? 0)} minutes ago` : ""}`,
          ],
          ["Circuit", reading?.circuit ?? "No live reading"],
          [
            "Supply / demand",
            reading
              ? `${reading.supply} / ${reading.demand} units`
              : "Not recorded",
          ],
          [
            "Work",
            order
              ? `${order.phase} / ${job?.progress ?? 0} of ${job?.requiredProgress ?? 0} / ${order.blockedReason ?? job?.assignmentReason ?? "Queued"}`
              : "No repair order",
          ],
        ]
      : [["Selection", "No device selected"]];
    element.querySelector("[data-power-readings]")!.replaceChildren(
      ...rows.flatMap(([label, value]) => {
        const term = document.createElement("dt");
        term.textContent = label!;
        const description = document.createElement("dd");
        description.textContent = value!;
        return [term, description];
      }),
    );
    enabled.checked = equipment?.utilityEnabled !== false;
    enabled.disabled =
      perspective !== "world" ||
      !equipment?.installed ||
      equipment.location.kind !== "ground" ||
      !!equipment.reservedBy;
    const repairReason =
      perspective !== "world"
        ? "Switch to World view for service controls."
        : !equipment
          ? "Select a device."
          : equipment.location.kind !== "ground"
            ? "Equipment must be on the ground."
            : equipment.reservedBy
              ? "Equipment is reserved for work."
              : equipment.condition >= 100
                ? "Equipment is undamaged."
                : current.game.construction.availableMaterials < 8
                  ? "Repair requires 8 available materials."
                  : "Repair service kit: 8 materials.";
    const button = (attribute: string) =>
      element.querySelector<HTMLButtonElement>(`[${attribute}]`)!;
    button("data-power-repair").disabled =
      perspective !== "world" ||
      !equipment ||
      equipment.location.kind !== "ground" ||
      !!equipment.reservedBy ||
      equipment.condition >= 100 ||
      current.game.construction.availableMaterials <
        ELECTRICAL[equipment.kind as ElectricalKind].repairCost;
    element.querySelector("[data-power-repair-reason]")!.textContent =
      repairReason;
    button("data-power-cancel").disabled =
      perspective !== "world" ||
      !order ||
      !["collecting", "working"].includes(order.phase);
    button("data-power-move").disabled =
      perspective !== "world" ||
      !equipment ||
      equipment.location.kind !== "ground" ||
      !!equipment.reservedBy;
    button("data-power-pack").disabled =
      button("data-power-move").disabled || !equipment?.installed;
    button("data-power-locate").disabled =
      !equipment ||
      !objectPosition(equipment, state.world.positions, state.objects);
    button("data-power-place").disabled = perspective !== "world" || !spare();
    element.querySelector("[data-power-stock]")!.textContent =
      perspective === "world"
        ? `${current.game.objects.items.filter((item) => item.kind === kind.value && !item.installed && !item.reservedBy && item.condition > 0 && item.location.kind === "ground").length} usable spare(s)`
        : "Spare availability not recorded";
    element.querySelector("tbody")!.replaceChildren(
      ...(network?.circuits ?? []).map((circuit) => {
        const row = document.createElement("tr");
        for (const value of [
          circuit.id,
          String(circuit.supply),
          String(circuit.demand),
          circuit.supply === 0
            ? "No supply"
            : circuit.demand > circuit.supply
              ? "Overloaded"
              : "Online",
        ]) {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        }
        return row;
      }),
    );
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
      selected = id;
      perspective = view;
      render(snapshot);
    },
  };
}
