import PF from "pathfinding";
import {
  replaceSurface,
  surfacesForTile,
  type MaterialId,
  type TileSurfaces,
} from "./materials";

export type TileKind = "grass" | "floor" | "wall" | "door" | "closed-door";

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
  readonly surfaces: Readonly<Record<number, TileSurfaces>>;
  readonly objectBlocks?: readonly number[];
  readonly doorPolicies?: Readonly<Record<number, DoorPolicy>>;
  readonly rooms: readonly SiteRoom[];
}

export type DoorPolicy = "automatic" | "held-open" | "held-closed";

export function setDoorPolicy(
  world: SiteWorld,
  position: TilePosition,
  policy: DoorPolicy,
  obstructions: readonly TilePosition[] = [],
): SiteWorld {
  const tile = tileAt(world.map, position);
  if (
    !["automatic", "held-open", "held-closed"].includes(policy) ||
    (tile !== "door" && tile !== "closed-door")
  )
    return world;
  if (
    policy === "held-closed" &&
    [...Object.values(world.positions), ...obstructions].some((other) =>
      sameTile(other, position),
    )
  )
    return world;
  const index = position.y * world.map.width + position.x;
  const surface = world.map.surfaces[index]!.structure!;
  const map =
    policy === "automatic"
      ? world.map
      : replaceSurface(world.map, position, "structure", {
          ...surface,
          kind: policy === "held-open" ? "door" : "closed-door",
        });
  return {
    ...world,
    map: { ...map, doorPolicies: { ...map.doorPolicies, [index]: policy } },
  };
}

export function canTraverse(map: SiteMap, position: TilePosition): boolean {
  return (
    isWalkable(map, position) ||
    (tileAt(map, position) === "closed-door" &&
      map.doorPolicies?.[position.y * map.width + position.x] === "automatic" &&
      !map.objectBlocks?.includes(position.y * map.width + position.x))
  );
}

export function stepWorld(
  world: SiteWorld,
  id: string,
  destination: TilePosition,
): SiteWorld {
  const origin = world.positions[id];
  if (
    !origin ||
    Math.abs(origin.x - destination.x) + Math.abs(origin.y - destination.y) !==
      1 ||
    !canTraverse(world.map, destination)
  )
    return world;
  if (tileAt(world.map, destination) === "closed-door") {
    const surface =
      world.map.surfaces[destination.y * world.map.width + destination.x]!
        .structure!;
    return {
      ...world,
      map: replaceSurface(world.map, destination, "structure", {
        ...surface,
        kind: "door",
      }),
    };
  }
  return { ...world, positions: { ...world.positions, [id]: destination } };
}

export function closeAutomaticDoors(
  world: SiteWorld,
  obstructions: readonly TilePosition[] = [],
): SiteWorld {
  let map = world.map;
  for (const [key, policy] of Object.entries(map.doorPolicies ?? {})) {
    const index = Number(key);
    if (policy !== "automatic" || map.tiles[index] !== "door") continue;
    const position = { x: index % map.width, y: Math.floor(index / map.width) };
    if (
      [...Object.values(world.positions), ...obstructions].some(
        (other) =>
          Math.abs(other.x - position.x) + Math.abs(other.y - position.y) <= 1,
      )
    )
      continue;
    map = replaceSurface(map, position, "structure", {
      ...map.surfaces[index]!.structure!,
      kind: "closed-door",
    });
  }
  return map === world.map ? world : { ...world, map };
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
  return (
    tile !== null &&
    tile !== "wall" &&
    tile !== "closed-door" &&
    !map.objectBlocks?.includes(position.y * map.width + position.x)
  );
}

export function sameTile(first: TilePosition, second: TilePosition): boolean {
  return first.x === second.x && first.y === second.y;
}

export function findRoute(
  map: SiteMap,
  start: TilePosition,
  target: TilePosition,
): readonly TilePosition[] | null {
  if (!canTraverse(map, start) || !canTraverse(map, target)) return null;
  if (sameTile(start, target)) return [];
  const matrix = Array.from({ length: map.height }, (_, row) =>
    Array.from({ length: map.width }, (_, column) =>
      canTraverse(map, { x: column, y: row }) ? 0 : 1,
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
    { x: 74, y: 61 },
    { x: 52, y: 64 },
    { x: 58, y: 64 },
    { x: 61, y: 73 },
    { x: 67, y: 64 },
    { x: 69, y: 70 },
    { x: 73, y: 64 },
    { x: 71, y: 73 },
    { x: 62, y: 77 },
    { x: 63, y: 77 },
  ])
    tiles[door.y * width + door.x] = "door";
  const surfaces = Object.fromEntries(
    tiles.flatMap((tile, index) =>
      tile === "grass" ? [] : [[index, surfacesForTile(tile)]],
    ),
  );
  const finishes: Record<
    SiteRoom["kind"],
    { floor: MaterialId; wall: MaterialId }
  > = {
    laboratory: { floor: "concrete", wall: "concrete" },
    containment: { floor: "ceramic", wall: "composite" },
    storage: { floor: "concrete", wall: "steel" },
    dormitory: { floor: "composite", wall: "composite" },
    mess: { floor: "ceramic", wall: "concrete" },
    medical: { floor: "ceramic", wall: "ceramic" },
    utilities: { floor: "steel", wall: "steel" },
    security: { floor: "composite", wall: "composite" },
  };
  for (const room of rooms) {
    const finish = finishes[room.kind];
    for (let row = room.y; row < room.y + room.height; row += 1) {
      for (let column = room.x; column < room.x + room.width; column += 1) {
        const index = row * width + column;
        const cell = surfaces[index]!;
        surfaces[index] = {
          floor: cell.floor ? { ...cell.floor, material: finish.floor } : null,
          structure:
            cell.structure?.kind === "wall"
              ? { ...cell.structure, material: finish.wall }
              : cell.structure,
        };
      }
    }
  }
  const doorPolicies = Object.fromEntries(
    tiles.flatMap((tile, index) =>
      tile === "door" ? [[index, "automatic" as const]] : [],
    ),
  );
  return {
    id: "map-site-828",
    width,
    height,
    tiles,
    surfaces,
    rooms,
    doorPolicies,
  };
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
