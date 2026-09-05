import type { GameState } from "../../simulation/state";
import { spaceBoundary } from "../../simulation/spaces";
import { spaceProjection } from "./space-projection";
import { MATERIALS, type SurfaceLayer } from "../../simulation/materials";
import { sameTile } from "../../simulation/world";
import type { TilePosition } from "../../simulation/world";
import type { MapPerspective } from "./map-settings";
import { OBJECT_DEFINITIONS, objectPosition } from "../../simulation/objects";

export function mapObjects(
  state: GameState,
  perspective: MapPerspective = "recorded",
): readonly {
  readonly id: string;
  readonly name: string;
  readonly position: TilePosition;
}[] {
  return [
    ...state.storage.areas.map((area) => ({
      id: `storage:${area.id}`,
      name: `Storage / ${area.name}`,
      position: area.origin,
    })),
    ...Object.entries(
      perspective === "world"
        ? Object.fromEntries(
            Object.entries(state.world.positions).map(([id, position]) => [
              id,
              { position },
            ]),
          )
        : state.observations.entities,
    ).map(([id, sighting]) => ({
      id,
      position: sighting.position,
      name: state.personnel.find((person) => person.id === id)?.name ?? id,
    })),
    ...state.observations.cameras.map((camera) => ({
      id: camera.id,
      name: camera.name,
      position: camera.position,
    })),
    ...(perspective === "world"
      ? state.objects.items
      : Object.values(state.observations.objects).map(
          (observation) => observation.object,
        )
    ).flatMap((item) => {
      const position = objectPosition(item, state.world.positions);
      return position
        ? [
            {
              id: `object:${item.id}`,
              name: `${OBJECT_DEFINITIONS[item.kind].name} / ${item.id}${item.quantity > 1 ? ` (${item.quantity})` : ""}`,
              position,
            },
          ]
        : [];
    }),
    ...state.environment.sources
      .filter(
        (source) =>
          perspective === "world" ||
          state.observations.knownTiles[
            source.position.y * state.world.map.width + source.position.x
          ] != null,
      )
      .map((source) => ({
        id: source.id,
        name: source.name,
        position: source.position,
      })),
  ];
}

export function engineeringRecord(
  state: GameState,
  position: TilePosition,
  layer?: SurfaceLayer,
  perspective: MapPerspective = "recorded",
): readonly [string, string][] {
  const index = position.y * state.world.map.width + position.x;
  const known =
    perspective === "world"
      ? state.world.map.tiles[index]
      : state.observations.knownTiles[index];
  const visible = state.observations.visibleTiles.includes(index);
  const rows: [string, string][] = [
    ["Location", `${position.x}, ${position.y}`],
    [
      "Observation",
      perspective === "world"
        ? "Simulation state"
        : visible
          ? "Current coverage"
          : known == null
            ? "Unsurveyed"
            : `Last surveyed ${state.tick - state.observations.tileLastSeen[index]!} minutes ago`,
    ],
    [perspective === "world" ? "Tile" : "Recorded tile", known ?? "Unknown"],
  ];
  if (known == null) return rows;
  const topology = spaceProjection(
    state.world.map.width,
    state.world.map.height,
    perspective === "world"
      ? state.world.map.tiles
      : state.observations.knownTiles,
  );
  const spaceId = topology.spaceByTile[index];
  const space = spaceId == null ? undefined : topology.spaces[spaceId];
  rows.push([
    perspective === "world" ? "Physical space" : "Recorded space",
    space
      ? `${spaceBoundary(space)} / ${space.tiles.length} connected tiles / ${space.floorTiles} floored`
      : "Boundary structure",
  ]);
  const room = (
    perspective === "world"
      ? state.world.map.rooms
      : state.observations.knownRooms
  ).find(
    (room) =>
      position.x >= room.x &&
      position.x < room.x + room.width &&
      position.y >= room.y &&
      position.y < room.y + room.height,
  );
  rows.push(["Room", room?.name ?? "Exterior / corridor"]);
  rows.push(["Ground", "Soil"]);
  const cell =
    perspective === "world"
      ? state.world.map.surfaces[index]
      : state.observations.knownSurfaces[index];
  for (const selected of layer ? [layer] : (["floor", "structure"] as const)) {
    const surface = cell?.[selected];
    rows.push([
      selected === "floor" ? "Floor" : "Structure",
      surface
        ? `${surface.kind} / ${MATERIALS[surface.material].name} / ${surface.integrity}%`
        : "None installed",
    ]);
  }
  if (cell?.structure && ["door", "closed-door"].includes(cell.structure.kind))
    rows.push([
      "Door policy",
      state.world.map.doorPolicies?.[index] ??
        (cell.structure.kind === "door" ? "held-open" : "held-closed"),
    ]);
  const orders = state.environment.orders.filter(
    (order) =>
      sameTile(order.position, position) &&
      order.phase !== "completed" &&
      (!layer || order.layer === layer),
  );
  const jobs = state.jobs.filter(
    (job) =>
      (sameTile(job.workSite, position) ||
        orders.some((order) => order.jobId === job.id)) &&
      job.status !== "completed",
  );
  rows.push([
    "Work at location",
    jobs
      .map((job) => `${job.title}: ${job.assignmentReason ?? job.status}`)
      .join("; ") || "No open orders",
  ]);
  for (const order of orders)
    rows.push([
      "Surface order",
      `${order.layer}: ${order.phase}${order.blockedReason ? ` / ${order.blockedReason}` : ""}`,
    ]);
  return rows;
}
