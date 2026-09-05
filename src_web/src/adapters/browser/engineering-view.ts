import type { ControllerSnapshot } from "../../application/controller";
import type { TilePosition } from "../../simulation/world";
import { engineeringRecord } from "./map-objects";

export function createEngineeringWindow(host: HTMLElement) {
  const element = document.createElement("section");
  element.id = "engineering-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Site 828 engineering inspector");
  element.innerHTML =
    '<div class="title-bar"><div class="title-bar-text">Engineering - Tile Record</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body construction-body"><h2>Tile Record</h2><dl class="trial-readings" data-tile-record></dl><button type="button" data-open-related-window="construction-window">Construction register</button></div><div class="resize-grip" aria-hidden="true"></div>';
  host.append(element);
  let position: TilePosition | null = null;
  function render(snapshot: ControllerSnapshot) {
    if (!position) return;
    element.querySelector("[data-tile-record]")!.replaceChildren(
      ...engineeringRecord(snapshot.game, position).map(([label, value]) => {
        const row = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        row.append(term, description);
        return row;
      }),
    );
  }
  return {
    element,
    render,
    select: (next: TilePosition, snapshot: ControllerSnapshot) => {
      position = next;
      render(snapshot);
    },
  };
}
