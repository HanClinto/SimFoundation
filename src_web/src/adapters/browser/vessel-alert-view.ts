import type { GameState } from "../../simulation/state";
import { VESSEL_WARNING_INTEGRITY } from "../../simulation/facility-incidents";

export function createVesselAlerts(
  host: HTMLElement,
  inspect: (id: string) => void,
) {
  const rows = new Map<string, { element: HTMLElement; text: HTMLElement }>();
  const empty = document.createElement("p");
  empty.textContent = "No recorded vessel condition warnings.";
  host.append(empty);
  return {
    render(state: GameState) {
      const warnings = Object.values(state.observations.objects).filter(
        ({ object }) =>
          object.kind === "vessel" &&
          object.location.kind !== "consumed" &&
          (object.condition === 0 ||
            (object.vessel?.sealed &&
              object.condition <= VESSEL_WARNING_INTEGRITY)),
      );
      const ids = new Set(warnings.map(({ object }) => object.id));
      for (const [id, row] of rows)
        if (!ids.has(id)) {
          row.element.remove();
          rows.delete(id);
        }
      empty.hidden = warnings.length > 0;
      for (const { object, observedTick } of warnings) {
        let row = rows.get(object.id);
        if (!row) {
          const element = document.createElement("div");
          const text = document.createElement("p");
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "Inspect vessel";
          button.setAttribute("aria-label", `Inspect ${object.id}`);
          button.addEventListener("click", () => inspect(object.id));
          element.append(text, button);
          host.append(element);
          row = { element, text };
          rows.set(object.id, row);
        }
        row.text.textContent = `${object.id}: ${object.condition === 0 ? "Breached case" : `Sealed case at ${object.condition.toFixed(2)}%`} / ${state.tick === observedTick ? "Current observation" : `Last observed ${state.tick - observedTick} minutes ago`}`;
      }
    },
  };
}
