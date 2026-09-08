import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import type { MapPerspective } from "./map-settings";
import type { TilePosition } from "../../simulation/world";
import { pawnPortrait } from "./pawn-art";

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
  strip.append(portraits, detail);
  canvas.parentElement!.after(strip);
  const menu = document.createElement("div");
  menu.className = "pawn-context-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Ground interactions");
  const move = document.createElement("button");
  move.type = "button";
  move.textContent = "Go Here";
  move.setAttribute("role", "menuitem");
  const record = document.createElement("button");
  record.type = "button";
  record.textContent = "Inspect";
  record.setAttribute("role", "menuitem");
  const reason = document.createElement("p");
  reason.id = `${canvas.id || "map"}-move-reason`;
  move.setAttribute("aria-describedby", reason.id);
  menu.append(move, record, reason);
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
  function close() {
    menu.hidden = true;
    target = null;
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
    const issue =
      perspective !== "world"
        ? "Recorded view is inspection-only."
        : !target.actorId
          ? "Select a person first."
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
    reason.textContent = issue;
    reason.hidden = !issue;
  }
  move.addEventListener("click", () => {
    if (!target?.actorId || perspective !== "world" || move.disabled) return;
    const result = controller.goHere(
      target.mapId,
      target.actorId,
      target.position,
    );
    close();
    changed(result.snapshot);
    if (result.code !== "accepted") action.textContent = reasons[result.code];
    canvas.focus();
  });
  record.addEventListener("click", () => {
    const id = target?.id;
    close();
    if (id) inspect(id, perspective);
  });
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      canvas.focus();
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const available = [move, record].filter((button) => !button.disabled);
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
    name.textContent = person ? person.name : "No active person";
    const responder = activeId
      ? snapshot.game.combat.responders[activeId]
      : null;
    action.textContent = !person
      ? ""
      : perspective === "recorded"
        ? "Recorded / inspection only"
        : responder?.incapacitated
          ? "Incapacitated"
          : responder?.order === "move" && responder.destination
            ? `Go Here: ${responder.destination.x}, ${responder.destination.y}${responder.blockedReason ? ` / ${responder.blockedReason}` : ""}`
            : responder?.drafted
              ? `${responder.returnToAutonomy ? "Returning to routine" : "Drafted"} / ${responder.order} / ${responder.phase}`
              : person.activity;
    action.title = action.textContent ?? "";
    strip.dataset.activePawn = activeId ?? "";
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
    ) {
      if (busyPlacement) return;
      target = { position, id, mapId, actorId: activeId };
      menu.hidden = false;
      updateMenu();
      menu.style.maxWidth = `${Math.max(120, canvas.clientWidth - 8)}px`;
      menu.style.left = `${Math.max(4, Math.min(canvas.clientWidth - menu.offsetWidth - 4, point.x + 8))}px`;
      menu.style.top = `${Math.max(4, Math.min(canvas.clientHeight - menu.offsetHeight - 4, point.y + 8))}px`;
      if (keyboard) (move.disabled ? record : move).focus();
    },
  };
}
