import PF from "pathfinding";

export type TileKind = "grass" | "floor" | "wall" | "door";

export interface TilePosition {
  readonly x: number;
  readonly y: number;
}

export interface SiteRoom {
  readonly id: string;
  readonly name: string;
  readonly kind:
    | "laboratory"
    | "containment"
    | "storage"
    | "dormitory"
    | "mess"
    | "medical"
    | "utilities"
    | "security";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SiteMap {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly TileKind[];
  readonly rooms: readonly SiteRoom[];
}

export interface SiteWorld {
  readonly map: SiteMap;
  readonly positions: Readonly<Record<string, TilePosition>>;
}

export function tileAt(map: SiteMap, position: TilePosition): TileKind | null {
  if (
    !Number.isInteger(position.x) ||
    !Number.isInteger(position.y) ||
    position.x < 0 ||
    position.y < 0 ||
    position.x >= map.width ||
    position.y >= map.height
  )
    return null;
  return map.tiles[position.y * map.width + position.x] ?? null;
}

export function isWalkable(map: SiteMap, position: TilePosition): boolean {
  const tile = tileAt(map, position);
  return tile !== null && tile !== "wall";
}

export function sameTile(first: TilePosition, second: TilePosition): boolean {
  return first.x === second.x && first.y === second.y;
}

export function findRoute(
  map: SiteMap,
  start: TilePosition,
  target: TilePosition,
): readonly TilePosition[] | null {
  if (!isWalkable(map, start) || !isWalkable(map, target)) return null;
  if (sameTile(start, target)) return [];
  const matrix = Array.from({ length: map.height }, (_, row) =>
    Array.from({ length: map.width }, (_, column) =>
      isWalkable(map, { x: column, y: row }) ? 0 : 1,
    ),
  );
  const finder = new PF.AStarFinder({
    diagonalMovement: PF.DiagonalMovement.Never,
  });
  const route = finder.findPath(
    start.x,
    start.y,
    target.x,
    target.y,
    new PF.Grid(matrix),
  );
  return route.length === 0
    ? null
    : route.slice(1).map(([x, y]) => ({ x: x!, y: y! }));
}

export function createStartingMap(): SiteMap {
  const width = 128;
  const height = 128;
  const tiles: TileKind[] = Array.from(
    { length: width * height },
    () => "grass",
  );
  for (let row = 48; row <= 77; row += 1) {
    for (let column = 48; column <= 77; column += 1) {
      tiles[row * width + column] =
        row === 48 || row === 77 || column === 48 || column === 77
          ? "wall"
          : "floor";
    }
  }
  const rooms: SiteRoom[] = [
    {
      id: "room-laboratory",
      name: "Instrumentation Laboratory",
      kind: "laboratory",
      x: 49,
      y: 49,
      width: 13,
      height: 13,
    },
    {
      id: "room-containment",
      name: "SCP-9620 Containment",
      kind: "containment",
      x: 64,
      y: 49,
      width: 13,
      height: 13,
    },
    {
      id: "room-dormitory",
      name: "Staff Quarters",
      kind: "dormitory",
      x: 49,
      y: 64,
      width: 6,
      height: 13,
    },
    {
      id: "room-mess",
      name: "Staff Common Room",
      kind: "mess",
      x: 56,
      y: 64,
      width: 6,
      height: 6,
    },
    {
      id: "room-medical",
      name: "Medical Bay",
      kind: "medical",
      x: 56,
      y: 71,
      width: 6,
      height: 6,
    },
    {
      id: "room-storage",
      name: "Materials Store",
      kind: "storage",
      x: 64,
      y: 64,
      width: 6,
      height: 13,
    },
    {
      id: "room-utilities",
      name: "Plant Room",
      kind: "utilities",
      x: 71,
      y: 64,
      width: 6,
      height: 6,
    },
    {
      id: "room-security",
      name: "Security Office",
      kind: "security",
      x: 71,
      y: 71,
      width: 6,
      height: 6,
    },
  ];
  for (const room of rooms) {
    for (let row = room.y; row < room.y + room.height; row += 1) {
      for (let column = room.x; column < room.x + room.width; column += 1) {
        if (
          row === room.y ||
          row === room.y + room.height - 1 ||
          column === room.x ||
          column === room.x + room.width - 1
        )
          tiles[row * width + column] = "wall";
      }
    }
  }
  for (const door of [
    { x: 61, y: 55 },
    { x: 64, y: 55 },
    { x: 52, y: 64 },
    { x: 58, y: 64 },
    { x: 61, y: 73 },
    { x: 67, y: 64 },
    { x: 73, y: 64 },
    { x: 71, y: 73 },
    { x: 62, y: 77 },
    { x: 63, y: 77 },
  ])
    tiles[door.y * width + door.x] = "door";
  return { id: "map-site-828", width, height, tiles, rooms };
}

export function createStartingWorld(personIds: readonly string[]): SiteWorld {
  const starts = [
    { x: 54, y: 55 },
    { x: 74, y: 67 },
    { x: 58, y: 73 },
    { x: 74, y: 73 },
    { x: 67, y: 67 },
    { x: 54, y: 57 },
  ];
  return {
    map: createStartingMap(),
    positions: Object.fromEntries([
      ...personIds.map((id, index) => [id, starts[index % starts.length]!]),
      ["SCP-999", { x: 58, y: 67 }],
    ]),
  };
}
