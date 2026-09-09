import type { GameState } from "../../simulation_legacy/state";
import { pawnPortrait } from "./pawn-art";
import { drawObjectGlyph } from "./object-art";
import { drawAdversary } from "./combat-art";
import { MATERIAL_ART } from "./material-art";
import type { TilePosition } from "../../simulation_legacy/world";
import fallback from "./assets/folder.svg";
import resident from "./assets/site-999.svg";
import camera from "./assets/camera.svg";

const thumbnails = new Map<string, string>();
export function targetThumbnail(
  state: GameState,
  id: string,
  position?: TilePosition,
): string {
  if (state.personnel.some((person) => person.id === id))
    return pawnPortrait(id);
  if (
    state.entities.some(
      (entity) => entity.id === id && entity.definitionId === "scp-999",
    )
  )
    return resident;
  if (state.observations.cameras.some((entry) => entry.id === id))
    return camera;
  const item = id.startsWith("object:")
    ? state.objects.items.find((entry) => `object:${entry.id}` === id)
    : undefined;
  const adversary = id === "SCP-049-2" ? state.combat.adversary : null;
  const floor = id.startsWith("tile:");
  const material =
    floor && position
      ? (state.world.map.surfaces[
          position.y * state.world.map.width + position.x
        ]?.floor?.material ?? "concrete")
      : "concrete";
  const key = item
    ? JSON.stringify([item.kind, item.condition, item.vessel])
    : adversary
      ? `adversary:${adversary.health <= 0}`
      : floor
        ? `floor:${material}`
        : "unknown";
  if (key === "unknown" || typeof CanvasRenderingContext2D === "undefined")
    return fallback;
  const cached = thumbnails.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 48;
  const context = canvas.getContext("2d");
  if (!context) return fallback;
  if (adversary) drawAdversary(context, adversary, { x: 24, y: 42 }, 1, false);
  else {
    context.translate(24, 38);
    if (item) drawObjectGlyph(context, item);
    else {
      context.fillStyle = MATERIAL_ART[material].top;
      context.strokeStyle = MATERIAL_ART[material].edge;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(0, -28);
      context.lineTo(21, -16);
      context.lineTo(0, -4);
      context.lineTo(-21, -16);
      context.closePath();
      context.fill();
      context.stroke();
    }
  }
  const source = canvas.toDataURL();
  if (thumbnails.size >= 128) thumbnails.clear();
  thumbnails.set(key, source);
  return source;
}
