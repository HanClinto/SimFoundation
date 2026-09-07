import type { GameState } from "../../simulation/state";
import { isElectrical, powerNetwork } from "../../simulation/power";
import type { TilePosition } from "../../simulation/world";

export function drawPowerNetwork(
  context: CanvasRenderingContext2D,
  state: GameState,
  recorded: boolean,
  zoom: number,
  project: (position: TilePosition) => TilePosition,
): void {
  const devices = state.objects.items
    .filter(isElectrical)
    .filter((item) => item.installed && item.location.kind === "ground");
  const occupied = new Set(
    devices.map((item) =>
      item.location.kind === "ground"
        ? `${item.location.position.x},${item.location.position.y}`
        : "",
    ),
  );
  const power = recorded ? null : powerNetwork(state);
  context.save();
  context.lineWidth = Math.max(1.5, 3 * zoom);
  for (const item of devices) {
    if (item.location.kind !== "ground") continue;
    const position = item.location.position;
    const point = project(position);
    const status = power?.readings[item.id]?.status;
    const color = recorded
      ? "#a5b3ad"
      : status === "powered"
        ? "#70d6b0"
        : status === "damaged" || status === "overloaded"
          ? "#e17a67"
          : "#d9b95c";
    context.strokeStyle = color;
    context.fillStyle = color;
    context.beginPath();
    for (const [horizontal, vertical] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const neighbor = {
        x: position.x + horizontal!,
        y: position.y + vertical!,
      };
      if (!occupied.has(`${neighbor.x},${neighbor.y}`)) continue;
      const end = project({
        x: position.x + horizontal! / 2,
        y: position.y + vertical! / 2,
      });
      context.moveTo(point.x, point.y);
      context.lineTo(end.x, end.y);
    }
    context.stroke();
    context.fillRect(
      point.x - 2 * zoom,
      point.y - 2 * zoom,
      4 * zoom,
      4 * zoom,
    );
    if (item.condition <= 0) {
      context.strokeRect(
        point.x - 5 * zoom,
        point.y - 5 * zoom,
        10 * zoom,
        10 * zoom,
      );
    }
  }
  context.restore();
}
