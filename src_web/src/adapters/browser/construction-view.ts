import type { GameState } from "../../simulation/state";
import {
  availableResearchLaboratories,
  type ConstructionCode,
} from "../../simulation/construction";
import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import type { TilePosition } from "../../simulation/world";

export const constructionMessages: Record<ConstructionCode, string> = {
  "laboratory-selected":
    "Research laboratory updated for newly authorized work.",
  "not-commissioned": "Research requires a commissioned laboratory.",
  placed: "Annex authorized. 40 material units reserved.",
  cancelled: "Annex cancelled. Reserved materials released.",
  "out-of-bounds": "The annex footprint or entrance lies outside the region.",
  overlap: "The footprint or entrance conflicts with existing space.",
  occupied: "Personnel must leave the footprint before authorization.",
  "insufficient-materials":
    "40 material units are required. Insufficient stock.",
  unreachable: "Materials cannot reach the annex entrance.",
  "limit-reached": "The construction register is full.",
  "not-found": "The construction order is no longer available.",
  "already-started":
    "Materials have been dispatched; cancellation is unavailable.",
};

export function createConstructionWindow(
  host: HTMLElement,
  controller: GameController,
  plan: () => void,
  locate: (position: TilePosition) => void,
) {
  const element = document.createElement("section");
  element.id = "construction-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Site 828 construction");
  element.innerHTML = `<div class="title-bar"><div class="title-bar-text">Site 828 - Construction</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body construction-body"><header class="clinical-policy-heading"><h2>Construction Register</h2><p data-construction-stock></p></header><div class="planner-toolbar"><button type="button" data-plan-laboratory>Plan laboratory annex</button><label class="research-laboratory-choice">Research laboratory <select data-research-laboratory aria-label="Research laboratory"></select></label></div><div class="construction-table-scroll"><table class="data-table" aria-label="Laboratory annexes"><thead><tr><th>Annex</th><th>Status</th><th>Orders</th></tr></thead><tbody data-construction-register></tbody></table></div><p data-construction-command-status role="status"></p></div><div class="resize-grip" aria-hidden="true"></div>`;
  host.append(element);
  const laboratory = element.querySelector<HTMLSelectElement>(
    "[data-research-laboratory]",
  )!;
  const register = element.querySelector<HTMLElement>(
    "[data-construction-register]",
  )!;
  const feedback = element.querySelector<HTMLElement>(
    "[data-construction-command-status]",
  )!;
  let current = controller.getSnapshot();
  let signature = "";
  let laboratorySignature = "";
  element
    .querySelector("[data-plan-laboratory]")!
    .addEventListener("click", plan);
  laboratory.addEventListener("change", () => {
    const result = controller.setResearchLaboratory(laboratory.value);
    feedback.textContent = constructionMessages[result.code];
    render(result.snapshot);
  });
  element.addEventListener("click", (event) => {
    const target = (event.target as Element).closest<HTMLElement>(
      "[data-focus-blueprint], [data-cancel-blueprint]",
    );
    const blueprint = current.game.construction.blueprints.find(
      ({ id }) => id === target?.dataset.focusBlueprint,
    );
    if (blueprint)
      locate({ x: blueprint.origin.x + 4, y: blueprint.origin.y + 3 });
    if (target?.dataset.cancelBlueprint) {
      const result = controller.cancelLaboratory(
        target.dataset.cancelBlueprint,
      );
      feedback.textContent = constructionMessages[result.code];
      render(result.snapshot);
    }
  });
  function render(snapshot: ControllerSnapshot) {
    current = snapshot;
    element.querySelector("[data-construction-stock]")!.textContent =
      `${snapshot.game.construction.availableMaterials} material units available / 40 per annex`;
    const laboratories = availableResearchLaboratories(snapshot.game);
    const nextLaboratorySignature = JSON.stringify(
      laboratories.map(({ id, name }) => [id, name]),
    );
    if (nextLaboratorySignature !== laboratorySignature) {
      laboratory.replaceChildren(
        ...laboratories.map((room) => new Option(room.name, room.id)),
      );
      laboratorySignature = nextLaboratorySignature;
    }
    laboratory.value = snapshot.game.construction.researchLaboratoryId;
    const nextSignature = JSON.stringify([
      snapshot.game.construction,
      snapshot.game.jobs.map(({ id, status, assignmentReason }) => [
        id,
        status,
        assignmentReason,
      ]),
    ]);
    if (signature !== nextSignature) {
      updateConstructionRegister(register, snapshot.game);
      signature = nextSignature;
    }
  }
  render(current);
  return { element, render };
}

export function updateConstructionRegister(
  container: HTMLElement,
  state: GameState,
): void {
  const rows = state.construction.blueprints.map((blueprint, index) => {
    const row = document.createElement("tr");
    row.dataset.blueprintId = blueprint.id;
    const label = document.createElement("td");
    label.textContent = `Laboratory ${index + 1}`;
    const status = document.createElement("td");
    const commissioning = state.jobs.find(
      ({ id }) => id === blueprint.commissionJobId,
    );
    const activeJobId =
      blueprint.status === "building"
        ? blueprint.buildJobId
        : blueprint.haulJobId;
    const activeJob = state.jobs.find(({ id }) => id === activeJobId);
    const statuses = {
      reserved: "Awaiting collection",
      hauling: "Materials in transit",
      building: "Engineering assembly",
      completed:
        commissioning?.status === "completed"
          ? "Commissioned"
          : "Commissioning",
      cancelled: "Cancelled",
    };
    status.textContent =
      blueprint.blockedReason ??
      (activeJob?.status === "available" && activeJob.assignmentReason
        ? activeJob.assignmentReason
        : statuses[blueprint.status]);
    const actions = document.createElement("td");
    const focus = document.createElement("button");
    focus.type = "button";
    focus.textContent = "Locate";
    focus.dataset.focusBlueprint = blueprint.id;
    focus.setAttribute("aria-label", `Locate laboratory ${index + 1}`);
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.dataset.cancelBlueprint = blueprint.id;
    cancel.disabled = blueprint.status !== "reserved";
    cancel.setAttribute("aria-label", `Cancel laboratory ${index + 1}`);
    cancel.title = cancel.disabled
      ? "Cancellation is available before materials leave storage."
      : "Release the material reservation and cancel this annex.";
    actions.append(focus, cancel);
    row.append(label, status, actions);
    return row;
  });
  if (rows.length === 0) {
    const row = document.createElement("tr");
    const empty = document.createElement("td");
    empty.colSpan = 3;
    empty.textContent = "No annexes authorized.";
    row.append(empty);
    rows.push(row);
  }
  container.replaceChildren(...rows);
}
