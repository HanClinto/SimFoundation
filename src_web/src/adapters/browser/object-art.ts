import {
  OBJECT_DEFINITIONS,
  objectFootprint,
  objectPosition,
  type PhysicalObject,
} from "../../simulation/objects";
import type { GameState } from "../../simulation/state";
import type { TilePosition } from "../../simulation/world";
import { MATERIALS } from "../../simulation/materials";
import { isElectrical, powerNetwork } from "../../simulation/power";

export function vesselAppearance(
  item: PhysicalObject,
): "open" | "sealed" | "worn" | "critical" | "breached" {
  if (item.condition <= 0) return "breached";
  if (!item.vessel?.sealed) return "open";
  return item.condition <= 25
    ? "critical"
    : item.condition < 70
      ? "worn"
      : "sealed";
}

export function drawObjectGlyph(
  context: CanvasRenderingContext2D,
  item: PhysicalObject,
): void {
  context.save();
  context.strokeStyle = "#35443e";
  context.lineWidth = 1.5;
  if (item.kind === "generator") {
    context.fillStyle = "#749392";
    context.fillRect(-16, -25, 32, 23);
    context.strokeRect(-16, -25, 32, 23);
    context.fillStyle = "#344c49";
    for (let vent = 0; vent < 4; vent += 1)
      context.fillRect(-12, -21 + vent * 4, 14, 2);
    context.fillStyle = "#ddd7a8";
    context.fillRect(6, -21, 6, 7);
    context.fillStyle = "#394846";
    context.fillRect(-13, -2, 5, 4);
    context.fillRect(8, -2, 5, 4);
  } else if (item.kind === "cable") {
    context.strokeStyle = "#bd9c51";
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(0, -10, 10, 7, 0, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "#344943";
    context.fillRect(-3, -18, 6, 16);
  } else if (item.kind === "light") {
    context.fillStyle = "#5d7575";
    context.fillRect(-3, -26, 6, 24);
    context.fillRect(-9, -3, 18, 4);
    context.fillStyle = "#d9ded5";
    context.fillRect(-12, -30, 24, 8);
    context.strokeRect(-12, -30, 24, 8);
    context.fillStyle = "#fff1b5";
    context.fillRect(-10, -27, 20, 4);
  } else if (item.kind === "vessel" && item.vessel) {
    const appearance = vesselAppearance(item);
    context.fillStyle = MATERIALS[item.vessel.material].color;
    context.fillRect(-15, -22, 30, 20);
    context.strokeRect(-15, -22, 30, 20);
    context.strokeRect(-19, -17, 4, 8);
    context.strokeRect(15, -17, 4, 8);
    if (!item.vessel.sealed) {
      context.fillStyle = "#263b35";
      context.fillRect(-12, -24, 24, 7);
      context.fillStyle = MATERIALS[item.vessel.material].color;
      context.fillRect(-16, -34, 32, 7);
      context.strokeRect(-16, -34, 32, 7);
    } else {
      context.fillStyle =
        appearance === "breached"
          ? "#c24e43"
          : appearance === "critical"
            ? "#d4a53a"
            : "#317d66";
      context.fillRect(-16, -27, 32, 6);
      context.strokeRect(-16, -27, 32, 6);
      context.fillStyle = "#e4ddc2";
      context.fillRect(-11, -26, 4, 9);
      context.fillRect(7, -26, 4, 9);
    }
    if (item.condition < 70) {
      context.strokeStyle = "#665448";
      context.beginPath();
      context.moveTo(-6, -20);
      context.lineTo(-2, -15);
      context.lineTo(-5, -10);
      context.lineTo(1, -5);
      context.stroke();
    }
    if (item.condition <= 25) {
      context.fillStyle = appearance === "breached" ? "#202e28" : "#a36b42";
      context.beginPath();
      context.moveTo(2, -22);
      context.lineTo(10, -18);
      context.lineTo(5, -12);
      context.lineTo(12, -5);
      context.lineTo(1, -10);
      context.closePath();
      context.fill();
    }
  } else if (item.kind === "materials") {
    for (let bundle = 0; bundle < 3; bundle += 1) {
      context.fillStyle = bundle === 2 ? "#bad0d6" : "#82a9be";
      context.fillRect(-13 + bundle * 2, -9 - bundle * 5, 24, 6);
      context.strokeRect(-13 + bundle * 2, -9 - bundle * 5, 24, 6);
    }
    context.fillStyle = "#475b60";
    context.fillRect(-6, -19, 3, 16);
    context.fillRect(7, -19, 3, 16);
  } else if (item.kind === "meals") {
    context.fillStyle = "#e2c677";
    context.fillRect(-11, -19, 22, 17);
    context.strokeRect(-11, -19, 22, 17);
    context.fillStyle = "#f3e5bd";
    context.fillRect(-10, -18, 20, 3);
    context.fillRect(-10, -6, 20, 3);
    context.fillStyle = "#527b59";
    context.fillRect(-5, -13, 10, 5);
  } else if (item.kind === "bed") {
    context.fillStyle = "#b7cec7";
    context.fillRect(-16, -20, 32, 16);
    context.strokeRect(-16, -20, 32, 16);
    context.fillStyle = "#f1eedc";
    context.fillRect(-14, -18, 7, 12);
    context.fillStyle = "#786b52";
    context.fillRect(-3, -20, 3, 16);
    context.fillRect(9, -20, 3, 16);
  } else {
    context.fillStyle = item.kind === "meal-seat" ? "#c4ba91" : "#86b4a3";
    context.fillRect(-10, -24, 20, 14);
    context.strokeRect(-10, -24, 20, 14);
    context.fillRect(-12, -12, 24, 6);
    context.strokeRect(-12, -12, 24, 6);
    context.fillStyle = "#52655b";
    context.fillRect(-9, -6, 3, 5);
    context.fillRect(6, -6, 3, 5);
    context.fillStyle = "#e0d3a8";
    context.fillRect(-2, -24, 4, 23);
    if (item.kind === "meal-seat") {
      context.fillRect(-14, -18, 28, 4);
      context.strokeRect(-14, -18, 28, 4);
    }
  }
  if (isElectrical(item) && item.condition < 100) {
    context.strokeStyle = item.condition <= 0 ? "#d45e4e" : "#8f623f";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-7, -20);
    context.lineTo(1, -13);
    context.lineTo(-3, -9);
    context.lineTo(8, -4);
    context.stroke();
  }
  context.restore();
}

export function drawPhysicalObjects(
  context: CanvasRenderingContext2D,
  state: GameState,
  zoom: number,
  recorded: boolean,
  project: (position: TilePosition) => TilePosition,
  images: ReadonlyMap<string, HTMLImageElement>,
  items: readonly PhysicalObject[] = state.objects.items,
): void {
  for (const item of items) {
    const position = objectPosition(item, state.world.positions);
    if (
      !position ||
      item.location.kind === "carried" ||
      item.location.kind === "contained" ||
      (item.kind === "cable" && item.installed)
    )
      continue;
    const point = project(position);
    const kind = OBJECT_DEFINITIONS[item.kind].activity;
    const image = kind ? images.get(kind) : null;
    context.save();
    context.globalAlpha =
      !recorded ||
      state.observations.objects[item.id]?.observedTick === state.tick
        ? 1
        : 0.45;
    if (item.kind === "vessel" && item.vessel) {
      context.translate(point.x, point.y);
      context.scale(zoom, zoom);
      drawObjectGlyph(context, item);
    } else if (item.installed && image?.complete && image.naturalWidth > 0) {
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
      context.save();
      context.translate(point.x, point.y);
      context.scale(zoom, zoom);
      drawObjectGlyph(context, item);
      if (isElectrical(item) && item.installed && !recorded) {
        const status = powerNetwork(state).readings[item.id]?.status;
        context.fillStyle =
          status === "powered"
            ? "#f8efb5"
            : status === "overloaded" || status === "damaged"
              ? "#d45e4e"
              : "#52635f";
        if (item.kind === "light") context.fillRect(-10, -27, 20, 4);
        else context.fillRect(7, -20, 4, 5);
      }
      context.restore();
      context.font = "bold 10px 'Courier New', monospace";
      context.textAlign = "center";
      context.fillStyle = "#183b2b";
      context.fillText(
        item.quantity > 1 ? String(item.quantity) : "",
        point.x,
        point.y + 11,
      );
    }
    context.restore();
  }
}
