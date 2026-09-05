import type { GameState } from "../../simulation/state";
import {
  TRIAL_LOCATION,
  TRIAL_BARRIER_LOCATION,
  TRIAL_SECONDARY_LOCATION,
  TRIAL_WORK_SITE,
  BARRIER_MATERIALS,
} from "../../simulation/containment-trial";
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
  const barrier = sameTile(position, TRIAL_BARRIER_LOCATION)
    ? "primary"
    : sameTile(position, TRIAL_SECONDARY_LOCATION)
      ? "secondary"
      : null;
  if (barrier) {
    const reading = state.containmentTrial.barrierReadings[barrier];
    rows.push(
      [
        "Structure",
        barrier === "primary"
          ? "AN-001 replaceable primary wall"
          : "AN-001 sealed secondary hatch",
      ],
      [
        "Material",
        reading ? BARRIER_MATERIALS[reading.material].name : "Unassessed",
      ],
      [
        "Recorded integrity",
        reading
          ? `${reading.integrity}% / observed ${state.tick - reading.observedTick} minutes ago`
          : "No inspection on record",
      ],
    );
  } else if (
    sameTile(position, TRIAL_LOCATION) &&
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
      ["Integrity", "Damage is not modeled for this tile"],
    );
  const jobs = state.jobs.filter(
    (job) =>
      (sameTile(job.workSite, position) ||
        (barrier && job.id === state.containmentTrial.workOrderId)) &&
      job.status !== "completed",
  );
  rows.push([
    "Work at location",
    jobs
      .map((job) => `${job.title}: ${job.assignmentReason ?? job.status}`)
      .join("; ") || "No open orders",
  ]);
  if (barrier || sameTile(position, TRIAL_WORK_SITE))
    rows.push([
      "Maintenance",
      state.containmentTrial.maintenanceReason ??
        (state.containmentTrial.automaticRepairs
          ? `Automatic / ${BARRIER_MATERIALS[state.containmentTrial.repairMaterial].name}`
          : "Manual"),
    ]);
  return rows;
}
