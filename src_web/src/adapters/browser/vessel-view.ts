import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import { MATERIALS, type MaterialId } from "../../simulation/materials";
import { OBJECT_DEFINITIONS, objectPosition } from "../../simulation/objects";
import {
  activeVesselOrder,
  vesselCost,
  type VesselCommandCode,
} from "../../simulation/vessel-work";
import { vesselWearRate } from "../../simulation/vessels";
import type { TilePosition } from "../../simulation/world";
import type { PlacementRequest } from "./placement";

const messages: Record<VesselCommandCode, string> = {
  accepted: "Vessel work scheduled.",
  "not-found": "Choose an available vessel on the ground.",
  busy: "The vessel or work tile is reserved, or this state is already set.",
  "invalid-position":
    "Choose clear interior flooring outside storage and existing objects.",
  "invalid-cargo":
    "Choose one packed individual object; no stacks or nested vessels. Transit duration must be 30 to 1440 minutes.",
  sealed: "Open the vessel before loading or unloading.",
  damaged:
    "Dispatch and sealing require an intact case; dispatch also requires a closed seal.",
  "insufficient-materials": "Insufficient unreserved building materials.",
  unreachable:
    "Stage cargo beside the vessel and keep a reachable work face clear.",
};

export function createVesselWindow(
  host: HTMLElement,
  controller: GameController,
  begin: (request: PlacementRequest) => void,
  locate: (position: TilePosition) => void,
  openObject: (id: string) => void,
) {
  const element = document.createElement("section");
  element.id = "vessel-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Vessels and transport");
  element.innerHTML = `<div class="title-bar"><div class="title-bar-text">Vessels and Transport</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body construction-body"><fieldset><legend>Fabrication</legend><div class="field-row"><label for="vessel-material">Case material</label><select id="vessel-material">${Object.entries(
    MATERIALS,
  )
    .map(
      ([id, material]) =>
        `<option value="${id}">${material.name} (${vesselCost(id as MaterialId)} units)</option>`,
    )
    .join(
      "",
    )}</select></div><button type="button" data-vessel-craft>Choose fabrication tile</button></fieldset><div class="field-row"><label for="vessel-choice">Vessel</label><select id="vessel-choice"></select></div><dl class="trial-readings" data-vessel-record></dl><fieldset><legend>Handling</legend><div class="field-row"><label for="vessel-cargo">Packed cargo</label><select id="vessel-cargo"></select></div><div class="dossier-actions"><button type="button" data-vessel-load>Load cargo</button><button type="button" data-vessel-seal>Seal vessel</button><button type="button" data-vessel-unload>Choose unload tile</button><button type="button" data-vessel-object>Open object</button><button type="button" data-vessel-locate>Locate</button></div><p data-vessel-availability></p></fieldset><fieldset><legend>Transport service</legend><div class="field-row"><label for="vessel-mode">Service</label><select id="vessel-mode"><option value="helicopter">Helicopter</option><option value="truck">Truck</option></select><label for="vessel-duration">Transit minutes</label><input id="vessel-duration" type="number" min="30" max="1440" step="1" value="120"/></div><button type="button" data-vessel-transport>Choose deposit tile</button></fieldset><fieldset><legend>Work and shipments</legend><div data-vessel-orders></div></fieldset><p role="status" data-vessel-feedback></p></div><div class="resize-grip" aria-hidden="true"></div>`;
  host.append(element);
  const choice = element.querySelector<HTMLSelectElement>("#vessel-choice")!;
  const cargo = element.querySelector<HTMLSelectElement>("#vessel-cargo")!;
  const material =
    element.querySelector<HTMLSelectElement>("#vessel-material")!;
  const feedback = element.querySelector<HTMLElement>(
    "[data-vessel-feedback]",
  )!;
  let current = controller.getSnapshot();
  let selected = "";
  let signature = "";
  let cargoSignature = "";
  const vessel = () =>
    current.game.objects.items.find((item) => item.id === selected);
  const resultMessage = (result: {
    code: VesselCommandCode;
    snapshot: ControllerSnapshot;
  }) => {
    render(result.snapshot);
    feedback.textContent = messages[result.code];
  };
  choice.addEventListener("change", () => {
    selected = choice.value;
    render(current);
  });
  cargo.addEventListener("change", () => render(current));
  element
    .querySelector("[data-vessel-craft]")!
    .addEventListener("click", () => {
      const chosen = material.value as MaterialId;
      begin({
        label: `Fabricate ${MATERIALS[chosen].name} vessel / ${vesselCost(chosen)} materials`,
        origin: { x: 66, y: 65 },
        footprint: (position) => [{ position }],
        validate: (position) => {
          const issue = controller.previewVesselCraft(position, chosen);
          return issue ? messages[issue] : null;
        },
        confirm: (position) => {
          const result = controller.craftVessel(position, chosen);
          resultMessage(result);
          return {
            accepted: result.code === "accepted",
            message: messages[result.code],
            snapshot: result.snapshot,
          };
        },
      });
    });
  element
    .querySelector("[data-vessel-load]")!
    .addEventListener("click", () =>
      resultMessage(
        controller.orderVesselAction(selected, "load", cargo.value),
      ),
    );
  element
    .querySelector("[data-vessel-seal]")!
    .addEventListener("click", () =>
      resultMessage(
        controller.orderVesselAction(
          selected,
          vessel()?.vessel?.sealed ? "open" : "seal",
        ),
      ),
    );
  for (const action of ["unload", "transport"] as const)
    element
      .querySelector(`[data-vessel-${action}]`)!
      .addEventListener("click", () => {
        const item = vessel();
        if (!item) return;
        const id = selected;
        const position = objectPosition(
          item,
          current.game.world.positions,
          current.game.objects,
        );
        if (!position) return;
        const transport =
          action === "transport"
            ? {
                mode: element.querySelector<HTMLSelectElement>("#vessel-mode")!
                  .value as "helicopter" | "truck",
                duration: Number(
                  element.querySelector<HTMLInputElement>("#vessel-duration")!
                    .value,
                ),
              }
            : undefined;
        begin({
          label:
            action === "transport"
              ? `${transport!.mode} deposit / ${transport!.duration} minutes / ${id}`
              : `Unload ${id}`,
          origin:
            action === "transport"
              ? { x: 62, y: 62 }
              : { x: position.x - 1, y: position.y },
          footprint: (position) => [{ position }],
          validate: (position) => {
            const issue = controller.previewVesselAction(
              id,
              action,
              undefined,
              position,
              transport,
            );
            return issue ? messages[issue] : null;
          },
          confirm: (position) => {
            const result = controller.orderVesselAction(
              id,
              action,
              undefined,
              position,
              transport,
            );
            resultMessage(result);
            return {
              accepted: result.code === "accepted",
              message: messages[result.code],
              snapshot: result.snapshot,
            };
          },
        });
      });
  element
    .querySelector("[data-vessel-object]")!
    .addEventListener("click", () => {
      if (selected) openObject(selected);
    });
  element
    .querySelector("[data-vessel-locate]")!
    .addEventListener("click", () => {
      const item = vessel();
      const position = item
        ? objectPosition(
            item,
            current.game.world.positions,
            current.game.objects,
          )
        : null;
      if (position) locate(position);
    });
  element
    .querySelector("[data-vessel-orders]")!
    .addEventListener("click", (event) => {
      const id = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-cancel-vessel]",
      )?.dataset.cancelVessel;
      if (id) render(controller.cancelVesselWork(id));
    });
  function render(snapshot: ControllerSnapshot) {
    current = snapshot;
    const vessels = snapshot.game.objects.items.filter(
      (item) => item.kind === "vessel" && item.location.kind !== "consumed",
    );
    const next = JSON.stringify(vessels.map((item) => item.id));
    if (next !== signature) {
      choice.replaceChildren(
        new Option("Choose vessel", ""),
        ...vessels.map(
          (item) =>
            new Option(
              `${item.id} / ${MATERIALS[item.vessel!.material].name}`,
              item.id,
            ),
        ),
      );
      signature = next;
      if (!selected && vessels.length) selected = vessels.at(-1)!.id;
    }
    choice.value = selected;
    const candidates = snapshot.game.objects.items.filter(
      (item) =>
        item.location.kind === "ground" &&
        !item.installed &&
        !item.reservedBy &&
        item.kind !== "vessel" &&
        !OBJECT_DEFINITIONS[item.kind].stackable,
    );
    const nextCargo = JSON.stringify(candidates.map((item) => item.id));
    if (nextCargo !== cargoSignature) {
      const value = cargo.value;
      cargo.replaceChildren(
        new Option("Choose packed object", ""),
        ...candidates.map(
          (item) =>
            new Option(
              `${OBJECT_DEFINITIONS[item.kind].name} / ${item.id}`,
              item.id,
            ),
        ),
      );
      cargo.value = candidates.some((item) => item.id === value) ? value : "";
      cargoSignature = nextCargo;
    }
    const item = vessel();
    const content = snapshot.game.objects.items.find(
      (object) =>
        object.location.kind === "contained" &&
        object.location.vesselId === selected,
    );
    const position = item
      ? objectPosition(
          item,
          snapshot.game.world.positions,
          snapshot.game.objects,
        )
      : null;
    const wear = item ? vesselWearRate(snapshot.game, item) : 0;
    const work = snapshot.game.vesselWork.orders.find(
      (order) => activeVesselOrder(order) && order.vesselId === selected,
    );
    const rows = item
      ? [
          [
            "Case",
            `${MATERIALS[item.vessel!.material].name} / ${item.condition.toFixed(2)}%`,
          ],
          [
            "Seal",
            item.condition <= 0
              ? "Breached"
              : item.vessel!.sealed
                ? "Sealed"
                : "Open",
          ],
          [
            "Contents",
            content
              ? `${OBJECT_DEFINITIONS[content.kind].name} / ${content.id}`
              : "Empty",
          ],
          [
            "Location",
            position ? `${position.x}, ${position.y}` : "In transport",
          ],
          ["Wear / minute", `${wear.toFixed(4)} integrity`],
          [
            "Estimated remaining life",
            wear > 0
              ? `${Math.floor(item.condition / wear)} minutes at current emission`
              : item.condition <= 0
                ? "Breached"
                : "No current internal wear",
          ],
          [
            "Work",
            work
              ? `${work.action} / ${work.phase}${work.transport?.arrivesAt != null ? ` / ${Math.max(0, work.transport.arrivesAt - snapshot.game.tick)} minutes to deposit` : ""}${work.blockedReason ? ` / ${work.blockedReason}` : ""}`
              : "Available",
          ],
        ]
      : [["Selection", "No fabricated vessel selected"]];
    element.querySelector("[data-vessel-record]")!.replaceChildren(
      ...rows.map(([label, value]) => {
        const row = document.createElement("div");
        const term = document.createElement("dt");
        const detail = document.createElement("dd");
        term.textContent = label!;
        detail.textContent = value!;
        row.append(term, detail);
        return row;
      }),
    );
    const loadIssue = item
      ? controller.previewVesselAction(selected, "load", cargo.value)
      : "not-found";
    const sealIssue = item
      ? controller.previewVesselAction(
          selected,
          item.vessel?.sealed ? "open" : "seal",
        )
      : "not-found";
    const load =
      element.querySelector<HTMLButtonElement>("[data-vessel-load]")!;
    load.disabled = !!loadIssue;
    load.title = loadIssue ? messages[loadIssue] : "Schedule physical loading";
    element.querySelector("[data-vessel-availability]")!.textContent = loadIssue
      ? messages[loadIssue]
      : "";
    const seal =
      element.querySelector<HTMLButtonElement>("[data-vessel-seal]")!;
    seal.disabled = !!sealIssue;
    seal.textContent = item?.vessel?.sealed ? "Open vessel" : "Seal vessel";
    seal.title = sealIssue ? messages[sealIssue] : "Schedule seal handling";
    element.querySelector<HTMLButtonElement>("[data-vessel-unload]")!.disabled =
      !content || !position || !!item?.reservedBy || !!item?.vessel?.sealed;
    element.querySelector<HTMLButtonElement>(
      "[data-vessel-transport]",
    )!.disabled =
      !item ||
      !position ||
      !!item.reservedBy ||
      !item.vessel?.sealed ||
      item.condition <= 0;
    element.querySelector<HTMLButtonElement>("[data-vessel-object]")!.disabled =
      !item;
    element.querySelector<HTMLButtonElement>("[data-vessel-locate]")!.disabled =
      !position;
    element.querySelector("[data-vessel-orders]")!.replaceChildren(
      ...snapshot.game.vesselWork.orders
        .filter(activeVesselOrder)
        .map((order) => {
          const row = document.createElement("div");
          const text = document.createElement("p");
          text.textContent = `${order.vesselId}: ${order.action} / ${order.phase}${order.blockedReason ? ` / ${order.blockedReason}` : ""}`;
          const cancel = document.createElement("button");
          cancel.type = "button";
          cancel.textContent = "Cancel work";
          cancel.dataset.cancelVessel = order.id;
          cancel.disabled =
            order.phase === "delivering" || order.phase === "transit";
          cancel.title = cancel.disabled
            ? "Wait for physical delivery; dispatched transport cannot be cancelled."
            : "Release reservations and unused materials";
          row.append(text, cancel);
          return row;
        }),
    );
  }
  render(current);
  return {
    element,
    render,
    select(id: string, snapshot: ControllerSnapshot) {
      selected = id;
      render(snapshot);
    },
  };
}
