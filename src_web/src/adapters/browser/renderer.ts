import type { ControllerSnapshot } from "../../application/controller";
import { type TilePosition } from "../../simulation/world";
import { observedSnapshot } from "./observed-view";
import workerUrl from "./assets/site-worker.svg";
import scp999Url from "./assets/site-999.svg";
import bedUrl from "./assets/station-bed.svg";
import mealUrl from "./assets/station-meal.svg";
import breakUrl from "./assets/station-break.svg";
import cameraUrl from "./assets/camera.svg";
import { MATERIALS, type SurfaceLayer } from "../../simulation/materials";
import { cameraInstalled } from "../../simulation/observations";
import { laboratoryTiles } from "../../simulation/construction";
import { exposureTiles } from "../../simulation/environment";
import { mapObjects } from "./map-objects";
import {
  DEFAULT_MAP_OVERLAYS,
  type MapBase,
  type MapOverlay,
  type MapPerspective,
} from "./map-settings";
import type { PlacementTile } from "./placement";
import { storageTiles } from "../../simulation/storage";
import { drawPhysicalObjects } from "./object-art";
import { layoutPawnBubbles, drawPawnBubbles } from "./pawn-bubbles";
import {
  MATERIAL_ART,
  visibleSurface,
  drawMaterialSides,
  drawMaterialTop,
} from "./material-art";

import { spaceProjection } from "./space-projection";

const TILE_WIDTH = 40;
const TILE_HEIGHT = 20;

export interface MapCamera {
  readonly center: TilePosition;
  readonly zoom: number;
  readonly selectedId: string | null;
  readonly perspective?: MapPerspective;
  readonly base?: MapBase;
  readonly overlays?: Readonly<Record<MapOverlay, boolean>>;
  readonly surfaceLayer?: SurfaceLayer;
  readonly draft?: {
    readonly tiles: readonly PlacementTile[];
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
const stationImages = new Map<string, HTMLImageElement>();

export function renderSite(
  canvas: HTMLCanvasElement,
  snapshot: ControllerSnapshot,
  camera: MapCamera = {
    center: { x: 62.5, y: 62.5 },
    zoom: 0.7,
    selectedId: null,
  },
): void {
  const recorded = camera.perspective === "recorded";
  const overlays = camera.overlays ?? DEFAULT_MAP_OVERLAYS;
  if (recorded) snapshot = observedSnapshot(snapshot);
  if (!worker || !scp999) {
    worker = new Image();
    scp999 = new Image();
    worker.onload = () => canvas.dispatchEvent(new Event("assets-ready"));
    scp999.onload = () => canvas.dispatchEvent(new Event("assets-ready"));
    worker.src = workerUrl;
    scp999.src = scp999Url;
    for (const [kind, url] of [
      ["sleep", bedUrl],
      ["meal", mealUrl],
      ["break", breakUrl],
      ["camera", cameraUrl],
    ]) {
      const image = new Image();
      image.onload = () => canvas.dispatchEvent(new Event("assets-ready"));
      image.src = url!;
      stationImages.set(kind!, image);
    }
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
  const knowledge = recorded
    ? snapshot.game.observations
    : {
        ...snapshot.game.observations,
        knownTiles: map.tiles,
        knownSurfaces: map.surfaces,
      };
  const visibleTiles = new Set(
    recorded || overlays.coverage
      ? knowledge.visibleTiles
      : map.tiles.map((_, index) => index),
  );
  const visibleEntities = new Set(knowledge.visibleEntityIds);
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
      const recordedTile = knowledge.knownTiles[row * map.width + column];
      if (recordedTile == null) continue;
      const surface =
        knowledge.knownSurfaces[row * map.width + column]?.[
          camera.surfaceLayer ?? "structure"
        ];
      const tile =
        camera.surfaceLayer === "floor"
          ? surface && surface.integrity > 0
            ? "floor"
            : "grass"
          : recordedTile;
      const room = map.rooms.find(
        (room) =>
          column >= room.x &&
          column < room.x + room.width &&
          row >= room.y &&
          row < room.y + room.height,
      );
      const installed = visibleSurface(
        knowledge.knownSurfaces[row * map.width + column],
        tile,
      );
      const art = installed ? MATERIAL_ART[installed.material] : null;
      const fill =
        camera.base === "materials"
          ? surface
            ? MATERIALS[surface.material].color
            : "#657c6d"
          : tile === "grass"
            ? (column * 7 + row * 11) % 5 === 0
              ? "#526e4d"
              : "#5c7756"
            : installed?.material === "concrete" && tile === "floor" && room
              ? roomColors[room.kind]
              : (art?.top ?? "#e0ddd0");
      context.save();
      context.globalAlpha =
        (!recorded && !overlays.coverage) ||
        visibleTiles.has(row * map.width + column)
          ? 1
          : 0.48;
      context.translate(point.x, point.y);
      context.scale(camera.zoom, camera.zoom);
      const raised = tile === "wall" || tile === "closed-door";
      if (raised && installed)
        drawMaterialSides(context, installed.material, camera.zoom >= 0.55);
      drawTile(
        context,
        { x: 0, y: raised ? -19 : -10 },
        fill,
        tile === "grass" ? "#526d4c" : (art?.edge ?? "#89958d"),
      );
      if (installed && camera.zoom >= 0.55)
        drawMaterialTop(context, installed.material, raised);
      if (tile === "door" || tile === "closed-door") {
        context.strokeStyle = "#dfbc52";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(-12, raised ? -5 : 4);
        context.lineTo(0, raised ? 1 : 10);
        context.lineTo(12, raised ? -5 : 4);
        context.stroke();
      }
      context.restore();
    }
  }
  if (overlays.condition) {
    for (const [key, cell] of Object.entries(knowledge.knownSurfaces)) {
      const index = Number(key);
      const position = {
        x: index % map.width,
        y: Math.floor(index / map.width),
      };
      if (
        position.x < minimumX ||
        position.x > maximumX ||
        position.y < minimumY ||
        position.y > maximumY
      )
        continue;
      const reading = cell[camera.surfaceLayer ?? "structure"];
      if (!reading || reading.integrity === 100) continue;
      const point = projectPosition(position, camera, width, height);
      context.save();
      context.globalAlpha =
        !recorded || knowledge.tileLastSeen[index] === snapshot.game.tick
          ? 1
          : 0.55;
      context.translate(point.x, point.y);
      context.scale(camera.zoom, camera.zoom);
      context.strokeStyle =
        reading.integrity === 0
          ? "#d46056"
          : reading.integrity <= 55
            ? "#eac65f"
            : "#8fcab6";
      context.lineWidth = 3;
      context.strokeRect(-16, -18, 32, 18);
      context.font = "bold 11px 'Courier New', monospace";
      context.textAlign = "center";
      context.fillStyle = "#152b26";
      context.fillText(`${Math.round(reading.integrity)}%`, 0, -6);
      context.restore();
    }
  }
  context.textAlign = "center";
  if (overlays.storage)
    for (const area of snapshot.game.storage.areas) {
      for (const position of storageTiles(area)) {
        const point = projectPosition(position, camera, width, height);
        context.save();
        context.translate(point.x, point.y);
        context.scale(camera.zoom, camera.zoom);
        drawTile(
          context,
          { x: 0, y: -10 },
          area.enabled ? "rgba(84, 169, 190, .25)" : "rgba(145, 145, 145, .25)",
          area.serveMeals ? "#e2bd54" : "#458fa0",
        );
        context.restore();
      }
    }
  if (overlays.spaces) {
    const topology = spaceProjection(
      map.width,
      map.height,
      knowledge.knownTiles,
    );
    const colors = [
      "rgba(40, 157, 134, .3)",
      "rgba(198, 153, 43, .3)",
      "rgba(73, 133, 202, .3)",
      "rgba(192, 98, 124, .3)",
    ];
    for (let row = minimumY; row <= maximumY; row += 1) {
      for (let column = minimumX; column <= maximumX; column += 1) {
        const index = row * map.width + column;
        if (!["floor", "door"].includes(knowledge.knownTiles[index] ?? ""))
          continue;
        const id = topology.spaceByTile[index];
        if (id == null) continue;
        const space = topology.spaces[id]!;
        const point = projectPosition(
          { x: column, y: row },
          camera,
          width,
          height,
        );
        context.save();
        context.translate(point.x, point.y);
        context.scale(camera.zoom, camera.zoom);
        drawTile(
          context,
          { x: 0, y: -10 },
          space.reachesEdge
            ? "rgba(205, 103, 65, .3)"
            : space.touchesUnknown
              ? "rgba(130, 130, 130, .3)"
              : colors[space.tiles[0]! % colors.length]!,
          space.reachesEdge
            ? "#b46847"
            : space.touchesUnknown
              ? "#777777"
              : "#397f74",
        );
        context.restore();
      }
    }
  }
  if (overlays.exposure && !recorded) {
    const reached = new Set(
      snapshot.game.environment.sources.flatMap((source) =>
        exposureTiles(snapshot.game, source).map(
          (position) => position.y * map.width + position.x,
        ),
      ),
    );
    for (const index of reached) {
      const position = {
        x: index % map.width,
        y: Math.floor(index / map.width),
      };
      if (
        position.x < minimumX ||
        position.x > maximumX ||
        position.y < minimumY ||
        position.y > maximumY
      )
        continue;
      const point = projectPosition(position, camera, width, height);
      context.save();
      context.translate(point.x, point.y);
      context.scale(camera.zoom, camera.zoom);
      drawTile(context, { x: 0, y: -10 }, "rgba(210, 75, 62, .28)", "#e49552");
      context.restore();
    }
  }
  for (const room of overlays.rooms ? map.rooms : []) {
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
  if (overlays.objects)
    drawPhysicalObjects(
      context,
      snapshot.game,
      camera.zoom,
      recorded,
      (position) => projectPosition(position, camera, width, height),
      stationImages,
    );
  for (const source of overlays.objects
    ? snapshot.game.environment.sources
    : []) {
    if (
      knowledge.knownTiles[source.position.y * map.width + source.position.x] !=
      null
    ) {
      const point = projectPosition(source.position, camera, width, height);
      context.save();
      context.globalAlpha = visibleTiles.has(
        source.position.y * map.width + source.position.x,
      )
        ? 1
        : 0.45;
      context.translate(point.x, point.y);
      context.scale(camera.zoom, camera.zoom);
      drawTile(
        context,
        { x: 0, y: -10 },
        source.enabled === false ? "#adb3b0" : "#d9b564",
        "#6d4b26",
      );
      context.font = "bold 10px 'Courier New', monospace";
      context.fillStyle = "#172e25";
      context.fillText(
        source.enabled === false ? "OFF" : source.kind.toUpperCase(),
        0,
        -16,
      );
      context.restore();
    }
  }
  const footprints = [
    ...(overlays.projects ? snapshot.game.construction.blueprints : [])
      .filter(({ status }) => status !== "completed" && status !== "cancelled")
      .map((blueprint) => ({
        tiles: laboratoryTiles(blueprint.origin).map((tile) => ({
          position: tile.position,
          entrance: tile.tile === "door",
        })),
        fill: "rgba(125, 208, 223, .38)",
        stroke: "#c0f5ff",
      })),
    ...(camera.draft
      ? [
          {
            tiles: camera.draft.tiles,
            fill: camera.draft.valid
              ? "rgba(161, 237, 140, .45)"
              : "rgba(250, 140, 130, .45)",
            stroke: camera.draft.valid ? "#d6ffb8" : "#ffe2d8",
          },
        ]
      : []),
  ];
  for (const footprint of footprints) {
    for (const { position, entrance } of footprint.tiles) {
      const point = projectPosition(position, camera, width, height);
      context.save();
      context.translate(point.x, point.y);
      context.scale(camera.zoom, camera.zoom);
      drawTile(
        context,
        { x: 0, y: -10 },
        footprint.fill,
        entrance ? "#fff4a4" : footprint.stroke,
      );
      context.restore();
    }
  }
  const cameraImage = stationImages.get("camera");
  if (
    overlays.objects &&
    cameraImage?.complete &&
    cameraImage.naturalWidth > 0
  ) {
    for (const device of knowledge.cameras) {
      const point = projectPosition(device.position, camera, width, height);
      context.save();
      context.globalAlpha =
        cameraInstalled(snapshot.game, device) && device.enabled ? 1 : 0.4;
      context.drawImage(
        cameraImage,
        point.x - 10 * camera.zoom,
        point.y - 24 * camera.zoom,
        20 * camera.zoom,
        20 * camera.zoom,
      );
      context.restore();
    }
  }
  for (const [id, position] of Object.entries(
    overlays.objects ? positions : {},
  ).sort(
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
    const live = !recorded || visibleEntities.has(id);
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
    const spriteWidth = (id === "SCP-999" ? 52 : 24) * camera.zoom;
    const spriteHeight = (id === "SCP-999" ? 30 : 36) * camera.zoom;
    if (live && image.complete && image.naturalWidth > 0)
      context.drawImage(
        image,
        point.x - spriteWidth / 2,
        point.y - spriteHeight + 4 * camera.zoom,
        spriteWidth,
        spriteHeight,
      );
    if (!live) {
      context.save();
      context.setLineDash([3, 3]);
      context.strokeStyle = "#c2c6ac";
      context.lineWidth = 1.5;
      context.beginPath();
      context.ellipse(
        point.x,
        point.y,
        12 * camera.zoom,
        6 * camera.zoom,
        0,
        0,
        Math.PI * 2,
      );
      context.stroke();
      context.restore();
    }
    if (live) {
      const cargo = snapshot.game.objects.items.find(
        (item) =>
          item.location.kind === "carried" && item.location.personId === id,
      );
      if (cargo) {
        context.fillStyle = cargo.kind === "meals" ? "#e2c677" : "#91afbc";
        context.strokeStyle = "#294e3e";
        context.fillRect(
          point.x + 5 * camera.zoom,
          point.y - 15 * camera.zoom,
          12,
          10,
        );
        context.strokeRect(
          point.x + 5 * camera.zoom,
          point.y - 15 * camera.zoom,
          12,
          10,
        );
      }
    }
    if (selected) {
      const label =
        (snapshot.game.personnel.find((person) => person.id === id)?.name ??
          id) + (live ? "" : " / last seen");
      context.font = "bold 12px 'Courier New', monospace";
      const labelWidth = context.measureText(label).width + 10;
      context.fillStyle = "#fff9d9";
      context.fillRect(point.x - labelWidth / 2, point.y + 10, labelWidth, 18);
      context.fillStyle = "#24382d";
      context.fillText(label, point.x, point.y + 23);
    }
  }
  if (overlays.objects && overlays.activity !== false)
    drawPawnBubbles(
      context,
      layoutPawnBubbles(
        snapshot.game,
        recorded ? "recorded" : "world",
        camera.zoom,
        width,
        height,
        (position) => projectPosition(position, camera, width, height),
        camera.selectedId,
      ),
    );
  context.textAlign = "start";
  const selectedObject = mapObjects(snapshot.game, camera.perspective).find(
    ({ id }) => id === camera.selectedId,
  );
  const tileCoordinates = camera.selectedId?.startsWith("tile:")
    ? camera.selectedId.slice(5).split(":")[0]!.split(",").map(Number)
    : null;
  const selectedPosition =
    selectedObject?.position ??
    (tileCoordinates
      ? { x: tileCoordinates[0]!, y: tileCoordinates[1]! }
      : null);
  if (
    selectedPosition &&
    !snapshot.game.personnel.some(({ id }) => id === camera.selectedId) &&
    camera.selectedId !== "SCP-999"
  ) {
    const point = projectPosition(selectedPosition, camera, width, height);
    context.save();
    context.strokeStyle = "#fff1ad";
    context.lineWidth = 2;
    context.strokeRect(
      point.x - 18 * camera.zoom,
      point.y - 30 * camera.zoom,
      36 * camera.zoom,
      36 * camera.zoom,
    );
    context.restore();
  }
}
