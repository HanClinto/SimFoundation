import type { GameState } from "./state";
import type { PhysicalObject } from "./objects";
import { createCombatState } from "./combat";
import { createSiteObservations } from "./observations";
import { surfacesForTile } from "./materials";
import type { SiteMap, TileKind } from "./world";

export type ExpeditionSite = Pick<
  GameState,
  "world" | "objects" | "observations" | "combat" | "environment"
>;
export const FIELD_EXTRACTION = { x: 4, y: 12 };
export function createExpeditionSite(id: string): ExpeditionSite {
  const width = 28;
  const height = 24;
  const tiles: TileKind[] = Array.from(
    { length: width * height },
    (_, index) => {
      const column = index % width;
      const row = Math.floor(index / width);
      return column >= 2 && column <= 25 && row >= 3 && row <= 20
        ? "floor"
        : "grass";
    },
  );
  for (let row = 5; row <= 18; row += 1)
    for (let column = 10; column <= 23; column += 1)
      if (
        row === 5 ||
        row === 18 ||
        column === 10 ||
        column === 23 ||
        column === 17
      )
        tiles[row * width + column] = "wall";
  for (const position of [
    { x: 10, y: 12 },
    { x: 17, y: 10 },
    { x: 17, y: 15 },
  ])
    tiles[position.y * width + position.x] = "closed-door";
  const map: SiteMap = {
    id: `field-${id}`,
    width,
    height,
    tiles,
    surfaces: Object.fromEntries(
      tiles.flatMap((tile, index) =>
        tile === "grass" ? [] : [[index, surfacesForTile(tile)]],
      ),
    ),
    objectBlocks: [],
    doorPolicies: Object.fromEntries(
      tiles.flatMap((tile, index) =>
        tile === "closed-door" ? [[index, "automatic" as const]] : [],
      ),
    ),
    rooms: [
      {
        id: "depot-office",
        name: "Relay office",
        kind: "security",
        x: 10,
        y: 5,
        width: 8,
        height: 14,
      },
      {
        id: "depot-store",
        name: "Sealed records store",
        kind: "storage",
        x: 17,
        y: 5,
        width: 7,
        height: 14,
      },
    ],
  };
  const world = { map, positions: {} };
  const items: PhysicalObject[] = [
    {
      id: `${id}-archive`,
      kind: "archive-case",
      quantity: 1,
      condition: 100,
      installed: false,
      orientation: "north",
      reservedBy: null,
      location: { kind: "ground", position: { x: 14, y: 8 } },
    },
    {
      id: `${id}-specimen`,
      kind: "anomaly-case",
      quantity: 1,
      condition: 100,
      installed: false,
      orientation: "north",
      reservedBy: null,
      location: { kind: "ground", position: { x: 21, y: 15 } },
    },
  ];
  const observations = createSiteObservations(world);
  return {
    world,
    objects: { nextId: 1, items },
    observations: {
      ...observations,
      cameras: [],
      cameraKits: 0,
      knownRooms: [],
      knownTiles: tiles.map(() => null),
      tileLastSeen: tiles.map(() => -1),
      knownSurfaces: {},
    },
    combat: createCombatState(),
    environment: {
      automaticRepairs: false,
      nextOrder: 1,
      orders: [],
      sources: [
        {
          id: `${id}-emission`,
          name: "Relay specimen emission",
          objectId: `${id}-specimen`,
          position: { x: 21, y: 15 },
          kind: "corrosion",
          dose: 0.2,
          radius: 1,
          enabled: true,
        },
      ],
    },
  };
}
