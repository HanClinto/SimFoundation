import type { GameState } from "./state";
import { blocksSpace } from "./spaces";
import {
  reserveSupply,
  reservedObject,
  pickUpObject,
  putDownObject,
  consumeObject,
  objectFootprint,
} from "./objects";
import {
  MATERIALS,
  damageSurfaces,
  setSurface,
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
  readonly operation?: SurfaceOperation;
  readonly id: string;
  readonly position: TilePosition;
  readonly layer: SurfaceLayer;
  readonly material: MaterialId;
  readonly jobId: string;
  readonly phase: "collecting" | "delivering" | "fitting" | "completed";
  readonly blockedReason: string | null;
}
export type SurfaceOperation = "replace" | "floor" | "wall" | "door" | "remove";
export function surfaceOrderCost(
  order: Pick<SurfaceOrder, "material" | "operation">,
): number {
  return order.operation === "remove" ? 0 : MATERIALS[order.material].cost;
}

export function surfaceChangeIssue(
  state: GameState,
  position: TilePosition,
  layer: SurfaceLayer,
  operation: SurfaceOperation,
): SurfaceOrderCode | null {
  const surface = surfaceAt(state.world.map, position, layer);
  if (
    tileAt(state.world.map, position) === null ||
    !["floor", "structure"].includes(layer) ||
    !["replace", "floor", "wall", "door", "remove"].includes(operation)
  )
    return "invalid-position";
  if (operation === "replace") return surface ? null : "unknown-surface";
  if (operation === "remove" ? !surface : !!surface)
    return operation === "remove" ? "unknown-surface" : "occupied";
  if (
    (operation === "floor" && layer !== "floor") ||
    (["wall", "door"].includes(operation) && layer !== "structure")
  )
    return "invalid-position";
  const structure = surfaceAt(state.world.map, position, "structure");
  const floor = surfaceAt(state.world.map, position, "floor");
  if (
    (layer === "floor" && structure) ||
    (layer === "structure" &&
      operation !== "remove" &&
      (!floor || floor.integrity <= 0))
  )
    return "unsupported";
  const occupied =
    Object.values(state.world.positions).some((other) =>
      sameTile(other, position),
    ) ||
    state.objects.items.some(
      (item) =>
        item.location.kind === "ground" &&
        objectFootprint(item, item.location.position).some((other) =>
          sameTile(other, position),
        ),
    );
  if (occupied) return "occupied";
  if (
    state.observations.cameras.some((camera) =>
      sameTile(camera.position, position),
    )
  )
    return "occupied";
  if (
    state.storage.areas.some(
      (area) =>
        position.x >= area.origin.x &&
        position.x < area.origin.x + area.width &&
        position.y >= area.origin.y &&
        position.y < area.origin.y + area.height,
    )
  )
    return "occupied";
  if (
    state.construction.blueprints.some(
      (blueprint) =>
        !["completed", "cancelled"].includes(blueprint.status) &&
        position.x >= blueprint.origin.x &&
        position.x < blueprint.origin.x + 9 &&
        position.y >= blueprint.origin.y &&
        position.y < blueprint.origin.y + 7,
    )
  )
    return "occupied";
  if (
    state.objectOrders.some(
      (order) =>
        !["completed", "cancelled"].includes(order.phase) &&
        (() => {
          const item = state.objects.items.find(
            (item) => item.id === order.objectId,
          )!;
          return (
            order.install
              ? objectFootprint(
                  { ...item, orientation: order.orientation },
                  order.destination,
                )
              : [order.destination]
          ).some((other) => sameTile(other, position));
        })(),
    )
  )
    return "occupied";
  return null;
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
    if (!blocksSpace(tileAt(state.world.map, position)))
      queue.push(...neighbors(position));
  }
  return reached;
}
export function advanceExposure(state: GameState): GameState {
  const damage: SurfaceDamage[] = [];
  for (const source of state.environment.sources) {
    for (const position of exposureTiles(state, source)) {
      const layer = blocksSpace(tileAt(state.world.map, position))
        ? "structure"
        : "floor";
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
  | "invalid-position"
  | "occupied"
  | "unsupported"
  | "invalid-material";
export function orderSurfaceWork(
  state: GameState,
  position: TilePosition,
  layer: SurfaceLayer,
  material: MaterialId,
  operation: SurfaceOperation = "replace",
): { state: GameState; code: SurfaceOrderCode } {
  if (!Object.hasOwn(MATERIALS, material))
    return { state, code: "invalid-material" };
  const issue = surfaceChangeIssue(state, position, layer, operation);
  if (issue) return { state, code: issue };
  if (state.environment.orders.length >= 1000) return { state, code: "busy" };
  if (
    state.environment.orders.some(
      (order) =>
        order.phase !== "completed" &&
        sameTile(order.position, position) &&
        (order.layer === layer ||
          operation !== "replace" ||
          (order.operation ?? "replace") !== "replace"),
    )
  )
    return { state, code: "busy" };
  const workSite = neighbors(position).find(
    (site) =>
      isWalkable(state.world.map, site) &&
      Object.values(state.world.positions).some(
        (origin) => findRoute(state.world.map, origin, site) !== null,
      ),
  );
  if (!workSite) return { state, code: "unreachable" };
  const cost = surfaceOrderCost({ material, operation });
  if (state.construction.availableMaterials < cost)
    return { state, code: "insufficient-materials" };
  const id = `surface-${state.environment.nextOrder}`;
  const reserved =
    operation === "remove"
      ? { store: state.objects, objectId: null }
      : reserveSupply(
          state.objects,
          "materials",
          cost,
          state.construction.stockpile,
          `job-${id}`,
          true,
        );
  if (operation !== "remove" && !reserved.objectId)
    return { state, code: "insufficient-materials" };
  const recorded =
    state.observations.knownSurfaces[
      position.y * state.world.map.width + position.x
    ]?.[layer] ?? surfaceAt(state.world.map, position, layer)!;
  const job: SiteJob = {
    id: `job-${id}`,
    title:
      operation === "remove"
        ? `Remove ${layer} at ${position.x},${position.y}`
        : `Collect ${MATERIALS[material].name.toLowerCase()} for ${layer} ${position.x},${position.y}`,
    description: `${operation} ${layer} at ${position.x},${position.y}.`,
    skillId: operation === "remove" ? "engineering" : "logistics",
    priority:
      operation === "replace" &&
      recorded?.integrity === 0 &&
      layer === "structure"
        ? 95
        : 45,
    xpPerTick: 1,
    preferredBiases: { mindMight: 1, receptiveResolute: 1 },
    status: "available",
    progress: 0,
    requiredProgress: operation === "remove" ? 24 : 8,
    assignedPersonId: null,
    requiredWorkerId: null,
    assignmentReason: null,
    authorizedTick: state.tick,
    completedTick: null,
    workSite: (() => {
      if (operation === "remove") return workSite;
      const cargo = reservedObject(reserved.store, `job-${id}`)!;
      return cargo.location.kind === "ground"
        ? cargo.location.position
        : state.construction.stockpile;
    })(),
  };
  return {
    code: "accepted",
    state: {
      ...state,
      objects: reserved.store,
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
            operation,
            phase: operation === "remove" ? "fitting" : "collecting",
            blockedReason: null,
          },
        ],
      },
    },
  };
}

export function advanceSurfaceWork(state: GameState): GameState {
  let objects = state.objects;
  let jobs = [...state.jobs];
  let map = state.world.map;
  const orders = state.environment.orders.map((order): SurfaceOrder => {
    if (order.phase === "completed") return order;
    const job = jobs.find((job) => job.id === order.jobId)!;
    if (job.status !== "completed") return order;
    if (order.phase === "collecting") {
      const cargo = reservedObject(objects, job.id);
      const carrier = job.assignedPersonId;
      if (!cargo || !carrier)
        return {
          ...order,
          blockedReason: "Waiting for physical materials and a carrier.",
        };
      const workSite = neighbors(order.position).find(
        (site) =>
          isWalkable(map, site) &&
          findRoute(map, state.world.positions[carrier]!, site) !== null,
      );
      if (!workSite)
        return {
          ...order,
          blockedReason: "No accessible work face for delivery.",
        };
      const picked = pickUpObject(
        objects,
        cargo.id,
        job.id,
        carrier,
        state.world.positions[carrier]!,
      );
      if (picked === objects)
        return { ...order, blockedReason: "Materials pickup blocked." };
      objects = picked;
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
      const cargo = reservedObject(objects, job.id);
      const carrier = job.assignedPersonId;
      if (!cargo || !carrier)
        return {
          ...order,
          blockedReason: "Waiting for the materials carrier.",
        };
      const delivered = putDownObject(
        objects,
        cargo.id,
        job.id,
        carrier,
        job.workSite,
        state.world.positions[carrier]!,
      );
      if (delivered === objects)
        return {
          ...order,
          blockedReason: "Materials must reach the work site.",
        };
      objects = delivered;
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
    const operation = order.operation ?? "replace";
    const issue = surfaceChangeIssue(
      { ...state, objects, world: { ...state.world, map } },
      order.position,
      order.layer,
      operation,
    );
    if (issue)
      return {
        ...order,
        blockedReason: `Fitting blocked: ${issue}. Clear or restore the target tile.`,
      };
    if (operation === "remove") {
      map = setSurface(map, order.position, order.layer, null);
      return { ...order, phase: "completed", blockedReason: null };
    }
    const surface =
      operation === "replace"
        ? surfaceAt(map, order.position, order.layer)!
        : { kind: operation, material: order.material, integrity: 100 };
    if (
      (order.layer === "structure" &&
        surface.kind !== "door" &&
        Object.values(state.world.positions).some((position) =>
          sameTile(position, order.position),
        )) ||
      (order.layer === "structure" &&
        surface.kind !== "door" &&
        objects.items.some(
          (item) =>
            item.location.kind === "ground" &&
            objectFootprint(item, item.location.position).some((position) =>
              sameTile(position, order.position),
            ),
        ))
    )
      return {
        ...order,
        blockedReason:
          "Final assembly awaits clearance of the structure footprint.",
      };
    const cargo = reservedObject(objects, job.id);
    if (!cargo)
      return { ...order, blockedReason: "Delivered materials missing." };
    const consumed = consumeObject(objects, cargo.id, job.id, job.workSite);
    if (consumed === objects)
      return {
        ...order,
        blockedReason: "Materials must be delivered before fitting.",
      };
    objects = consumed;
    map = setSurface(map, order.position, order.layer, {
      ...surface,
      material: order.material,
      integrity: 100,
    });
    return { ...order, phase: "completed", blockedReason: null };
  });
  return {
    ...state,
    objects,
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
