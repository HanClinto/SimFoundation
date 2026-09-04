import type { ControllerSnapshot } from "../../application/controller";

const TILE_WIDTH = 56;
const TILE_HEIGHT = 28;
const GRID_SIZE = 11;

interface Point {
  readonly x: number;
  readonly y: number;
}

function projectTile(column: number, row: number, origin: Point): Point {
  return {
    x: origin.x + (column - row) * (TILE_WIDTH / 2),
    y: origin.y + (column + row) * (TILE_HEIGHT / 2),
  };
}

function drawTile(
  context: CanvasRenderingContext2D,
  point: Point,
  fill: string,
  stroke = "#243038",
): void {
  context.beginPath();
  context.moveTo(point.x, point.y);
  context.lineTo(point.x + TILE_WIDTH / 2, point.y + TILE_HEIGHT / 2);
  context.lineTo(point.x, point.y + TILE_HEIGHT);
  context.lineTo(point.x - TILE_WIDTH / 2, point.y + TILE_HEIGHT / 2);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 1;
  context.stroke();
}

function drawPawn(
  context: CanvasRenderingContext2D,
  point: Point,
  color: string,
): void {
  context.save();
  context.translate(point.x, point.y + 3);

  context.fillStyle = "rgba(0, 0, 0, 0.28)";
  context.beginPath();
  context.ellipse(0, 16, 11, 5, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = color;
  context.fillRect(-7, -2, 14, 17);
  context.fillStyle = "#d9aa7e";
  context.beginPath();
  context.arc(0, -7, 7, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#20272b";
  context.stroke();

  context.restore();
}

function drawContainmentMarker(
  context: CanvasRenderingContext2D,
  point: Point,
): void {
  context.save();
  context.translate(point.x, point.y - 3);
  context.fillStyle = "#2d3338";
  context.fillRect(-19, -9, 38, 25);
  context.fillStyle = "#171b1e";
  context.fillRect(-13, -3, 26, 19);
  context.strokeStyle = "#e4bc48";
  context.lineWidth = 3;
  context.strokeRect(-19, -9, 38, 25);
  context.fillStyle = "#e4bc48";
  context.fillRect(-2, 1, 4, 10);
  context.restore();
}

export function renderSite(
  canvas: HTMLCanvasElement,
  snapshot: ControllerSnapshot,
): void {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#16232a";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const origin = { x: canvas.width / 2, y: 58 };
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let column = 0; column < GRID_SIZE; column += 1) {
      const inFacility = column >= 2 && column <= 8 && row >= 2 && row <= 8;
      const corridor = inFacility && (column === 5 || row === 5);
      const fill = corridor ? "#90999b" : inFacility ? "#657276" : "#496a55";
      drawTile(context, projectTile(column, row, origin), fill);
    }
  }

  drawContainmentMarker(context, projectTile(7, 3, origin));

  const patrolOffset = snapshot.game.tick % 6;
  drawPawn(context, projectTile(3 + patrolOffset, 6, origin), "#e5e8eb");
  drawPawn(context, projectTile(4, 7, origin), "#7897b8");

  context.fillStyle = "rgba(0, 0, 0, 0.7)";
  context.fillRect(18, 18, 244, 54);
  context.fillStyle = "#f3f3f3";
  context.font = "bold 18px Georgia, serif";
  context.fillText("SITE 828 / LEVEL B1", 32, 42);
  context.fillStyle = "#bdc9cc";
  context.font = "13px 'Courier New', monospace";
  context.fillText("VISUAL SYSTEM CALIBRATION", 32, 61);
}
