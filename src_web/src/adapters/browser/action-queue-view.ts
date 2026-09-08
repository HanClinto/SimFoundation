import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import type { ActionIntent } from "../../simulation/action-queue";
import { mapObjects } from "./map-objects";
import { targetThumbnail } from "./target-thumbnail";
import { automaticAction } from "../../simulation/person-actions";

const verbs = {
  move: "Go Here",
  hold: "Hold Position",
  attack: "Attack",
  engage: "Engage From Here",
  stabilize: "Stabilize",
  recover: "Recover to Extraction",
};

export function actionIntentLabel(
  snapshot: ControllerSnapshot,
  intent: ActionIntent,
): string {
  const target = intent.destination
    ? `(${intent.destination.x}, ${intent.destination.y})`
    : (mapObjects(snapshot.game, "world").find(
        (object) => object.id === intent.targetId,
      )?.name ?? intent.targetId);
  return `${verbs[intent.action]}${target ? `: ${target}` : ""}`;
}

export function createActionQueueView(
  strip: HTMLElement,
  controller: GameController,
  changed: (snapshot: ControllerSnapshot) => void,
) {
  const document = strip.ownerDocument;
  const root = document.createElement("section");
  root.className = "pawn-action-queue";
  root.setAttribute("aria-label", "Action queue");
  root.hidden = true;
  const current = document.createElement("p");
  current.setAttribute("role", "status");
  const tray = document.createElement("div");
  tray.className = "pawn-action-tray";
  const active = document.createElement("ol");
  active.className = "pawn-current-action";
  active.setAttribute("aria-label", "Current action");
  const list = document.createElement("ol");
  list.className = "pawn-pending-actions";
  list.setAttribute("aria-label", "Pending actions");
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Retry";
  const clear = document.createElement("button");
  clear.type = "button";
  clear.textContent = "Clear Pending";
  const controls = document.createElement("div");
  controls.className = "pawn-queue-controls";
  controls.append(current, retry, clear);
  tray.append(active, list);
  root.append(tray, controls);
  strip.after(root);
  let actorId: string | null = null;
  let mapId = "";
  let signature = "";
  let enabled = false;
  let snapshot: ControllerSnapshot;
  let dragging: { identity: string; sequence: number } | null = null;
  const rows = new Map<number, HTMLLIElement>();
  const automaticRow = document.createElement("li");
  automaticRow.dataset.current = "true";
  const automaticTile = document.createElement("div");
  automaticTile.className = "pawn-action-tile";
  automaticTile.setAttribute("role", "group");
  automaticTile.tabIndex = 0;
  const automaticImage = document.createElement("img");
  automaticImage.alt = "";
  const automaticLabel = document.createElement("span");
  const automaticSource = document.createElement("small");
  const automaticCancel = document.createElement("button");
  automaticCancel.type = "button";
  automaticCancel.className = "pawn-queued-cancel";
  automaticCancel.textContent = "X";
  automaticTile.append(
    automaticImage,
    automaticLabel,
    automaticSource,
    automaticCancel,
  );
  automaticRow.append(automaticTile);
  automaticCancel.addEventListener("click", () => {
    if (!actorId || !enabled || automaticCancel.disabled) return;
    const result = controller.cancelAutomatic(
      mapId,
      actorId,
      automaticTile.dataset.actionKey!,
    );
    changed(result.snapshot);
    if (result.reason) current.textContent = result.reason;
  });
  function edit(
    operation: "cancel" | "retry" | "clear" | "remove" | "reorder",
    sequence?: number,
    beforeSequence?: number,
  ) {
    if (!actorId || !enabled) return;
    const result = controller.editQueue(
      mapId,
      actorId,
      operation,
      sequence,
      beforeSequence,
    );
    changed(result.snapshot);
    if (result.reason) current.textContent = result.reason;
  }
  retry.addEventListener("click", () => edit("retry"));
  clear.addEventListener("click", () => edit("clear"));
  function pending() {
    const queue = actorId ? snapshot.game.actionQueues[actorId] : null;
    if (!queue) return [];
    return queue.current.waitingFor &&
      !queue.current.started &&
      actorId &&
      automaticAction(snapshot.game, actorId)?.key === queue.current.waitingFor
      ? [queue.current.intent, ...queue.pending]
      : queue.pending;
  }
  function endDrag() {
    dragging = null;
    for (const row of rows.values()) {
      delete row.dataset.dragging;
      delete row.dataset.drop;
    }
  }
  return {
    render(
      next: ControllerSnapshot,
      id: string | null,
      world: boolean,
      placement: boolean,
    ) {
      snapshot = next;
      const identity = `${snapshot.game.world.map.id}/${id}`;
      if (signature !== identity) {
        signature = identity;
        rows.clear();
        active.replaceChildren();
        list.replaceChildren();
        endDrag();
      }
      actorId = id;
      mapId = snapshot.game.world.map.id;
      enabled = world && !placement;
      const queue = id ? snapshot.game.actionQueues[id] : null;
      const automatic = world && id ? automaticAction(snapshot.game, id) : null;
      root.hidden =
        !world ||
        (!automatic && (!queue || queue.current.intent.mapId !== mapId));
      if (root.hidden) {
        rows.clear();
        active.replaceChildren();
        list.replaceChildren();
        endDrag();
        return;
      }
      if (automatic) {
        automaticTile.dataset.actionKey = automatic.key;
        automaticTile.setAttribute(
          "aria-label",
          `Current: ${automatic.label} / ${automatic.source}`,
        );
        automaticTile.title = `${automatic.label} / ${automatic.source} / ${automatic.detail}`;
        automaticLabel.textContent = automatic.label;
        automaticSource.textContent = {
          job: "Job",
          schedule: "Schedule",
          need: "Need",
          autonomy: "Autonomy",
        }[automatic.source];
        const source = targetThumbnail(
          snapshot.game,
          automatic.targetId,
          automatic.position,
        );
        if (automaticImage.getAttribute("src") !== source)
          automaticImage.src = source;
        const issue = controller.previewCancelAutomatic(
          mapId,
          id!,
          automatic.key,
        );
        automaticCancel.disabled = !enabled || !!issue;
        automaticCancel.setAttribute(
          "aria-label",
          `Cancel current ${automatic.label}`,
        );
        automaticCancel.title = issue ?? `Cancel current ${automatic.label}`;
        if (active.firstElementChild !== automaticRow)
          active.prepend(automaticRow);
      } else automaticRow.remove();
      if (!queue) {
        for (const row of rows.values()) row.remove();
        rows.clear();
        current.textContent = automatic!.detail;
        current.title = current.textContent;
        retry.disabled = true;
        clear.disabled = true;
        return;
      }
      current.textContent = automatic
        ? `${automatic.detail}${queue.current.blockedReason ? ` / ${queue.current.blockedReason}` : " / Player orders waiting"}`
        : (queue.current.blockedReason ??
          (!queue.current.started
            ? "Waiting for action recovery"
            : `${queue.pending.length} pending`));
      current.title = current.textContent;
      retry.disabled =
        !enabled || queue.current.started || !queue.current.blockedReason;
      clear.disabled = !enabled || !pending().length;
      for (const [sequence, row] of rows)
        if (
          queue.current.intent.sequence !== sequence &&
          !queue.pending.some((intent) => intent.sequence === sequence)
        ) {
          row.remove();
          rows.delete(sequence);
        }
      if (
        dragging &&
        !queue.pending.some((intent) => intent.sequence === dragging!.sequence)
      )
        endDrag();
      for (const intent of [queue.current.intent, ...queue.pending]) {
        const sequence = intent.sequence!;
        const isCurrent: boolean =
          !automatic && intent === queue.current.intent;
        const waitingFirst: boolean =
          !!automatic && intent === queue.current.intent;
        let row = rows.get(sequence);
        if (!row) {
          row = document.createElement("li");
          row.dataset.sequence = String(sequence);
          const tile = document.createElement("div");
          tile.className = "pawn-action-tile";
          tile.tabIndex = 0;
          tile.setAttribute("role", "group");
          const image = document.createElement("img");
          image.alt = "";
          image.draggable = false;
          const label = document.createElement("span");
          const badge = document.createElement("small");
          const cancel = document.createElement("button");
          cancel.type = "button";
          cancel.textContent = "X";
          cancel.className = "pawn-queued-cancel";
          cancel.addEventListener("click", () => {
            const live = actorId
              ? controller.getSnapshot().game.actionQueues[actorId]
              : null;
            if (!live || live.current.intent.mapId !== mapId) return;
            edit(
              live.current.intent.sequence === sequence ? "cancel" : "remove",
              sequence,
            );
          });
          let pointer: {
            id: number;
            x: number;
            y: number;
            active: boolean;
          } | null = null;
          tile.addEventListener("pointerdown", (event) => {
            if (
              event.button !== 0 ||
              (event.target as HTMLElement).closest("button") ||
              !enabled ||
              !pending().some((entry) => entry.sequence === sequence)
            )
              return;
            event.preventDefault();
            tile.focus();
            pointer = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              active: false,
            };
            tile.setPointerCapture(event.pointerId);
          });
          tile.addEventListener("pointermove", (event) => {
            if (!pointer || pointer.id !== event.pointerId || !enabled) return;
            if (
              !pointer.active &&
              Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) <
                5
            )
              return;
            pointer.active = true;
            dragging = { identity: signature, sequence };
            row!.dataset.dragging = "true";
            const bounds = tray.getBoundingClientRect();
            if (event.clientX > bounds.right - 32) tray.scrollLeft += 20;
            if (event.clientX < bounds.left + 32) tray.scrollLeft -= 20;
            for (const entry of rows.values()) delete entry.dataset.drop;
            const target = [...list.children].find((entry) => {
              const rect = entry.getBoundingClientRect();
              return (
                event.clientX >= rect.left &&
                event.clientX <= rect.right &&
                event.clientY >= rect.top &&
                event.clientY <= rect.bottom
              );
            }) as HTMLElement | undefined;
            if (target)
              target.dataset.drop =
                event.clientX <
                target.getBoundingClientRect().left +
                  target.getBoundingClientRect().width / 2
                  ? "before"
                  : "after";
          });
          tile.addEventListener("pointerup", (event) => {
            if (!pointer || pointer.id !== event.pointerId) return;
            const bounds = list.getBoundingClientRect();
            const valid =
              pointer.active &&
              enabled &&
              dragging?.identity === signature &&
              event.clientX >= bounds.left &&
              event.clientX <= bounds.right &&
              event.clientY >= bounds.top &&
              event.clientY <= bounds.bottom;
            const target = list.querySelector<HTMLElement>("[data-drop]");
            let before = target ? Number(target.dataset.sequence) : undefined;
            if (target?.dataset.drop === "after")
              before =
                pending()[
                  pending().findIndex((entry) => entry.sequence === before) + 1
                ]?.sequence;
            pointer = null;
            endDrag();
            if (tile.hasPointerCapture(event.pointerId))
              tile.releasePointerCapture(event.pointerId);
            if (valid) edit("reorder", sequence, before);
          });
          tile.addEventListener("pointercancel", () => {
            pointer = null;
            endDrag();
          });
          tile.addEventListener("lostpointercapture", () => {
            pointer = null;
            endDrag();
          });
          tile.addEventListener("keydown", (event) => {
            if (
              !enabled ||
              !event.altKey ||
              !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
            )
              return;
            const entries = pending();
            const index = entries.findIndex(
              (entry) => entry.sequence === sequence,
            );
            if (index < 0) return;
            event.preventDefault();
            if (
              (event.key === "ArrowLeft" && index === 0) ||
              (event.key === "ArrowRight" && index === entries.length - 1)
            )
              return;
            edit(
              "reorder",
              sequence,
              event.key === "Home"
                ? entries[0]?.sequence
                : event.key === "End"
                  ? undefined
                  : event.key === "ArrowLeft"
                    ? entries[index - 1]?.sequence
                    : entries[index + 2]?.sequence,
            );
            tile.focus();
          });
          tile.append(image, label, badge, cancel);
          row.append(tile);
          rows.set(sequence, row);
        }
        const label = actionIntentLabel(snapshot, intent);
        const tile = row.querySelector<HTMLElement>(".pawn-action-tile")!;
        tile.draggable = false;
        tile.dataset.reorderable = String(
          enabled &&
            !isCurrent &&
            pending().some((entry) => entry.sequence === sequence),
        );
        tile.setAttribute(
          "aria-label",
          `${isCurrent ? "Current" : "Pending"}: ${label}`,
        );
        tile.setAttribute(
          "aria-keyshortcuts",
          "Alt+ArrowLeft Alt+ArrowRight Alt+Home Alt+End",
        );
        tile.title = `${label}${isCurrent ? " / Current player action" : waitingFirst ? " / Next player action" : " / Drag to reorder; Alt+Left/Right to move"}`;
        row.dataset.current = String(isCurrent);
        row.querySelector("span")!.textContent = verbs[intent.action];
        row.querySelector("small")!.textContent = isCurrent
          ? queue.current.blockedReason
            ? "Blocked"
            : "Player"
          : waitingFirst
            ? "Next"
            : "Player";
        const image = row.querySelector("img")!;
        const targetId = intent.destination
          ? `tile:${intent.destination.x},${intent.destination.y}:floor`
          : (intent.targetId ?? intent.actorId);
        const source = targetThumbnail(
          snapshot.game,
          targetId,
          intent.destination,
        );
        if (image.getAttribute("src") !== source) image.src = source;
        const cancel = row.querySelector("button")!;
        cancel.disabled = !enabled;
        cancel.title = `Cancel ${isCurrent ? "current" : "pending"} ${label}`;
        cancel.setAttribute("aria-label", cancel.title);
        const container = isCurrent ? active : list;
        const index = isCurrent
          ? 0
          : waitingFirst
            ? 0
            : queue.pending.indexOf(intent) + (automatic ? 1 : 0);
        if (container.children[index] !== row)
          container.insertBefore(row, container.children[index] ?? null);
      }
    },
  };
}
