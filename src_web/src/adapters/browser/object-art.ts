import {
  OBJECT_DEFINITIONS,
  objectFootprint,
  objectPosition,
} from "../../simulation/objects";
import type { GameState } from "../../simulation/state";
import type { TilePosition } from "../../simulation/world";

export function drawPhysicalObjects(
  context: CanvasRenderingContext2D,
  state: GameState,
  zoom: number,
  recorded: boolean,
  project: (position: TilePosition) => TilePosition,
  images: ReadonlyMap<string, HTMLImageElement>,
): void {
  for (const item of state.objects.items) {
    const position = objectPosition(item, state.world.positions);
    if (!position || item.location.kind === "carried") continue;
    const point = project(position);
    const kind = OBJECT_DEFINITIONS[item.kind].activity;
    const image = kind ? images.get(kind) : null;
    context.save();
    context.globalAlpha =
      !recorded ||
      state.observations.objects[item.id]?.observedTick === state.tick
        ? 1
        : 0.45;
    if (item.installed && image?.complete && image.naturalWidth > 0) {
      context.strokeStyle = "#526e5c";
      context.lineWidth = 1;
      for (const tile of objectFootprint(item, position)) {
        const corner = project(tile);
        context.beginPath();
        context.moveTo(corner.x, corner.y - 10 * zoom);
        context.lineTo(corner.x + 20 * zoom, corner.y);
        context.lineTo(corner.x, corner.y + 10 * zoom);
        context.lineTo(corner.x - 20 * zoom, corner.y);
        context.closePath();
        context.stroke();
      }
      context.translate(point.x, point.y);
      if (item.orientation === "east" || item.orientation === "south")
        context.scale(-1, 1);
      context.drawImage(image, -22 * zoom, -24 * zoom, 44 * zoom, 32 * zoom);
    } else {
      context.fillStyle =
        item.kind === "meals"
          ? "#e2c677"
          : item.kind === "materials"
            ? "#91afbc"
            : "#b4a08a";
      context.strokeStyle = "#3c5148";
      context.lineWidth = 1;
      context.fillRect(
        point.x - 11 * zoom,
        point.y - 19 * zoom,
        22 * zoom,
        18 * zoom,
      );
      context.strokeRect(
        point.x - 11 * zoom,
        point.y - 19 * zoom,
        22 * zoom,
        18 * zoom,
      );
      context.beginPath();
      context.moveTo(point.x, point.y - 19 * zoom);
      context.lineTo(point.x, point.y - zoom);
      context.stroke();
      context.font = "bold 10px 'Courier New', monospace";
      context.textAlign = "center";
      context.fillStyle = "#183b2b";
      context.fillText(
        item.quantity > 1 ? String(item.quantity) : "P",
        point.x,
        point.y + 11,
      );
    }
    context.restore();
  }
}
