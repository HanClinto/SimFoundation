import type { GameState } from "../../simulation/state";
import type { ConstructionCode } from "../../simulation/construction";

export const constructionMessages: Record<ConstructionCode, string> = {
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
