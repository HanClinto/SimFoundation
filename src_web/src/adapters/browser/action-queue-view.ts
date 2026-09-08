import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import type { ActionIntent } from "../../simulation/action-queue";
import { mapObjects } from "./map-objects";

export function actionIntentLabel(
  snapshot: ControllerSnapshot,
  intent: ActionIntent,
): string {
  const labels = {
    move: "Go Here",
    hold: "Hold Position",
    attack: "Attack",
    engage: "Engage From Here",
    stabilize: "Stabilize",
    recover: "Recover to Extraction",
  };
  const target = intent.destination
    ? `(${intent.destination.x}, ${intent.destination.y})`
    : (mapObjects(snapshot.game, "world").find(
        (object) => object.id === intent.targetId,
      )?.name ?? intent.targetId);
  return `${labels[intent.action]}${target ? `: ${target}` : ""}`;
}

export function createActionQueueView(
  strip: HTMLElement,
  controller: GameController,
  changed: (snapshot: ControllerSnapshot) => void,
) {
  const document = strip.ownerDocument;
  const root = document.createElement("details");
  root.className = "pawn-action-queue";
  root.hidden = true;
  const summary = document.createElement("summary");
  const current = document.createElement("p");
  const list = document.createElement("ol");
  list.setAttribute("aria-label", "Pending actions");
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Retry";
  const clear = document.createElement("button");
  clear.type = "button";
  clear.textContent = "Clear Pending";
  const controls = document.createElement("div");
  controls.append(retry, clear);
  root.append(summary, current, list, controls);
  strip.after(root);
  let actorId: string | null = null;
  let mapId = "";
  let signature = "";
  let enabled = false;
  const rows = new Map<number, HTMLLIElement>();
  function edit(operation: "retry" | "clear" | "remove", sequence?: number) {
    if (!actorId || !enabled) return;
    const result = controller.editQueue(mapId, actorId, operation, sequence);
    changed(result.snapshot);
    if (result.reason) current.textContent = result.reason;
  }
  retry.addEventListener("click", () => edit("retry"));
  clear.addEventListener("click", () => edit("clear"));
  return {
    render(
      snapshot: ControllerSnapshot,
      id: string | null,
      world: boolean,
      placement: boolean,
    ) {
      const identity = `${snapshot.game.world.map.id}/${id}`;
      if (signature !== identity) {
        signature = identity;
        rows.clear();
        list.replaceChildren();
        root.open = false;
      }
      actorId = id;
      mapId = snapshot.game.world.map.id;
      enabled = world && !placement;
      const queue = id ? snapshot.game.actionQueues[id] : null;
      root.hidden = !world || !queue || queue.current.intent.mapId !== mapId;
      if (root.hidden || !queue) {
        root.open = false;
        rows.clear();
        list.replaceChildren();
        return;
      }
      summary.textContent = `Actions: 1 current, ${queue.pending.length} pending`;
      current.textContent = `${actionIntentLabel(snapshot, queue.current.intent)}${queue.current.blockedReason ? ` / ${queue.current.blockedReason}` : !queue.current.started ? " / Waiting for action recovery" : ""}`;
      retry.disabled =
        !enabled || queue.current.started || !queue.current.blockedReason;
      clear.disabled = !enabled || !queue.pending.length;
      for (const [sequence, row] of rows)
        if (!queue.pending.some((intent) => intent.sequence === sequence)) {
          row.remove();
          rows.delete(sequence);
        }
      for (const intent of queue.pending) {
        const sequence = intent.sequence!;
        let row = rows.get(sequence);
        if (!row) {
          row = document.createElement("li");
          const label = document.createElement("span");
          const cancel = document.createElement("button");
          cancel.type = "button";
          cancel.textContent = "X";
          cancel.addEventListener("click", () => edit("remove", sequence));
          row.append(label, cancel);
          rows.set(sequence, row);
          list.append(row);
        }
        const label = actionIntentLabel(snapshot, intent);
        row.querySelector("span")!.textContent = label;
        const cancel = row.querySelector("button")!;
        cancel.disabled = !enabled;
        cancel.title = `Cancel pending ${label}`;
        cancel.setAttribute("aria-label", cancel.title);
      }
    },
  };
}
