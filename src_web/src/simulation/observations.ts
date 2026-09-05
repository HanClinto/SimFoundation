import PF from "pathfinding";
import type { GameState } from "./state";
import type { TileSurfaces } from "./materials";
import { projectPsychology } from "./personnel";
import type { Scp999State } from "./scp-999";
import {
  tileAt,
  isWalkable,
  type SiteMap,
  type SiteRoom,
  type SiteWorld,
  type TileKind,
  type TilePosition,
} from "./world";

export interface SiteCamera {
  readonly id: string;
  readonly name: string;
  readonly position: TilePosition;
  readonly enabled: boolean;
  readonly range: number;
  readonly installJobId: string | null;
}
export interface EntityObservation {
  readonly id: string;
  readonly position: TilePosition;
  readonly observedTick: number;
  readonly sources: readonly string[];
  readonly activity: string;
  readonly moodAppearance: string | null;
  readonly sanityAppearance: string | null;
  readonly blockedReason: string | null;
}
export interface SiteObservations {
  readonly knownSurfaces: Readonly<Record<number, TileSurfaces>>;
  readonly knownTiles: readonly (TileKind | null)[];
  readonly tileLastSeen: readonly number[];
  readonly visibleTiles: readonly number[];
  readonly visibleEntityIds: readonly string[];
  readonly entities: Readonly<Record<string, EntityObservation>>;
  readonly knownRooms: readonly SiteRoom[];
  readonly scp999: {
    readonly state: Scp999State;
    readonly observedTick: number;
  } | null;
  readonly cameras: readonly SiteCamera[];
  readonly cameraKits: number;
}

export function canObserve(
  map: SiteMap,
  origin: TilePosition,
  target: TilePosition,
  range: number,
): boolean {
  if (
    tileAt(map, origin) === null ||
    tileAt(map, target) === null ||
    (target.x - origin.x) ** 2 + (target.y - origin.y) ** 2 > range ** 2
  )
    return false;
  const utility = PF.Util as typeof PF.Util & {
    interpolate(
      startX: number,
      startY: number,
      endX: number,
      endY: number,
    ): number[][];
  };
  const ray = utility.interpolate(origin.x, origin.y, target.x, target.y);
  for (let index = 1; index < ray.length; index += 1) {
    const [x, y] = ray[index]!;
    const [previousX, previousY] = ray[index - 1]!;
    if (
      x !== previousX &&
      y !== previousY &&
      (!isWalkable(map, { x: x!, y: previousY! }) ||
        !isWalkable(map, { x: previousX!, y: y! }))
    )
      return false;
    if (index < ray.length - 1 && !isWalkable(map, { x: x!, y: y! }))
      return false;
  }
  return true;
}

export function createSiteObservations(world: SiteWorld): SiteObservations {
  const knownTiles = world.map.tiles.map((tile, index) => {
    const column = index % world.map.width;
    const row = Math.floor(index / world.map.width);
    return column >= 40 && column <= 85 && row >= 40 && row <= 85 ? tile : null;
  });
  return {
    knownSurfaces: Object.fromEntries(
      Object.entries(world.map.surfaces).filter(
        ([index]) => knownTiles[Number(index)] != null,
      ),
    ),
    knownTiles,
    tileLastSeen: knownTiles.map((tile) => (tile === null ? -1 : 0)),
    visibleTiles: [],
    visibleEntityIds: [],
    entities: {},
    knownRooms: structuredClone(world.map.rooms),
    scp999: null,
    cameraKits: 3,
    cameras: [
      {
        id: "camera-laboratory",
        name: "Laboratory camera",
        position: { x: 57, y: 55 },
        enabled: true,
        range: 8,
        installJobId: null,
      },
      {
        id: "camera-containment",
        name: "Containment camera",
        position: { x: 70, y: 55 },
        enabled: true,
        range: 8,
        installJobId: null,
      },
      {
        id: "camera-common",
        name: "Common-room camera",
        position: { x: 58, y: 67 },
        enabled: true,
        range: 7,
        installJobId: null,
      },
    ],
  };
}

export function observeSite(state: GameState): GameState {
  const map = state.world.map;
  const sensors = [
    ...state.personnel
      .filter(
        (person) =>
          !(
            state.routines.activities[person.id]?.kind === "sleep" &&
            state.routines.activities[person.id]!.progress > 0
          ),
      )
      .map((person) => ({
        id: person.id,
        position: state.world.positions[person.id]!,
        range: 6,
      })),
    ...state.observations.cameras
      .filter((camera) => camera.enabled && cameraInstalled(state, camera))
      .map((camera) => ({
        id: camera.id,
        position: camera.position,
        range: camera.range,
      })),
  ];
  const visible = new Set<number>();
  for (const sensor of sensors) {
    for (
      let row = Math.max(0, sensor.position.y - sensor.range);
      row <= Math.min(map.height - 1, sensor.position.y + sensor.range);
      row += 1
    ) {
      for (
        let column = Math.max(0, sensor.position.x - sensor.range);
        column <= Math.min(map.width - 1, sensor.position.x + sensor.range);
        column += 1
      ) {
        if (
          canObserve(map, sensor.position, { x: column, y: row }, sensor.range)
        )
          visible.add(row * map.width + column);
      }
    }
  }
  const knownTiles = [...state.observations.knownTiles];
  const knownSurfaces = { ...state.observations.knownSurfaces };
  const tileLastSeen = [...state.observations.tileLastSeen];
  for (const index of visible) {
    knownTiles[index] = map.tiles[index]!;
    if (map.surfaces[index]) knownSurfaces[index] = map.surfaces[index]!;
    else delete knownSurfaces[index];
    tileLastSeen[index] = state.tick;
  }
  const entities = { ...state.observations.entities };
  const visibleEntityIds: string[] = [];
  for (const [id, position] of Object.entries(state.world.positions).sort(
    ([first], [second]) => first.localeCompare(second),
  )) {
    if (!visible.has(position.y * map.width + position.x)) continue;
    const person = state.personnel.find((person) => person.id === id);
    const psychology = person ? projectPsychology(person) : null;
    entities[id] = {
      id,
      position: { ...position },
      observedTick: state.tick,
      sources: sensors
        .filter((sensor) =>
          canObserve(map, sensor.position, position, sensor.range),
        )
        .map(({ id }) => id),
      activity: person?.activity ?? state.scp999.status,
      moodAppearance: psychology?.moodAppearance ?? null,
      sanityAppearance: psychology?.sanityAppearance ?? null,
      blockedReason: state.routines.blockedReasons[id] ?? null,
    };
    visibleEntityIds.push(id);
  }
  const rooms = new Map(
    state.observations.knownRooms.map((room) => [room.id, room]),
  );
  for (const room of map.rooms) {
    if (
      [...visible].some((index) => {
        const column = index % map.width;
        const row = Math.floor(index / map.width);
        return (
          column >= room.x &&
          column < room.x + room.width &&
          row >= room.y &&
          row < room.y + room.height
        );
      })
    )
      rooms.set(room.id, { ...room });
  }
  return {
    ...state,
    observations: {
      ...state.observations,
      knownTiles,
      knownSurfaces,
      tileLastSeen,
      visibleTiles: [...visible].sort((first, second) => first - second),
      visibleEntityIds,
      entities,
      knownRooms: [...rooms.values()],
      scp999: visibleEntityIds.includes("SCP-999")
        ? { state: structuredClone(state.scp999), observedTick: state.tick }
        : state.observations.scp999,
    },
  };
}

export function cameraInstalled(state: GameState, camera: SiteCamera): boolean {
  return (
    camera.installJobId === null ||
    state.jobs.some(
      (job) => job.id === camera.installJobId && job.status === "completed",
    )
  );
}

export function setCameraEnabled(
  state: GameState,
  cameraId: string,
  enabled: boolean,
): GameState {
  if (!state.observations.cameras.some(({ id }) => id === cameraId))
    throw new Error(`Unknown camera: ${cameraId}`);
  return observeSite({
    ...state,
    observations: {
      ...state.observations,
      cameras: state.observations.cameras.map((camera) =>
        camera.id === cameraId ? { ...camera, enabled } : camera,
      ),
    },
  });
}

export type CameraPlacementCode =
  | "installed-order"
  | "not-visible"
  | "not-floor"
  | "occupied"
  | "no-kits";
export function cameraPlacementIssue(
  state: GameState,
  position: TilePosition,
): CameraPlacementCode | null {
  if (
    !Number.isInteger(position.x) ||
    !Number.isInteger(position.y) ||
    tileAt(state.world.map, position) === null
  )
    return "not-visible";
  const remembered =
    state.observations.knownTiles[
      position.y * state.world.map.width + position.x
    ];
  if (remembered !== null && remembered !== undefined && remembered !== "floor")
    return "not-floor";
  if (
    state.observations.cameras.some(
      (camera) =>
        camera.position.x === position.x && camera.position.y === position.y,
    )
  )
    return "occupied";
  return state.observations.cameraKits === 0 ? "no-kits" : null;
}

export function installCamera(
  state: GameState,
  position: TilePosition,
): { readonly state: GameState; readonly code: CameraPlacementCode } {
  const issue = cameraPlacementIssue(state, position);
  if (issue) return { state, code: issue };
  const number = state.observations.cameras.length + 1;
  const id = `camera-field-${number}`;
  const installJobId = `job-install-${id}`;
  return {
    code: "installed-order",
    state: {
      ...state,
      observations: {
        ...state.observations,
        cameraKits: state.observations.cameraKits - 1,
        cameras: [
          ...state.observations.cameras,
          {
            id,
            name: `Field camera ${number}`,
            position: { ...position },
            enabled: true,
            range: 8,
            installJobId,
          },
        ],
      },
      jobs: [
        ...state.jobs,
        {
          id: installJobId,
          title: `Install field camera ${number}`,
          description:
            "Survey the requested location, then mount and commission a surveillance camera.",
          skillId: "engineering",
          priority: 50,
          xpPerTick: 1,
          preferredBiases: { mindMight: 1, receptiveResolute: 1 },
          status: "available",
          progress: 0,
          requiredProgress: 28,
          assignedPersonId: null,
          assignmentReason: null,
          authorizedTick: state.tick,
          completedTick: null,
          workSite: { ...position },
          requiredWorkerId: null,
        },
      ],
    },
  };
}
