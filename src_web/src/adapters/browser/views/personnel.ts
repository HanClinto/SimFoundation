import type { ViewContext } from "./context";
import { healthStatus } from "../../../simulation/core/entity/pawn/Health";
import { iconButton, table, element } from "../desktop/dom";
import { entityArt } from "../map/art";
import workerIcon from "../../browser_shared/assets/site-worker.svg";

export function personnelView(context: ViewContext): HTMLElement {
  const root = element("div", "personnel-view");
  root.append(element("h3", "", context.site.name));
  root.append(
    table(
      ["Personnel", "Condition", "Current work"],
      Object.values(context.site.entities)
        .filter((entity) => entity.kind === "pawn" && entity.playerControllable)
        .map((entity) => [
          iconButton(entity.name, entityArt(entity) ?? workerIcon, () => {
            context.control(entity.id);
            context.inspect(entity.id);
          }),
          entity.kind === "pawn" ? healthStatus(entity) : "",
          entity.kind === "pawn"
            ? (entity.queue[0]?.action.kind ?? "Idle")
            : "",
        ]),
    ),
  );
  root.append(
    element(
      "p",
      "",
      "Select a name to control and inspect that person. Choosing someone does not change their queued work.",
    ),
  );
  return root;
}
