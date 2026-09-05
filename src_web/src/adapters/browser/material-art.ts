import type {
  MaterialId,
  TileSurfaces,
  Surface,
} from "../../simulation/materials";
import type { TileKind } from "../../simulation/world";

export const MATERIAL_ART = {
  concrete: {
    top: "#d5d6ce",
    side: "#8b9187",
    edge: "#697369",
    mark: "#a1a69b",
    light: "#e8e9e1",
  },
  steel: {
    top: "#a8c5d3",
    side: "#526e80",
    edge: "#334e61",
    mark: "#607f94",
    light: "#e1f0f5",
  },
  ceramic: {
    top: "#f0e9d5",
    side: "#b5aa91",
    edge: "#8e826b",
    mark: "#b5a88d",
    light: "#fffaf0",
  },
  composite: {
    top: "#719c8b",
    side: "#3e6659",
    edge: "#294c40",
    mark: "#416d5b",
    light: "#accbbb",
  },
} as const;

export function visibleSurface(
  cell: TileSurfaces | undefined,
  tile: TileKind,
): Surface | null {
  const surface =
    tile === "wall" || tile === "door" || tile === "closed-door"
      ? cell?.structure
      : tile === "floor"
        ? cell?.floor
        : null;
  return surface && surface.integrity > 0 ? surface : null;
}

export function drawMaterialSides(
  context: CanvasRenderingContext2D,
  material: MaterialId,
  detail: boolean,
): void {
  const art = MATERIAL_ART[material];
  context.fillStyle = art.side;
  context.strokeStyle = art.edge;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(-20, -9);
  context.lineTo(0, 1);
  context.lineTo(20, -9);
  context.lineTo(20, 0);
  context.lineTo(0, 10);
  context.lineTo(-20, 0);
  context.closePath();
  context.fill();
  context.stroke();
  if (!detail) return;
  context.beginPath();
  context.moveTo(0, 1);
  context.lineTo(0, 10);
  if (material !== "concrete") {
    for (const horizontal of [-10, 10]) {
      const top = 1 - Math.abs(horizontal) / 2;
      context.moveTo(horizontal, top);
      context.lineTo(horizontal, top + 9);
    }
  }
  context.stroke();
  if (material === "steel") {
    context.fillStyle = art.light;
    for (const horizontal of [-16, -4, 4, 16])
      context.fillRect(horizontal, 4 - Math.abs(horizontal) / 2, 1.5, 1.5);
  }
}

export function drawMaterialTop(
  context: CanvasRenderingContext2D,
  material: MaterialId,
  raised: boolean,
): void {
  const art = MATERIAL_ART[material];
  const top = raised ? -19 : -10;
  const point = (across: number, down: number) => ({
    x: (across - down) * 20,
    y: top + (across + down) * 10,
  });
  const line = (
    across: number,
    down: number,
    endAcross: number,
    endDown: number,
  ) => {
    const start = point(across, down);
    const end = point(endAcross, endDown);
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
  };
  context.save();
  context.strokeStyle = art.mark;
  context.lineWidth = 0.8;
  context.beginPath();
  if (material === "concrete") {
    line(0.5, 0.05, 0.5, 0.95);
  } else if (material === "steel") {
    line(0.5, 0.04, 0.5, 0.96);
    line(0.08, 0.08, 0.92, 0.08);
    line(0.92, 0.08, 0.92, 0.92);
  } else if (material === "ceramic") {
    for (const division of [1 / 3, 2 / 3]) {
      line(division, 0, division, 1);
      line(0, division, 1, division);
    }
  } else {
    context.lineWidth = 1.5;
    for (const division of [0.2, 0.4, 0.6, 0.8])
      line(0.1, division, 0.9, division);
  }
  context.stroke();
  if (material === "steel" || material === "concrete") {
    context.fillStyle = material === "steel" ? art.edge : art.mark;
    for (const [across, down] of material === "steel"
      ? [
          [0.15, 0.15],
          [0.85, 0.15],
          [0.15, 0.85],
          [0.85, 0.85],
        ]
      : [
          [0.22, 0.3],
          [0.75, 0.6],
          [0.35, 0.8],
        ]) {
      const mark = point(across!, down!);
      context.fillRect(mark.x - 0.7, mark.y - 0.7, 1.4, 1.4);
    }
  }
  if (material === "steel" || material === "ceramic") {
    context.strokeStyle = art.light;
    context.beginPath();
    line(0.08, 0.03, 0.92, 0.03);
    context.stroke();
  }
  context.restore();
}
