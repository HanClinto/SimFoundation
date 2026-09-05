import type { GameState } from "./state";
import {
  MATERIALS,
  damageSurfaces,
  replaceSurface,
  surfaceAt,
  type MaterialId,
  type SurfaceLayer,
  type SurfaceDamage,
} from "./materials";
import {
  findRoute,
  isWalkable,
  sameTile,
  tileAt,
  type TilePosition,
} from "./world";
import type { SiteJob } from "./jobs";

export interface SurfaceOrder {
  readonly id: string;
  readonly position: TilePosition;
  readonly layer: SurfaceLayer;
  readonly material: MaterialId;
  readonly jobId: string;
  readonly phase: "collecting" | "delivering" | "fitting" | "completed";
  readonly blockedReason: string | null;
}
export interface ExposureSource {
  readonly id: string;
  readonly name: string;
  readonly position: TilePosition;
  readonly radius: number;
  readonly kind: "corrosion" | "impact";
  readonly dose: number;
}
export interface EnvironmentState {
  readonly automaticRepairs: boolean;
  readonly spentMaterials: number;
  readonly nextOrder: number;
  readonly orders: readonly SurfaceOrder[];
  readonly sources: readonly ExposureSource[];
}
export function createEnvironment(): EnvironmentState {
  return {
    automaticRepairs: false,
    spentMaterials: 0,
    nextOrder: 1,
    orders: [],
    sources: [],
  };
}
export function neighbors(position: TilePosition): readonly TilePosition[] {
  return [
    { x: position.x, y: position.y - 1 },
    { x: position.x - 1, y: position.y },
    { x: position.x + 1, y: position.y },
    { x: position.x, y: position.y + 1 },
  ];
}

export function exposureTiles(
  state: GameState,
  source: ExposureSource,
): readonly TilePosition[] {
  const queue = [source.position];
  const visited = new Set<string>();
  const reached: TilePosition[] = [];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const position = queue[cursor]!;
    const key = `${position.x},${position.y}`;
    if (
      visited.has(key) ||
      Math.abs(position.x - source.position.x) +
        Math.abs(position.y - source.position.y) >
        source.radius ||
      tileAt(state.world.map, position) === null
    )
      continue;
    visited.add(key);
    reached.push(position);
    if (isWalkable(state.world.map, position))
      queue.push(...neighbors(position));
  }
  return reached;
}
export function advanceExposure(state: GameState): GameState {
  const damage: SurfaceDamage[] = [];
  for (const source of state.environment.sources) {
    for (const position of exposureTiles(state, source)) {
      const layer = isWalkable(state.world.map, position)
        ? "floor"
        : "structure";
      damage.push({ position, layer, kind: source.kind, dose: source.dose });
      if (
        layer === "floor" &&
        surfaceAt(state.world.map, position, "structure")
      )
        damage.push({
          position,
          layer: "structure",
          kind: source.kind,
          dose: source.dose,
        });
    }
  }
  const map = damageSurfaces(state.world.map, damage);
  return map === state.world.map
    ? state
    : { ...state, world: { ...state.world, map } };
}

export type SurfaceOrderCode =
  | "accepted"
  | "unknown-surface"
  | "busy"
  | "insufficient-materials"
  | "unreachable"
  | "invalid-material";
export function orderSurfaceWork(
  state: GameState,
  position: TilePosition,
  layer: SurfaceLayer,
  material: MaterialId,
): { state: GameState; code: SurfaceOrderCode } {
  if (!Object.hasOwn(MATERIALS, material))
    return { state, code: "invalid-material" };
  if (
    (layer !== "floor" && layer !== "structure") ||
    !surfaceAt(state.world.map, position, layer)
  )
    return { state, code: "unknown-surface" };
  if (
    state.environment.orders.some(
      (order) =>
        order.phase !== "completed" &&
        sameTile(order.position, position) &&
        order.layer === layer,
    )
  )
    return { state, code: "busy" };
  const workSite = neighbors(position).find(
    (site) =>
      isWalkable(state.world.map, site) &&
      findRoute(state.world.map, state.construction.stockpile, site) !== null,
  );
  if (!workSite) return { state, code: "unreachable" };
  const cost = MATERIALS[material].cost;
  if (state.construction.availableMaterials < cost)
    return { state, code: "insufficient-materials" };
  const id = `surface-${state.environment.nextOrder}`;
  const recorded =
    state.observations.knownSurfaces[
      position.y * state.world.map.width + position.x
    ]?.[layer] ?? surfaceAt(state.world.map, position, layer)!;
  const job: SiteJob = {
    id: `job-${id}`,
    title: `Collect ${MATERIALS[material].name.toLowerCase()} for ${layer} ${position.x},${position.y}`,
    description: `Replace ${layer} at ${position.x},${position.y}; collect, deliver, then fit.`,
    skillId: "logistics",
    priority: recorded.integrity === 0 && layer === "structure" ? 95 : 45,
    xpPerTick: 1,
    preferredBiases: { mindMight: 1, receptiveResolute: 1 },
    status: "available",
    progress: 0,
    requiredProgress: 8,
    assignedPersonId: null,
    requiredWorkerId: null,
    assignmentReason: null,
    authorizedTick: state.tick,
    completedTick: null,
    workSite: state.construction.stockpile,
  };
  return {
    code: "accepted",
    state: {
      ...state,
      jobs: [...state.jobs, job],
      construction: {
        ...state.construction,
        availableMaterials: state.construction.availableMaterials - cost,
      },
      environment: {
        ...state.environment,
        nextOrder: state.environment.nextOrder + 1,
        spentMaterials: state.environment.spentMaterials + cost,
        orders: [
          ...state.environment.orders,
          {
            id,
            jobId: job.id,
            position,
            layer,
            material,
            phase: "collecting",
            blockedReason: null,
          },
        ],
      },
    },
  };
}

export function advanceSurfaceWork(state: GameState): GameState {
  let jobs = [...state.jobs];
  let map = state.world.map;
  const orders = state.environment.orders.map((order): SurfaceOrder => {
    if (order.phase === "completed") return order;
    const job = jobs.find((job) => job.id === order.jobId)!;
    if (job.status !== "completed") return order;
    if (order.phase === "collecting") {
      const workSite = neighbors(order.position).find(
        (site) =>
          isWalkable(map, site) &&
          findRoute(map, state.construction.stockpile, site) !== null,
      );
      if (!workSite)
        return {
          ...order,
          blockedReason: "No accessible work face for delivery.",
        };
      jobs = jobs.map((candidate) =>
        candidate.id === job.id
          ? {
              ...job,
              title: job.title.replace("Collect", "Deliver"),
              status: "available",
              assignedPersonId: null,
              progress: 0,
              completedTick: null,
              workSite,
              requiredWorkerId: job.assignedPersonId,
            }
          : candidate,
      );
      return { ...order, phase: "delivering", blockedReason: null };
    }
    if (order.phase === "delivering") {
      jobs = jobs.map((candidate) =>
        candidate.id === job.id
          ? {
              ...job,
              title: `Fit ${MATERIALS[order.material].name.toLowerCase()} ${order.layer} at ${order.position.x},${order.position.y}`,
              skillId: "engineering",
              status: "available",
              progress: 0,
              requiredProgress: 32,
              completedTick: null,
              assignedPersonId: null,
              requiredWorkerId: null,
              assignmentReason: null,
            }
          : candidate,
      );
      return { ...order, phase: "fitting", blockedReason: null };
    }
    const surface = surfaceAt(map, order.position, order.layer)!;
    if (
      order.layer === "structure" &&
      surface.kind !== "door" &&
      Object.values(state.world.positions).some((position) =>
        sameTile(position, order.position),
      )
    )
      return {
        ...order,
        blockedReason:
          "Final assembly awaits clearance of the structure footprint.",
      };
    map = replaceSurface(map, order.position, order.layer, {
      ...surface,
      material: order.material,
      integrity: 100,
    });
    return { ...order, phase: "completed", blockedReason: null };
  });
  return {
    ...state,
    jobs,
    world: { ...state.world, map },
    environment: { ...state.environment, orders },
  };
}

export function discoverSurfaceWork(state: GameState): GameState {
  if (!state.environment.automaticRepairs) return state;
  for (const [key, cell] of Object.entries(state.observations.knownSurfaces)) {
    if (
      state.environment.orders.filter((order) => order.phase !== "completed")
        .length >= 16
    )
      break;
    const index = Number(key);
    if (state.observations.tileLastSeen[index] !== state.tick) continue;
    for (const layer of ["structure", "floor"] as const) {
      if (
        state.environment.orders.filter((order) => order.phase !== "completed")
          .length >= 16
      )
        break;
      const surface = cell[layer];
      if (surface && surface.integrity <= 55)
        state = orderSurfaceWork(
          state,
          {
            x: index % state.world.map.width,
            y: Math.floor(index / state.world.map.width),
          },
          layer,
          surface.material,
        ).state;
    }
  }
  return state;
}

export function observeStructuralDamage(state: GameState): GameState {
  const structures = Object.values(state.observations.knownSurfaces).flatMap(
    (cell) => (cell.structure ? [cell.structure] : []),
  );
  const failed = structures.filter((surface) => surface.integrity === 0).length;
  const damaged = structures.filter(
    (surface) => surface.integrity > 0 && surface.integrity <= 55,
  ).length;
  const ownIncident = state.incident.summary.startsWith("Structural damage:");
  if (
    state.incident.level === "red" ||
    (state.incident.level === "orange" && !ownIncident)
  )
    return state;
  if (failed)
    return {
      ...state,
      incident: {
        level: "orange",
        summary: `Structural damage: ${failed} recorded failed wall or door segments`,
      },
    };
  if (damaged && (ownIncident || state.incident.level === "green"))
    return {
      ...state,
      incident: {
        level: "yellow",
        summary: `Structural damage: ${damaged} recorded segments require maintenance`,
      },
    };
  if (ownIncident)
    return {
      ...state,
      incident: {
        level: "green",
        summary: "Recorded structural damage repaired",
      },
    };
  return state;
}
