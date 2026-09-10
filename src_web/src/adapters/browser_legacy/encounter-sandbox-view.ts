import type {
  ControllerSnapshot,
  GameController,
} from "../../application/legacy/controller";
import type { TacticalCode } from "../../simulation_legacy/combat";
import type { PlacementRequest } from "./placement";

const messages: Record<TacticalCode, string> = {
  accepted: "Sandbox encounter created.",
  busy: "Requires two or three drafted responders, no incapacitated staff, no active encounter, and no participant executing a player routine.",
  "invalid-order":
    "Choose a clear floor tile without a person or installed object.",
  unreachable: "Choose a reachable clear floor tile.",
  "not-found": "The requested encounter location is unavailable.",
  "not-drafted": "Draft the response team before creating an encounter.",
  incapacitated:
    "Resolve incapacitated responders before creating an encounter.",
};

export function createEncounterSandboxWindow(
  host: HTMLElement,
  controller: GameController,
  begin: (request: PlacementRequest) => string | null,
) {
  const element = document.createElement("section");
  element.id = "encounter-sandbox-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Encounter Sandbox");
  element.innerHTML =
    '<div class="title-bar"><div class="title-bar-text">Encounter Sandbox</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body"><fieldset><legend>Sandbox Encounter Creation</legend><p data-encounter-status></p><button type="button" data-encounter-place>Place 049-2</button></fieldset><p role="status" data-encounter-feedback></p></div><div class="resize-grip" aria-hidden="true"></div>';
  host.append(element);
  const place = element.querySelector<HTMLButtonElement>(
    "[data-encounter-place]",
  )!;
  const feedback = element.querySelector<HTMLElement>(
    "[data-encounter-feedback]",
  )!;
  function render(snapshot: ControllerSnapshot) {
    element.querySelector("[data-encounter-status]")!.textContent =
      `Encounter: ${snapshot.game.combat.status}`;
    place.disabled = snapshot.game.combat.status === "active";
    place.title = place.disabled
      ? "Resolve the active encounter before creating another."
      : "Choose a sandbox encounter location on the World map.";
  }
  place.addEventListener("click", () => {
    const snapshot = controller.getSnapshot();
    render(snapshot);
    if (place.disabled) return;
    const mapId = snapshot.game.world.map.id;
    feedback.textContent =
      begin({
        label: "Sandbox: place 049-2",
        origin: { x: 72, y: 55 },
        footprint: (position) => [{ position }],
        validate: (position) => {
          if (controller.getSnapshot().game.world.map.id !== mapId)
            return "The sandbox map has changed.";
          const code = controller.previewEncounter(position);
          return code === "accepted" ? null : messages[code];
        },
        confirm: (position) => {
          if (controller.getSnapshot().game.world.map.id !== mapId)
            return {
              accepted: false,
              message: "The sandbox map has changed.",
              snapshot: controller.getSnapshot(),
            };
          const result = controller.startEncounter(position);
          render(result.snapshot);
          feedback.textContent = messages[result.code];
          return {
            accepted: result.code === "accepted",
            message: messages[result.code],
            snapshot: result.snapshot,
          };
        },
      }) ?? "";
  });
  render(controller.getSnapshot());
  return { element, render };
}
