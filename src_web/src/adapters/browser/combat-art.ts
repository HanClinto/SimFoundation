import type { GameState } from "../../simulation_legacy/state";
import {
  RESPONSE_RANGE,
  ENCOUNTER_RADIUS,
  type AdversaryState,
} from "../../simulation_legacy/combat";
import { canObserve } from "../../simulation_legacy/observations";
import type { TilePosition } from "../../simulation_legacy/world";

export function tacticalRange(
  state: GameState,
  id: string,
): readonly { position: TilePosition; clear: boolean }[] {
  const origin = state.world.positions[id];
  const responder = state.combat.responders[id];
  if (!origin || !responder?.drafted || responder.incapacitated) return [];
  const tiles = [];
  for (
    let row = Math.max(0, origin.y - RESPONSE_RANGE);
    row <= Math.min(state.world.map.height - 1, origin.y + RESPONSE_RANGE);
    row += 1
  )
    for (
      let column = Math.max(0, origin.x - RESPONSE_RANGE);
      column <= Math.min(state.world.map.width - 1, origin.x + RESPONSE_RANGE);
      column += 1
    ) {
      const position = { x: column, y: row };
      if (Math.hypot(column - origin.x, row - origin.y) <= RESPONSE_RANGE)
        tiles.push({
          position,
          clear: canObserve(state.world.map, origin, position, RESPONSE_RANGE),
        });
    }
  return tiles;
}

export function drawTacticalOverlay(
  context: CanvasRenderingContext2D,
  state: GameState,
  selectedId: string | null,
  zoom: number,
  project: (position: TilePosition) => TilePosition,
): void {
  context.save();
  for (const tile of selectedId ? tacticalRange(state, selectedId) : []) {
    const point = project(tile.position);
    context.fillStyle = tile.clear
      ? "rgba(116, 196, 179, .2)"
      : "rgba(159, 80, 75, .16)";
    context.beginPath();
    context.moveTo(point.x, point.y - 10 * zoom);
    context.lineTo(point.x + 20 * zoom, point.y);
    context.lineTo(point.x, point.y + 10 * zoom);
    context.lineTo(point.x - 20 * zoom, point.y);
    context.closePath();
    context.fill();
  }
  for (const [id, responder] of Object.entries(state.combat.responders)) {
    if (!responder.drafted) continue;
    const position = state.world.positions[id];
    if (!position) continue;
    const point = project(position);
    if (responder.destination) {
      const destination = project(responder.destination);
      context.strokeStyle =
        responder.order === "retreat" ? "#97d4e7" : "#e4d894";
      context.lineWidth = 1.5;
      context.setLineDash([4, 4]);
      context.beginPath();
      context.moveTo(point.x, point.y);
      context.lineTo(destination.x, destination.y);
      context.stroke();
      context.setLineDash([]);
      context.strokeRect(destination.x - 5, destination.y - 3, 10, 6);
    }
    if (
      responder.lastShotTick === state.tick &&
      state.combat.adversary &&
      canObserve(
        state.world.map,
        position,
        state.combat.adversary.position,
        RESPONSE_RANGE,
      )
    ) {
      const target = project(state.combat.adversary.position);
      context.strokeStyle = "#f4dea4";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(point.x, point.y - 18 * zoom);
      context.lineTo(target.x, target.y - 18 * zoom);
      context.stroke();
    }
  }
  if (state.combat.status === "active" && state.combat.adversary) {
    const origin = project(state.combat.adversary.origin);
    context.strokeStyle = "rgba(208, 136, 105, .65)";
    context.setLineDash([6, 5]);
    context.beginPath();
    context.ellipse(
      origin.x,
      origin.y,
      ENCOUNTER_RADIUS * Math.sqrt(2) * 20 * zoom,
      ENCOUNTER_RADIUS * Math.sqrt(2) * 10 * zoom,
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
  context.restore();
}

export function drawAdversary(
  context: CanvasRenderingContext2D,
  actor: AdversaryState,
  point: TilePosition,
  zoom: number,
  stale: boolean,
): void {
  context.save();
  context.translate(point.x, point.y);
  context.scale(zoom, zoom);
  context.globalAlpha = stale ? 0.45 : 1;
  if (actor.health <= 0) {
    context.translate(0, -3);
    context.rotate(-Math.PI / 2);
    context.scale(0.7, 0.7);
  }
  context.strokeStyle = "#393d36";
  context.lineWidth = 1.5;
  context.fillStyle = "#a8ae8f";
  context.fillRect(-6, -33, 12, 10);
  context.strokeRect(-6, -33, 12, 10);
  context.fillStyle = "#7e7976";
  context.fillRect(-8, -22, 16, 15);
  context.strokeRect(-8, -22, 16, 15);
  context.fillStyle = "#434940";
  context.fillRect(-7, -7, 5, 8);
  context.fillRect(3, -7, 5, 8);
  context.strokeStyle = "#a8ae8f";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(-8, -21);
  context.lineTo(-15, actor.phase === "preparing" ? -24 : -12);
  context.moveTo(8, -21);
  context.lineTo(15, actor.phase === "preparing" ? -24 : -12);
  context.stroke();
  context.strokeStyle = "#d58d72";
  context.lineWidth = 2;
  context.strokeRect(-11, -37, 22, 3);
  context.restore();
}

export function drawResponseStatus(
  context: CanvasRenderingContext2D,
  state: GameState,
  id: string,
  point: TilePosition,
  zoom: number,
): void {
  const responder = state.combat.responders[id];
  const actor = id === "SCP-049-2" ? state.combat.adversary : null;
  if (!responder?.drafted && !responder?.injuries && !actor) return;
  const phase = responder?.phase ?? actor!.phase;
  const remaining = responder?.remaining ?? actor!.remaining;
  context.save();
  context.translate(point.x, point.y);
  context.scale(zoom, zoom);
  context.strokeStyle = actor
    ? "#d78872"
    : responder!.incapacitated
      ? "#d97664"
      : "#8dc6df";
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
  context.stroke();
  if (
    responder?.drafted &&
    !responder.incapacitated &&
    (responder.order === "engage" || responder.order === "attack")
  ) {
    context.fillStyle = "#3b4949";
    context.fillRect(2, -21, 14, 3);
    context.fillRect(7, -18, 3, 4);
  }
  const health = responder?.health ?? actor!.health / 1.2;
  context.fillStyle = "#253a34";
  context.fillRect(-14, -46, 28, 4);
  context.fillStyle = health > 40 ? "#9bc8ab" : "#e19a75";
  context.fillRect(-14, -46, (28 * health) / 100, 4);
  if (phase !== "ready") {
    context.fillStyle = phase === "preparing" ? "#efd38f" : "#91bcdf";
    context.fillRect(
      -14,
      -40,
      Math.min(
        28,
        (remaining /
          (responder?.order === "stabilize"
            ? 6
            : actor && phase === "recovering"
              ? 4
              : 3)) *
          28,
      ),
      3,
    );
  }
  if (responder?.incapacitated) {
    context.fillStyle = responder.stabilized ? "#a5d9ba" : "#e1a076";
    context.fillRect(-4, -15, 8, 3);
    context.fillRect(-1.5, -18, 3, 9);
  }
  context.restore();
}
