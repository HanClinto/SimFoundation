import type { GameState } from "./state";
import type { PhysicalObject } from "./objects";
import { createCombatState } from "./combat";
import { createSiteObservations } from "./observations";
import { surfacesForTile } from "./materials";
import type { SiteMap, TileKind, TilePosition } from "./world";

export type ExpeditionSite = Pick<
  GameState,
  "world" | "objects" | "observations" | "combat" | "environment"
>;
export interface ExpeditionScenario {
  readonly noticeId: string;
  readonly title: string;
  readonly report: string;
  readonly siteName: string;
  readonly travelMinutes: number;
  readonly extraction: TilePosition;
  readonly recoveryTargets: readonly string[];
  readonly encounterPosition: TilePosition | null;
  readonly createSite: (id: string) => ExpeditionSite;
}

export const EXPEDITION_SCENARIOS: readonly ExpeditionScenario[] = [
  {
    noticeId: "notice-depot",
    title: "Unscheduled activity at Relay Depot 14",
    report:
      "The night operator reports movement inside a sealed records store. A courier has failed to return. Recover the sealed archive and the anomalous specimen.",
    siteName: "Relay Depot 14",
    travelMinutes: 30,
    extraction: { x: 4, y: 12 },
    recoveryTargets: ["archive", "specimen"],
    encounterPosition: { x: 20, y: 9 },
    createSite: createRelayDepotSite,
  },
  {
    noticeId: "notice-records-transfer",
    title: "Records transfer from Service Store 3",
    report:
      "Collect three sealed archive cases from the service store and return them to the site. No hostile activity is reported.",
    siteName: "Service Store 3",
    travelMinutes: 12,
    extraction: { x: 2, y: 6 },
    recoveryTargets: ["case-a", "case-b", "case-c"],
    encounterPosition: null,
    createSite: createRecordsTransferSite,
  },
];

export function expeditionScenario(noticeId: string): ExpeditionScenario {
  const scenario = EXPEDITION_SCENARIOS.find(
    (entry) => entry.noticeId === noticeId,
  );
  if (!scenario) throw new Error(`Unknown expedition scenario: ${noticeId}`);
  return scenario;
}

export function expeditionRecoveryComplete(
  noticeId: string,
  expeditionId: string,
  cargo: readonly string[],
): boolean {
  return expeditionScenario(noticeId).recoveryTargets.every((target) =>
    cargo.includes(`${expeditionId}-${target}`),
  );
}

function createRelayDepotSite(id: string): ExpeditionSite {
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

function createRecordsTransferSite(id: string): ExpeditionSite {
  const width = 16;
  const height = 14;
  const tiles: TileKind[] = Array.from(
    { length: width * height },
    (_, index) => {
      const column = index % width;
      const row = Math.floor(index / width);
      if (
        column === 0 ||
        row === 0 ||
        column === width - 1 ||
        row === height - 1
      )
        return "wall";
      if (column === 7) return row === 6 ? "closed-door" : "wall";
      return "floor";
    },
  );
  const world = {
    map: {
      id: `field-${id}`,
      width,
      height,
      tiles,
      surfaces: Object.fromEntries(
        tiles.map((tile, index) => [index, surfacesForTile(tile)]),
      ),
      doorPolicies: { [6 * width + 7]: "automatic" as const },
      objectBlocks: [],
      rooms: [],
    },
    positions: {},
  };
  const items: PhysicalObject[] = ["case-a", "case-b", "case-c"].map(
    (key, index) => ({
      id: `${id}-${key}`,
      kind: "archive-case",
      quantity: 1,
      condition: 100,
      installed: false,
      orientation: "north",
      reservedBy: null,
      location: { kind: "ground", position: { x: 10 + index, y: 6 + index } },
    }),
  );
  const observations = createSiteObservations(world);
  return {
    world,
    objects: { nextId: 1, items },
    combat: createCombatState(),
    observations: {
      ...observations,
      cameras: [],
      cameraKits: 0,
      knownRooms: [],
      knownTiles: tiles.map(() => null),
      tileLastSeen: tiles.map(() => -1),
      knownSurfaces: {},
    },
    environment: {
      automaticRepairs: false,
      nextOrder: 1,
      orders: [],
      sources: [],
    },
  };
}
