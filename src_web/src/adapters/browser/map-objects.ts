import type { GameState } from "../../simulation/state";
import { MATERIALS, type SurfaceLayer } from "../../simulation/materials";
import { sameTile } from "../../simulation/world";
import type { TilePosition } from "../../simulation/world";

export function mapObjects(state: GameState): readonly {
  readonly id: string;
  readonly name: string;
  readonly position: TilePosition;
}[] {
  return [
    ...Object.entries(state.observations.entities).map(([id, sighting]) => ({
      id,
      position: sighting.position,
      name: state.personnel.find((person) => person.id === id)?.name ?? id,
    })),
    ...state.observations.cameras.map((camera) => ({
      id: camera.id,
      name: camera.name,
      position: camera.position,
    })),
    ...state.environment.sources
      .filter(
        (source) =>
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
): readonly [string, string][] {
  const index = position.y * state.world.map.width + position.x;
  const known = state.observations.knownTiles[index];
  const visible = state.observations.visibleTiles.includes(index);
  const rows: [string, string][] = [
    ["Location", `${position.x}, ${position.y}`],
    [
      "Observation",
      visible
        ? "Current coverage"
        : known == null
          ? "Unsurveyed"
          : `Last surveyed ${state.tick - state.observations.tileLastSeen[index]!} minutes ago`,
    ],
    ["Recorded tile", known ?? "Unknown"],
  ];
  if (known == null) return rows;
  const room = state.observations.knownRooms.find(
    (room) =>
      position.x >= room.x &&
      position.x < room.x + room.width &&
      position.y >= room.y &&
      position.y < room.y + room.height,
  );
  rows.push(["Room", room?.name ?? "Exterior / corridor"]);
  rows.push(["Ground", "Soil"]);
  const cell = state.observations.knownSurfaces[index];
  for (const selected of layer ? [layer] : (["floor", "structure"] as const)) {
    const surface = cell?.[selected];
    rows.push([
      selected === "floor" ? "Floor" : "Structure",
      surface
        ? `${surface.kind} / ${MATERIALS[surface.material].name} / ${surface.integrity}%`
        : "None installed",
    ]);
  }
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
