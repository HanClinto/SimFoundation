import type { ControllerSnapshot } from "../../application/controller";
import { tileAt, type TilePosition } from "../../simulation/world";
import workerUrl from "./assets/site-worker.svg";
import scp999Url from "./assets/site-999.svg";
import { laboratoryTiles } from "../../simulation/construction";

const TILE_WIDTH = 40;
const TILE_HEIGHT = 20;

export interface MapCamera {
  readonly center: TilePosition;
  readonly zoom: number;
  readonly selectedId: string | null;
  readonly draft?: {
    readonly origin: TilePosition;
    readonly valid: boolean;
  } | null;
}

export function projectPosition(
  position: TilePosition,
  camera: MapCamera,
  width: number,
  height: number,
): TilePosition {
  const column = position.x - camera.center.x;
  const row = position.y - camera.center.y;
  return {
    x: width / 2 + (column - row) * 20 * camera.zoom,
    y: height / 2 + (column + row) * 10 * camera.zoom,
  };
}

export function unprojectPosition(
  point: TilePosition,
  camera: MapCamera,
  width: number,
  height: number,
): TilePosition {
  const horizontal = (point.x - width / 2) / (20 * camera.zoom);
  const vertical = (point.y - height / 2) / (10 * camera.zoom);
  return {
    x: camera.center.x + (horizontal + vertical) / 2,
    y: camera.center.y + (vertical - horizontal) / 2,
  };
}

interface Point {
  readonly x: number;
  readonly y: number;
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

let worker: HTMLImageElement | null = null;
let scp999: HTMLImageElement | null = null;

export function renderSite(
  canvas: HTMLCanvasElement,
  snapshot: ControllerSnapshot,
  camera: MapCamera = {
    center: { x: 62.5, y: 62.5 },
    zoom: 0.7,
    selectedId: null,
  },
): void {
  if (!worker || !scp999) {
    worker = new Image();
    scp999 = new Image();
    worker.onload = () => canvas.dispatchEvent(new Event("assets-ready"));
    scp999.onload = () => canvas.dispatchEvent(new Event("assets-ready"));
    worker.src = workerUrl;
    scp999.src = scp999Url;
  }
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || height === 0) return;
  const pixelRatio = window.devicePixelRatio || 1;
  if (
    canvas.width !== Math.round(width * pixelRatio) ||
    canvas.height !== Math.round(height * pixelRatio)
  ) {
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
  }
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.fillStyle = "#26382f";
  context.fillRect(0, 0, width, height);
  const { map, positions } = snapshot.game.world;
  const corners = [
    { x: -60, y: -60 },
    { x: width + 60, y: -60 },
    { x: -60, y: height + 60 },
    { x: width + 60, y: height + 60 },
  ].map((point) => unprojectPosition(point, camera, width, height));
  const minimumX = Math.max(
    0,
    Math.floor(Math.min(...corners.map(({ x }) => x))),
  );
  const maximumX = Math.min(
    map.width - 1,
    Math.ceil(Math.max(...corners.map(({ x }) => x))),
  );
  const minimumY = Math.max(
    0,
    Math.floor(Math.min(...corners.map(({ y }) => y))),
  );
  const maximumY = Math.min(
    map.height - 1,
    Math.ceil(Math.max(...corners.map(({ y }) => y))),
  );
  const roomColors = {
    laboratory: "#c0ccca",
    containment: "#a2aaa8",
    storage: "#c6c4b5",
    dormitory: "#b6c5b7",
    mess: "#c9c5ad",
    medical: "#c9d7d3",
    utilities: "#aab7bd",
    security: "#b7c1cc",
  };
  for (let row = minimumY; row <= maximumY; row += 1) {
    for (let column = minimumX; column <= maximumX; column += 1) {
      const point = projectPosition(
        { x: column, y: row },
        camera,
        width,
        height,
      );
      if (
        point.x < -40 ||
        point.x > width + 40 ||
        point.y < -40 ||
        point.y > height + 40
      )
        continue;
      const tile = tileAt(map, { x: column, y: row });
      const room = map.rooms.find(
        (room) =>
          column >= room.x &&
          column < room.x + room.width &&
          row >= room.y &&
          row < room.y + room.height,
      );
      const fill =
        tile === "grass"
          ? (column * 7 + row * 11) % 5 === 0
            ? "#526e4d"
            : "#5c7756"
          : tile === "wall"
            ? "#e0e3dd"
            : tile === "door"
              ? "#b69b59"
              : room
                ? roomColors[room.kind]
                : "#e0ddd0";
      context.save();
      context.translate(point.x, point.y);
      context.scale(camera.zoom, camera.zoom);
      if (tile === "wall") {
        drawTile(context, { x: 0, y: -10 }, "#727f78", "#64746b");
        context.fillStyle = "#727f78";
        context.fillRect(-20, -9, 40, 9);
      }
      drawTile(
        context,
        { x: 0, y: tile === "wall" ? -19 : -10 },
        fill,
        tile === "grass" ? "#526d4c" : "#89958d",
      );
      context.restore();
    }
  }
  context.textAlign = "center";
  for (const room of map.rooms) {
    if (camera.zoom < 0.55) continue;
    const point = projectPosition(
      { x: room.x + room.width / 2 - 0.5, y: room.y + room.height / 2 - 0.5 },
      camera,
      width,
      height,
    );
    const label = room.kind.toUpperCase();
    context.font = "10px 'Courier New', monospace";
    const labelWidth = context.measureText(label).width + 8;
    context.fillStyle = "rgba(242, 241, 223, .85)";
    context.fillRect(point.x - labelWidth / 2, point.y - 7, labelWidth, 14);
    context.fillStyle = "#38473f";
    context.fillText(label, point.x, point.y + 3);
  }
  const footprints = [
    ...snapshot.game.construction.blueprints
      .filter(({ status }) => status !== "completed" && status !== "cancelled")
      .map((blueprint) => ({
        origin: blueprint.origin,
        fill: "rgba(125, 208, 223, .38)",
        stroke: "#c0f5ff",
      })),
    ...(camera.draft
      ? [
          {
            origin: camera.draft.origin,
            fill: camera.draft.valid
              ? "rgba(161, 237, 140, .45)"
              : "rgba(250, 140, 130, .45)",
            stroke: camera.draft.valid ? "#d6ffb8" : "#ffe2d8",
          },
        ]
      : []),
  ];
  for (const footprint of footprints) {
    for (const { position, tile } of laboratoryTiles(footprint.origin)) {
      const point = projectPosition(position, camera, width, height);
      context.save();
      context.translate(point.x, point.y);
      context.scale(camera.zoom, camera.zoom);
      drawTile(
        context,
        { x: 0, y: -10 },
        footprint.fill,
        tile === "door" ? "#fff4a4" : footprint.stroke,
      );
      context.restore();
    }
  }
  for (const [id, position] of Object.entries(positions).sort(
    ([firstId, first], [secondId, second]) =>
      first.x + first.y - second.x - second.y ||
      firstId.localeCompare(secondId),
  )) {
    const point = projectPosition(position, camera, width, height);
    if (
      point.x < -40 ||
      point.x > width + 40 ||
      point.y < -40 ||
      point.y > height + 40
    )
      continue;
    const selected = id === camera.selectedId;
    if (selected) {
      context.strokeStyle = "#ffe477";
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(
        point.x,
        point.y,
        14 * camera.zoom,
        7 * camera.zoom,
        0,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }
    const image = id === "SCP-999" ? scp999 : worker;
    const spriteWidth = (id === "SCP-999" ? 32 : 24) * camera.zoom;
    const spriteHeight = (id === "SCP-999" ? 26 : 36) * camera.zoom;
    if (image.complete && image.naturalWidth > 0)
      context.drawImage(
        image,
        point.x - spriteWidth / 2,
        point.y - spriteHeight + 4 * camera.zoom,
        spriteWidth,
        spriteHeight,
      );
    if (selected) {
      const label =
        snapshot.game.personnel.find((person) => person.id === id)?.name ?? id;
      context.font = "bold 12px 'Courier New', monospace";
      const labelWidth = context.measureText(label).width + 10;
      context.fillStyle = "#fff9d9";
      context.fillRect(point.x - labelWidth / 2, point.y + 10, labelWidth, 18);
      context.fillStyle = "#24382d";
      context.fillText(label, point.x, point.y + 23);
    }
  }
  context.textAlign = "start";
}
