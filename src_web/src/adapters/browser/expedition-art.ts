import type { GameState } from "../../simulation_legacy/state";
import { EXPEDITION_ASSEMBLY } from "../../simulation_legacy/expeditions";
import { expeditionScenario } from "../../simulation_legacy/expedition-site";
import type { TilePosition } from "../../simulation_legacy/world";

export function drawExpeditionMarker(
  context: CanvasRenderingContext2D,
  state: GameState,
  zoom: number,
  project: (position: TilePosition) => TilePosition,
): void {
  const active = state.expeditions.active;
  if (!active) return;
  const field = active.site?.world.map.id === state.world.map.id;
  const point = project(
    field
      ? expeditionScenario(active.noticeId).extraction
      : EXPEDITION_ASSEMBLY,
  );
  context.save();
  context.translate(point.x, point.y);
  context.scale(zoom, zoom);
  context.strokeStyle = "#a9dfe0";
  context.fillStyle = "rgba(71, 125, 132, .3)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -13);
  context.lineTo(26, 0);
  context.lineTo(0, 13);
  context.lineTo(-26, 0);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#d9f2dc";
  context.fillRect(-10, -2, 20, 4);
  context.fillRect(5, -5, 4, 10);
  context.font = "bold 10px 'Courier New', monospace";
  context.textAlign = "center";
  context.fillText(
    field
      ? "EXTRACTION"
      : active.phase === "assembling"
        ? "ASSEMBLY"
        : "EXPEDITION TRANSIT",
    0,
    26,
  );
  context.restore();
}
