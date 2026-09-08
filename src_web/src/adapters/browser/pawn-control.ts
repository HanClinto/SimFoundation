import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import type { MapPerspective } from "./map-settings";
import type { TilePosition } from "../../simulation/world";
import { pawnPortrait } from "./pawn-art";
import { targetThumbnail } from "./target-thumbnail";
import { mapObjects } from "./map-objects";
import { observedSnapshot } from "./observed-view";
import { createActionQueueView } from "./action-queue-view";
import {
  automaticAction,
  personCurrentAction,
} from "../../simulation/person-actions";
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
  selected?: (id: string | null, centerCamera?: boolean) => void,
  selectionHost?: HTMLElement | null,
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
  const name = document.createElement("button");
  name.type = "button";
  name.className = "selection-inspect-link";
  name.addEventListener("click", () => {
    if (activeId) inspect(activeId, perspective);
  });
  const action = document.createElement("span");
  action.setAttribute("role", "status");
  detail.append(name, action);
  const deselectButton = document.createElement("button");
  deselectButton.type = "button";
  deselectButton.className = "pawn-action-cancel";
  deselectButton.textContent = "X";
  deselectButton.setAttribute("aria-label", "Deselect active pawn");
  strip.append(portraits, detail, deselectButton);
  const surface = document.createElement("section");
  surface.className = "pawn-selection-area";
  surface.setAttribute("aria-label", "Selection and orders");
  if (canvas.parentElement!.querySelector("[data-camera-entity]"))
    canvas.after(surface);
  else canvas.parentElement!.after(surface);
  surface.append(strip);
  const queueView = createActionQueueView(strip, controller, changed);
  if (selectionHost) strip.after(selectionHost);
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
  const settings = document.createElement("details");
  settings.className = "pawn-order-settings";
  const settingsLabel = document.createElement("summary");
  settingsLabel.textContent = "Orders";
  const settingsMenu = document.createElement("ul");
  settingsMenu.className = "menu";
  settingsMenu.setAttribute("role", "menu");
  settingsMenu.setAttribute("aria-label", "Order submission");
  let mode: "append" | "now" = "append";
  const modes: HTMLButtonElement[] = [];
  for (const [value, label] of [
    ["append", "Add to Queue"],
    ["now", "Do Now"],
  ]) {
    const option = document.createElement("button");
    option.type = "button";
    option.dataset.orderMode = value!;
    option.textContent = label!;
    option.setAttribute("role", "menuitemradio");
    option.setAttribute("aria-checked", String(value === mode));
    option.addEventListener("click", () => {
      mode = value === "now" ? "now" : "append";
      for (const button of modes)
        button.setAttribute("aria-checked", String(button === option));
      settingsLabel.title = `New orders: ${label}`;
      settings.open = false;
      updateMenu();
      canvas.focus();
    });
    modes.push(option);
    settingsMenu.append(row(option));
  }
  settings.append(settingsLabel, settingsMenu);
  const toolbar = canvas
    .closest(".camera-window")
    ?.querySelector('[role="toolbar"]');
  if (toolbar) toolbar.append(settings);
  else strip.before(settings);
  settings.addEventListener("toggle", () => {
    if (settings.open) {
      close();
      const bounds =
        canvas.closest(".camera-window")?.getBoundingClientRect() ??
        canvas.getBoundingClientRect();
      const origin = settings.getBoundingClientRect();
      settingsMenu.style.right = "auto";
      settingsMenu.style.left = `${Math.max(bounds.left - origin.left + 4, Math.min(0, bounds.right - origin.left - settingsMenu.offsetWidth - 4))}px`;
    }
  });
  settings.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      settings.open = false;
      settingsLabel.focus();
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const index = modes.indexOf(document.activeElement as HTMLButtonElement);
      modes[
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? modes.length - 1
            : (index + (event.key === "ArrowUp" ? -1 : 1) + modes.length) %
              modes.length
      ]?.focus();
    }
  });
  const verbs = document.createElement("ul");
  verbs.className = "menu pawn-verb-menu";
  verbs.setAttribute("role", "menu");
  verbs.hidden = true;
  const move = document.createElement("button");
  move.type = "button";
  move.textContent = "Go Here";
  move.dataset.interaction = "move";
  move.setAttribute("role", "menuitem");
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
  const divider = document.createElement("li");
  divider.className = "divider";
  divider.setAttribute("role", "separator");
  const explanation = document.createElement("li");
  explanation.setAttribute("role", "none");
  explanation.append(reason);
  verbs.append(moveRow, explanation);
  menu.append(subject, divider, chooseRow);
  const targets = new Map<string, HTMLButtonElement>();
  let anchor = { x: 0, y: 0 };
  function fitMenu() {
    menu.style.maxWidth = `${Math.max(0, canvas.clientWidth - 8)}px`;
    menu.style.maxHeight = `${Math.max(0, canvas.clientHeight - 8)}px`;
    menu.style.left = `${Math.max(4, Math.min(canvas.clientWidth - menu.offsetWidth - 4, anchor.x + 8))}px`;
    menu.style.top = `${Math.max(4, Math.min(canvas.clientHeight - menu.offsetHeight - 4, anchor.y + 8))}px`;
    menu.style.maxHeight = `${Math.max(0, canvas.clientHeight - parseFloat(menu.style.top) - 4)}px`;
  }
  function openTarget(id: string, keyboard = false) {
    const button = targets.get(id);
    if (!target?.actorId || !button) return;
    target.id = id;
    target.position = {
      x: Number(button.dataset.targetX),
      y: Number(button.dataset.targetY),
    };
    for (const entry of targets.values()) {
      entry.setAttribute("aria-expanded", String(entry === button));
      entry.dataset.chosen = String(entry === button);
      entry.title = `${entry === button ? "Inspect" : "Choose target:"} ${entry.dataset.targetLabel}`;
    }
    button.parentElement!.append(verbs);
    verbs.hidden = false;
    for (const entry of entries.values()) entry.parentElement!.remove();
    entries.clear();
    updateMenu();
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
    return mode;
  }
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
  function select(id: string, centerCamera = false) {
    if (
      (!current.game.world.positions[id] &&
        personCurrentAction(current.game, id)?.source !== "mission") ||
      !current.game.personnel.some((person) => person.id === id) ||
      busyPlacement
    )
      return;
    activeId = id;
    close();
    selected?.(id, centerCamera);
    render(current, perspective, busyPlacement);
    changed(current);
  }
  function updateMenu() {
    if (!target) return;
    const queued = target.actorId
      ? current.game.actionQueues[target.actorId]
      : null;
    const waitingBehindAutomatic =
      target.actorId &&
      submissionMode() === "append" &&
      automaticAction(current.game, target.actorId);
    moveRow.hidden = !target.actorId || !target.id.startsWith("tile:");
    chooseRow.hidden =
      !target.actorId ||
      !current.game.personnel.some((person) => person.id === target!.id);
    choose.disabled =
      !current.game.world.positions[target.id] || target.id === activeId;
    const issue =
      perspective !== "world"
        ? "Recorded view is inspection-only."
        : !target.actorId
          ? "Select a person first."
          : queued || waitingBehindAutomatic
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
      perspective === "world" && target.actorId
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
          : (queued || waitingBehindAutomatic) && option.action !== "cancel"
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
    divider.hidden = chooseRow.hidden;
    reason.textContent = [...new Set(issues)].join(" ");
    explanation.hidden = issues.length === 0;
  }
  function deselect() {
    if (!activeId) return;
    close();
    selected?.(null);
    activeId = null;
    render(current, perspective, busyPlacement);
    changed(current);
    canvas.focus();
  }
  deselectButton.addEventListener("click", deselect);
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
  menu.addEventListener("keydown", (event) => {
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
  document.addEventListener("pointerdown", (event) => {
    if (!settings.contains(event.target as Node)) settings.open = false;
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
    for (const button of modes) button.disabled = placement || view !== "world";
    if (
      activeId &&
      !snapshot.game.world.positions[activeId] &&
      personCurrentAction(snapshot.game, activeId)?.source !== "mission"
    ) {
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
        button.addEventListener("click", () => {
          if (activeId === person.id) deselect();
          else select(person.id, true);
        });
        portraits.append(button);
        buttons.set(person.id, button);
      }
      const present =
        !!snapshot.game.world.positions[person.id] ||
        personCurrentAction(snapshot.game, person.id)?.source === "mission";
      button.disabled = !present || placement;
      button.title = `${activeId === person.id ? "Deselect " : "Select "}${person.name}${present ? "" : " / Away from this map"}`;
      button.setAttribute(
        "aria-label",
        `Select ${person.name}${present ? "" : " (away)"}`,
      );
      button.setAttribute("aria-pressed", String(activeId === person.id));
    }
    const person = people.find((person) => person.id === activeId);
    const queue = activeId ? snapshot.game.actionQueues[activeId] : null;
    const automatic =
      perspective === "world" && activeId
        ? personCurrentAction(snapshot.game, activeId)
        : null;
    name.textContent = person ? person.name : "No active person";
    name.disabled = !person;
    name.title = person ? `Inspect ${person.name}` : "No active person";
    action.textContent = !person
      ? ""
      : perspective === "recorded"
        ? "Recorded / inspection only"
        : automatic
          ? automatic.detail
          : (queue?.current.blockedReason ??
            (queue && !queue.current.started
              ? "Waiting for action recovery"
              : currentPersonAction(snapshot.game, person.id)));
    deselectButton.disabled = !activeId;
    deselectButton.title = "Deselect active pawn; queued actions continue";
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
      settings.open = false;
      target = { position, id, mapId, actorId: activeId };
      const displayed =
        perspective === "recorded" ? observedSnapshot(current) : current;
      const objects = mapObjects(displayed.game, perspective);
      const selectedObject = objects.find((object) => object.id === id);
      const groundPosition = selectedObject?.position ?? position;
      target.position = { ...groundPosition };
      const floorId = id.startsWith("tile:")
        ? id
        : `tile:${groundPosition.x},${groundPosition.y}:floor`;
      const candidates = [
        ...(selectedObject ? [selectedObject] : []),
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
      if (!selectedObject && !id.startsWith("tile:"))
        candidates.unshift({ id, name: id, position });
      const choosingSubject = !activeId;
      function chooseSubject(candidateId: string) {
        const person = current.game.personnel.find(
          (entry) => entry.id === candidateId,
        );
        if (
          person &&
          (current.game.world.positions[candidateId] ||
            personCurrentAction(current.game, candidateId)?.source ===
              "mission")
        ) {
          select(candidateId);
        } else {
          close();
          selected?.(candidateId);
          changed(current);
          inspect(candidateId, perspective);
        }
      }
      const entities = candidates.filter(
        (candidate) => !candidate.id.startsWith("tile:"),
      );
      const directCandidates =
        choosingSubject && !keyboard && entities.length > 0
          ? entities
          : candidates;
      if (choosingSubject && directCandidates.length === 1) {
        chooseSubject(directCandidates[0]!.id);
        return;
      }
      menu.setAttribute(
        "aria-label",
        choosingSubject ? "Select subject or inspect" : "Target interactions",
      );
      subject.hidden = choosingSubject;
      subjectName.textContent =
        current.game.personnel.find((person) => person.id === activeId)?.name ??
        "";
      subjectPortrait.hidden = !activeId;
      if (activeId) subjectPortrait.src = pawnPortrait(activeId);
      for (const candidate of candidates) {
        const button = document.createElement("button");
        button.type = "button";
        const icon = document.createElement("img");
        icon.alt = "";
        icon.src = targetThumbnail(
          displayed.game,
          candidate.id,
          candidate.position,
        );
        const label = document.createElement("span");
        label.textContent = choosingSubject
          ? candidate.name
          : `${candidate.name} >`;
        button.append(icon, label);
        button.dataset.menuTarget = candidate.id;
        button.dataset.targetLabel = candidate.name;
        button.dataset.targetX = String(candidate.position.x);
        button.dataset.targetY = String(candidate.position.y);
        button.setAttribute("role", "menuitem");
        if (!choosingSubject) {
          button.setAttribute("aria-haspopup", "menu");
          button.setAttribute("aria-expanded", "false");
        }
        button.title = choosingSubject
          ? `${current.game.personnel.some((person) => person.id === candidate.id) ? "Select" : "Inspect"} ${candidate.name}`
          : `Choose target: ${candidate.name}`;
        button.addEventListener("click", () => {
          if (choosingSubject) chooseSubject(candidate.id);
          else if (button.dataset.chosen === "true") {
            close();
            inspect(candidate.id, perspective);
          } else openTarget(candidate.id);
        });
        targets.set(candidate.id, button);
        menu.insertBefore(row(button), divider);
      }
      menu.hidden = false;
      updateMenu();
      anchor = point;
      if (candidates.length === 1) openTarget(candidates[0]!.id, keyboard);
      else if (keyboard) availableButtons()[0]?.focus();
      fitMenu();
    },
  };
}
