import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import type { MapPerspective } from "./map-settings";
import type { TilePosition } from "../../simulation/world";
import { pawnPortrait } from "./pawn-art";
import { mapObjects } from "./map-objects";
import { observedSnapshot } from "./observed-view";
import { createActionQueueView } from "./action-queue-view";
import type { ActionIntent } from "../../simulation/action-queue";
import {
  currentPersonAction,
  type PersonInteraction,
} from "../../simulation/interactions";

const reasons = {
  accepted: "",
  busy: "Finish cargo, clinical or expedition commitments first.",
  "not-found": "This person is not present at this location.",
  "not-drafted": "This person is not available for direct control.",
  incapacitated: "Incapacitated; stabilization is required.",
  unreachable: "No reachable route to this tile.",
  "invalid-order": "Movement is unavailable.",
};

export function createPawnControl(
  canvas: HTMLCanvasElement,
  controller: GameController,
  changed: (snapshot: ControllerSnapshot) => void,
  inspect: (id: string, perspective: MapPerspective) => void,
) {
  const document = canvas.ownerDocument;
  const strip = document.createElement("section");
  strip.className = "pawn-control-strip";
  strip.setAttribute("aria-label", "Active person controls");
  const portraits = document.createElement("div");
  portraits.className = "pawn-control-portraits";
  portraits.setAttribute("role", "group");
  portraits.setAttribute("aria-label", "Choose active person");
  const detail = document.createElement("div");
  detail.className = "pawn-control-detail";
  const name = document.createElement("strong");
  const action = document.createElement("span");
  action.setAttribute("role", "status");
  detail.append(name, action);
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "pawn-action-cancel";
  cancel.textContent = "X";
  cancel.setAttribute("aria-label", "Cancel Current Action");
  strip.append(portraits, detail, cancel);
  canvas.parentElement!.after(strip);
  const queueView = createActionQueueView(strip, controller, changed);
  const menu = document.createElement("ul");
  menu.className = "menu pawn-context-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Target interactions");
  const subject = document.createElement("li");
  subject.className = "pawn-menu-subject";
  subject.setAttribute("role", "none");
  const subjectPortrait = document.createElement("img");
  subjectPortrait.alt = "";
  const subjectName = document.createElement("strong");
  subject.append(subjectPortrait, subjectName);
  const commandPath = document.createElement("p");
  commandPath.className = "pawn-command-path";
  commandPath.setAttribute("role", "status");
  subject.append(commandPath);
  const policyRow = document.createElement("li");
  policyRow.className = "pawn-queue-policy";
  policyRow.setAttribute("role", "none");
  const policy = document.createElement("select");
  policy.setAttribute("aria-label", "Action submission");
  for (const [value, label] of [
    ["append", "Add to Queue"],
    ["now", "Do Now"],
  ]) {
    const option = document.createElement("option");
    option.value = value!;
    option.textContent = label!;
    policy.append(option);
  }
  policyRow.append(policy);
  const verbs = document.createElement("ul");
  verbs.className = "menu pawn-verb-menu";
  verbs.setAttribute("role", "menu");
  verbs.hidden = true;
  const move = document.createElement("button");
  move.type = "button";
  move.textContent = "Go Here";
  move.dataset.interaction = "move";
  move.setAttribute("role", "menuitem");
  const record = document.createElement("button");
  record.type = "button";
  record.textContent = "Inspect";
  record.dataset.interaction = "inspect";
  record.setAttribute("role", "menuitem");
  const reason = document.createElement("p");
  reason.id = `${canvas.id || "map"}-move-reason`;
  move.setAttribute("aria-describedby", reason.id);
  function row(button: HTMLButtonElement) {
    const item = document.createElement("li");
    item.setAttribute("role", "none");
    item.append(button);
    return item;
  }
  const choose = document.createElement("button");
  choose.type = "button";
  choose.textContent = "Select Person";
  choose.setAttribute("role", "menuitem");
  const moveRow = row(move);
  const chooseRow = row(choose);
  const recordRow = row(record);
  const divider = document.createElement("li");
  divider.className = "divider";
  divider.setAttribute("role", "separator");
  const explanation = document.createElement("li");
  explanation.setAttribute("role", "none");
  explanation.append(reason);
  verbs.append(moveRow, explanation);
  menu.append(subject, policyRow, divider, chooseRow, recordRow);
  const targets = new Map<string, HTMLButtonElement>();
  let targetLabel = "";
  let anchor = { x: 0, y: 0 };
  function fitMenu() {
    menu.style.maxWidth = `${Math.max(0, canvas.clientWidth - 8)}px`;
    menu.style.maxHeight = `${Math.max(0, canvas.clientHeight - 8)}px`;
    menu.style.left = `${Math.max(4, Math.min(canvas.clientWidth - menu.offsetWidth - 4, anchor.x + 8))}px`;
    menu.style.top = `${Math.max(4, Math.min(canvas.clientHeight - menu.offsetHeight - 4, anchor.y + 8))}px`;
    menu.style.maxHeight = `${Math.max(0, canvas.clientHeight - parseFloat(menu.style.top) - 4)}px`;
  }
  function showPath(verb?: string) {
    commandPath.textContent = [subjectName.textContent, targetLabel, verb]
      .filter(Boolean)
      .join(" > ");
  }
  function openTarget(id: string, keyboard = false) {
    const button = targets.get(id);
    if (!target || !button) return;
    target.id = id;
    target.position = {
      x: Number(button.dataset.targetX),
      y: Number(button.dataset.targetY),
    };
    targetLabel = button.dataset.targetLabel!;
    for (const entry of targets.values())
      entry.setAttribute("aria-expanded", String(entry === button));
    button.parentElement!.append(verbs);
    verbs.hidden = false;
    for (const entry of entries.values()) entry.parentElement!.remove();
    entries.clear();
    updateMenu();
    showPath();
    fitMenu();
    if (keyboard)
      verbs
        .querySelector<HTMLButtonElement>(
          "li:not([hidden]) > button:not(:disabled)",
        )
        ?.focus();
  }
  const entries = new Map<PersonInteraction, HTMLButtonElement>();
  canvas.parentElement!.append(menu);
  let current = controller.getSnapshot();
  let perspective: MapPerspective = "world";
  let activeId: string | null = null;
  let mapId = current.game.world.map.id;
  let busyPlacement = false;
  let target: {
    position: TilePosition;
    id: string;
    mapId: string;
    actorId: string | null;
  } | null = null;
  const buttons = new Map<string, HTMLButtonElement>();
  function intentFor(action: ActionIntent["action"]): ActionIntent {
    return {
      mapId: target!.mapId,
      actorId: target!.actorId!,
      action,
      ...(action === "move"
        ? { destination: target!.position }
        : action === "hold"
          ? {}
          : { targetId: target!.id }),
    };
  }
  function submissionMode() {
    return policy.value === "now" ? ("now" as const) : ("append" as const);
  }
  policy.addEventListener("change", () => updateMenu());
  function close() {
    menu.hidden = true;
    target = null;
    for (const button of entries.values()) button.parentElement!.remove();
    entries.clear();
    verbs.hidden = true;
    verbs.remove();
    for (const button of targets.values()) button.parentElement!.remove();
    targets.clear();
  }
  function select(id: string) {
    if (
      !current.game.world.positions[id] ||
      !current.game.personnel.some((person) => person.id === id) ||
      busyPlacement
    )
      return;
    activeId = id;
    close();
    render(current, perspective, busyPlacement);
    changed(current);
  }
  function updateMenu() {
    if (!target) return;
    policy.disabled = perspective !== "world" || !target.actorId;
    const queued = target.actorId
      ? current.game.actionQueues[target.actorId]
      : null;
    moveRow.hidden = !target.id.startsWith("tile:");
    chooseRow.hidden = !current.game.personnel.some(
      (person) => person.id === target!.id,
    );
    choose.disabled =
      !current.game.world.positions[target.id] || target.id === activeId;
    record.textContent = `Inspect ${targetLabel}`;
    const issue =
      perspective !== "world"
        ? "Recorded view is inspection-only."
        : !target.actorId
          ? "Select a person first."
          : queued
            ? (controller.previewQueuedAction(
                intentFor("move"),
                submissionMode(),
              ) ?? "")
            : reasons[
                controller.previewGoHere(
                  target.mapId,
                  target.actorId,
                  target.position,
                )
              ];
    move.disabled = !!issue;
    move.title =
      issue ||
      `Move ${current.game.personnel.find((person) => person.id === target!.actorId)?.name} here`;
    const issues: string[] = moveRow.hidden || !issue ? [] : [issue];
    const options =
      perspective === "world"
        ? controller.interactions(target.mapId, target.actorId, target.id)
        : [];
    for (const option of options) {
      let button = entries.get(option.action);
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.setAttribute("role", "menuitem");
        button.dataset.interaction = option.action;
        button.setAttribute("aria-describedby", reason.id);
        button.textContent = option.label;
        button.addEventListener("click", () => {
          if (!target?.actorId || perspective !== "world" || button!.disabled)
            return;
          if (option.action === "cancel") return;
          const result = controller.queueAction(
            intentFor(option.action),
            submissionMode(),
          );
          close();
          changed(result.snapshot);
          if (result.reason) action.textContent = result.reason;
          canvas.focus();
        });
        entries.set(option.action, button);
        verbs.insertBefore(row(button), explanation);
      }
      const unavailable =
        perspective !== "world"
          ? "Recorded view is inspection-only."
          : queued && option.action !== "cancel"
            ? controller.previewQueuedAction(
                intentFor(option.action),
                submissionMode(),
              )
            : option.reason;
      button.disabled = !!unavailable;
      button.title = unavailable ?? option.label;
      if (unavailable) issues.push(`${option.label}: ${unavailable}`);
    }
    for (const [key, button] of entries) {
      if (!options.some((option) => option.action === key)) {
        button.disabled = true;
        button.title = "This target is no longer available.";
        issues.push(button.title);
      }
    }
    divider.hidden = false;
    reason.textContent = [...new Set(issues)].join(" ");
    explanation.hidden = issues.length === 0;
  }
  cancel.addEventListener("click", () => {
    if (!activeId || cancel.disabled || perspective !== "world") return;
    const result = current.game.actionQueues[activeId]
      ? controller.editQueue(mapId, activeId, "cancel")
      : controller.interact({ mapId, actorId: activeId, action: "cancel" });
    close();
    changed(result.snapshot);
    if (result.reason) action.textContent = result.reason;
    canvas.focus();
  });
  choose.addEventListener("click", () => {
    if (target && !choose.disabled) select(target.id);
  });
  function availableButtons() {
    return [...menu.querySelectorAll<HTMLButtonElement>("button")]
      .filter((button) => !button.disabled && !button.parentElement!.hidden)
      .filter((button) => !button.closest("[hidden]"));
  }
  move.addEventListener("click", () => {
    if (!target?.actorId || perspective !== "world" || move.disabled) return;
    const result = controller.queueAction(intentFor("move"), submissionMode());
    close();
    changed(result.snapshot);
    if (result.reason) action.textContent = result.reason;
    canvas.focus();
  });
  record.addEventListener("click", () => {
    const id = target?.id;
    close();
    if (id) inspect(id, perspective);
  });
  menu.addEventListener("keydown", (event) => {
    if (event.target === policy && event.key !== "Escape") return;
    if (
      event.key === "ArrowRight" &&
      (event.target as HTMLElement).dataset.menuTarget
    ) {
      event.preventDefault();
      openTarget((event.target as HTMLElement).dataset.menuTarget!, true);
    }
    if (event.key === "ArrowLeft" && verbs.contains(event.target as Node)) {
      event.preventDefault();
      verbs.hidden = true;
      const button = target ? targets.get(target.id) : null;
      button?.setAttribute("aria-expanded", "false");
      button?.focus();
      showPath();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      canvas.focus();
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const available = availableButtons();
      const index = available.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      available[
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? available.length - 1
            : (index + (event.key === "ArrowUp" ? -1 : 1) + available.length) %
              available.length
      ]?.focus();
    }
  });
  for (const eventName of ["focusin", "pointerover"] as const)
    menu.addEventListener(eventName, (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "button",
      );
      if (!button) return;
      if (verbs.contains(button)) showPath(button.textContent ?? undefined);
      else showPath();
    });
  document.addEventListener("pointerdown", (event) => {
    if (
      !menu.hidden &&
      !menu.contains(event.target as Node) &&
      event.target !== canvas
    )
      close();
  });
  function render(
    snapshot: ControllerSnapshot,
    view: MapPerspective,
    placement: boolean,
  ) {
    current = snapshot;
    busyPlacement = placement;
    if (mapId !== snapshot.game.world.map.id) {
      mapId = snapshot.game.world.map.id;
      activeId = null;
      close();
    }
    if (view !== perspective || placement) close();
    perspective = view;
    if (activeId && !snapshot.game.world.positions[activeId]) {
      activeId = null;
      close();
    }
    const people = snapshot.game.personnel;
    for (const [id, button] of buttons)
      if (!people.some((person) => person.id === id)) {
        button.remove();
        buttons.delete(id);
      }
    for (const person of people) {
      let button = buttons.get(person.id);
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.dataset.activePerson = person.id;
        const image = document.createElement("img");
        image.alt = "";
        image.src = pawnPortrait(person.id);
        button.append(image);
        button.addEventListener("click", () => select(person.id));
        portraits.append(button);
        buttons.set(person.id, button);
      }
      const present = !!snapshot.game.world.positions[person.id];
      button.disabled = !present || placement;
      button.title = `${person.name}${present ? "" : " / Away from this map"}`;
      button.setAttribute(
        "aria-label",
        `Select ${person.name}${present ? "" : " (away)"}`,
      );
      button.setAttribute("aria-pressed", String(activeId === person.id));
    }
    const person = people.find((person) => person.id === activeId);
    const queue = activeId ? snapshot.game.actionQueues[activeId] : null;
    name.textContent = person ? person.name : "No active person";
    action.textContent = !person
      ? ""
      : perspective === "recorded"
        ? "Recorded / inspection only"
        : (queue?.current.blockedReason ??
          (queue && !queue.current.started
            ? "Waiting for action recovery"
            : currentPersonAction(snapshot.game, person.id)));
    const cancellationIssue = placement
      ? "Finish or cancel placement first."
      : perspective !== "world"
        ? "Recorded view is inspection-only."
        : !activeId
          ? "Select a person first."
          : queue
            ? null
            : controller.previewInteraction({
                mapId,
                actorId: activeId,
                action: "cancel",
              });
    cancel.disabled = !!cancellationIssue;
    cancel.title = cancellationIssue ?? "Cancel Current Action";
    action.title = action.textContent ?? "";
    strip.dataset.activePawn = activeId ?? "";
    queueView.render(snapshot, activeId, perspective === "world", placement);
    updateMenu();
  }
  return {
    render,
    close,
    select,
    get activeId() {
      return activeId;
    },
    get menuOpen() {
      return !menu.hidden;
    },
    ground(
      position: TilePosition,
      id: string,
      point: TilePosition,
      keyboard = false,
      hitIds: readonly string[] = [],
    ) {
      if (busyPlacement) return;
      close();
      policy.value = "append";
      target = { position, id, mapId, actorId: activeId };
      const displayed =
        perspective === "recorded" ? observedSnapshot(current) : current;
      const objects = mapObjects(displayed.game, perspective);
      const selected = objects.find((object) => object.id === id);
      const groundPosition = selected?.position ?? position;
      target.position = { ...groundPosition };
      const floorId = id.startsWith("tile:")
        ? id
        : `tile:${groundPosition.x},${groundPosition.y}:floor`;
      const candidates = [
        ...(selected ? [selected] : []),
        ...objects.filter(
          (object) =>
            object.id !== id &&
            (hitIds.includes(object.id) ||
              (!object.id.startsWith("storage:") &&
                object.position.x === groundPosition.x &&
                object.position.y === groundPosition.y &&
                !current.game.objects.items.some(
                  (item) =>
                    object.id === `object:${item.id}` &&
                    item.kind === "cable" &&
                    item.installed,
                ))),
        ),
        {
          id: floorId,
          name: `Floor Tile (${groundPosition.x}, ${groundPosition.y})`,
          position: groundPosition,
        },
      ];
      if (!selected && !id.startsWith("tile:"))
        candidates.unshift({ id, name: id, position });
      subjectName.textContent =
        current.game.personnel.find((person) => person.id === activeId)?.name ??
        "No active person";
      subjectPortrait.hidden = !activeId;
      if (activeId) subjectPortrait.src = pawnPortrait(activeId);
      targetLabel =
        candidates.find((candidate) => candidate.id === id)?.name ?? id;
      showPath();
      for (const candidate of candidates) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${candidate.name} >`;
        button.dataset.menuTarget = candidate.id;
        button.dataset.targetLabel = candidate.name;
        button.dataset.targetX = String(candidate.position.x);
        button.dataset.targetY = String(candidate.position.y);
        button.setAttribute("role", "menuitem");
        button.setAttribute("aria-haspopup", "menu");
        button.setAttribute("aria-expanded", "false");
        button.addEventListener("click", () => openTarget(candidate.id));
        targets.set(candidate.id, button);
        menu.insertBefore(row(button), divider);
      }
      menu.hidden = false;
      updateMenu();
      anchor = point;
      fitMenu();
      if (keyboard) availableButtons()[0]?.focus();
    },
  };
}
