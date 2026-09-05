import type { GameState } from "../../simulation/state";
import { TRIAL_LOCATION } from "../../simulation/containment-trial";
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
    ...(state.containmentTrial.lastReading
      ? [
          {
            id: "AN-001",
            name: "AN-001 / The Chalk Knot",
            position: TRIAL_LOCATION,
          },
        ]
      : []),
  ];
}

export function engineeringRecord(
  state: GameState,
  position: TilePosition,
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
  if (
    position.x === TRIAL_LOCATION.x &&
    position.y === TRIAL_LOCATION.y &&
    state.containmentTrial.lastReading
  ) {
    rows.push(
      ["Barrier", state.containmentTrial.lastReading.material],
      [
        "Recorded integrity",
        `${state.containmentTrial.lastReading.integrity}%`,
      ],
    );
  } else
    rows.push(
      ["Material", "No material specification on record"],
      ["Integrity", "Tile damage is not modeled"],
    );
  const jobs = state.jobs.filter(
    (job) =>
      job.workSite.x === position.x &&
      job.workSite.y === position.y &&
      job.status !== "completed",
  );
  rows.push([
    "Work at location",
    jobs
      .map((job) => `${job.title}: ${job.assignmentReason ?? job.status}`)
      .join("; ") || "No open orders",
  ]);
  return rows;
}
