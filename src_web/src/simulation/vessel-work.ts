import type { GameState } from "./state";
import type { SiteJob } from "./jobs";
import { MATERIALS, type MaterialId } from "./materials";
import {
  consumeObject,
  objectFootprint,
  pickUpObject,
  putDownObject,
  releaseObject,
  reserveSupply,
  OBJECT_DEFINITIONS,
  type PhysicalObject,
} from "./objects";
import {
  findRoute,
  isWalkable,
  sameTile,
  tileAt,
  type TilePosition,
} from "./world";
import { neighbors, isActiveSurfaceOrder } from "./environment";
import { storageContains } from "./storage";

export type VesselAction =
  | "craft"
  | "load"
  | "unload"
  | "seal"
  | "open"
  | "transport";
export interface VesselOrder {
  readonly id: string;
  readonly jobId: string;
  readonly action: VesselAction;
  readonly vesselId: string;
  readonly cargoId: string | null;
  readonly material: MaterialId;
  readonly position: TilePosition;
  readonly phase:
    | "collecting"
    | "delivering"
    | "working"
    | "transit"
    | "completed"
    | "cancelled";
  readonly transport?: {
    readonly mode: "helicopter" | "truck";
    readonly duration: number;
    readonly arrivesAt: number | null;
  };
  readonly blockedReason: string | null;
}
export interface VesselWork {
  readonly nextId: number;
  readonly orders: readonly VesselOrder[];
}
export type VesselCommandCode =
  | "accepted"
  | "not-found"
  | "busy"
  | "invalid-position"
  | "invalid-cargo"
  | "sealed"
  | "damaged"
  | "insufficient-materials"
  | "unreachable";
export function activeVesselOrder(order: VesselOrder): boolean {
  return !["completed", "cancelled"].includes(order.phase);
}
export function vesselReservesTile(
  state: GameState,
  position: TilePosition,
): boolean {
  return state.vesselWork.orders.some(
    (order) =>
      activeVesselOrder(order) &&
      ["craft", "unload", "transport"].includes(order.action) &&
      sameTile(order.position, position),
  );
}
export function vesselCost(material: MaterialId): number {
  return MATERIALS[material].cost * 4;
}
export function vesselMaterialCommitted(state: GameState): number {
  return state.vesselWork.orders.reduce(
    (sum, order) =>
      sum +
      (order.action === "craft" && order.phase !== "cancelled"
        ? vesselCost(order.material)
        : 0),
    0,
  );
}

export function vesselPlacementIssue(
  state: GameState,
  position: TilePosition,
  exceptId?: string,
): VesselCommandCode | null {
  if (
    tileAt(state.world.map, position) !== "floor" ||
    !isWalkable(state.world.map, position)
  )
    return "invalid-position";
  if (
    state.storage.areas.some((area) => storageContains(area, position)) ||
    state.objects.items.some(
      (item) =>
        item.location.kind === "ground" &&
        objectFootprint(item, item.location.position).some((tile) =>
          sameTile(tile, position),
        ),
    ) ||
    state.observations.cameras.some((camera) =>
      sameTile(camera.position, position),
    )
  )
    return "invalid-position";
  if (
    state.vesselWork.orders.some(
      (order) =>
        order.id !== exceptId &&
        activeVesselOrder(order) &&
        ["craft", "unload", "transport"].includes(order.action) &&
        sameTile(order.position, position),
    ) ||
    state.environment.orders.some(
      (order) =>
        isActiveSurfaceOrder(order) && sameTile(order.position, position),
    ) ||
    state.objectOrders.some(
      (order) =>
        !["completed", "cancelled"].includes(order.phase) &&
        (order.install
          ? objectFootprint(
              {
                ...state.objects.items.find(
                  (item) => item.id === order.objectId,
                )!,
                orientation: order.orientation,
              },
              order.destination,
            )
          : [order.destination]
        ).some((tile) => sameTile(tile, position)),
    ) ||
    state.construction.blueprints.some(
      (blueprint) =>
        !["completed", "cancelled"].includes(blueprint.status) &&
        position.x >= blueprint.origin.x &&
        position.x < blueprint.origin.x + 9 &&
        position.y >= blueprint.origin.y &&
        position.y < blueprint.origin.y + 7,
    )
  )
    return "busy";
  return null;
}

function jobFor(
  state: GameState,
  order: VesselOrder,
  workSite: TilePosition,
  skillId: SiteJob["skillId"],
): SiteJob {
  return {
    id: order.jobId,
    title: `${order.action === "craft" ? "Collect vessel materials" : `${order.action} containment vessel`}`,
    description: "Physical vessel work",
    skillId,
    priority: 50,
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
    workSite,
  };
}
function addOrder(
  state: GameState,
  order: VesselOrder,
  job: SiteJob,
): GameState {
  return {
    ...state,
    jobs: [...state.jobs, job],
    vesselWork: {
      nextId: state.vesselWork.nextId + 1,
      orders: [...state.vesselWork.orders, order],
    },
  };
}

export function craftVessel(
  state: GameState,
  position: TilePosition,
  material: MaterialId,
): { state: GameState; code: VesselCommandCode } {
  if (!Object.hasOwn(MATERIALS, material))
    return { state, code: "invalid-cargo" };
  const issue = vesselPlacementIssue(state, position);
  if (issue) return { state, code: issue };
  if (state.vesselWork.orders.length >= 1000) return { state, code: "busy" };
  const id = `vessel-order-${state.vesselWork.nextId}`;
  const jobId = `job-${id}`;
  if (state.construction.availableMaterials < vesselCost(material))
    return { state, code: "insufficient-materials" };
  const supply = reserveSupply(
    state.objects,
    "materials",
    vesselCost(material),
    state.construction.stockpile,
    jobId,
    true,
  );
  const cargo = supply.store.items.find((item) => item.id === supply.objectId);
  if (!cargo || cargo.location.kind !== "ground")
    return { state, code: "insufficient-materials" };
  const origin = cargo.location.position;
  if (
    !neighbors(position).some((tile) =>
      findRoute(state.world.map, origin, tile),
    )
  )
    return { state, code: "unreachable" };
  const order: VesselOrder = {
    id,
    jobId,
    action: "craft",
    vesselId: `vessel-${state.vesselWork.nextId}`,
    cargoId: cargo.id,
    material,
    position: { ...position },
    phase: "collecting",
    blockedReason: null,
  };
  return {
    code: "accepted",
    state: addOrder(
      {
        ...state,
        objects: supply.store,
        construction: {
          ...state.construction,
          availableMaterials:
            state.construction.availableMaterials - vesselCost(material),
        },
      },
      order,
      jobFor(state, order, origin, "logistics"),
    ),
  };
}

export function orderVesselAction(
  state: GameState,
  vesselId: string,
  action: Exclude<VesselAction, "craft">,
  cargoId?: string,
  destination?: TilePosition,
  transport?: { mode: "helicopter" | "truck"; duration: number },
): { state: GameState; code: VesselCommandCode } {
  if (action !== "load" && cargoId !== undefined)
    return { state, code: "invalid-cargo" };
  const vessel = state.objects.items.find(
    (item) => item.id === vesselId && item.kind === "vessel",
  );
  if (!vessel?.vessel || vessel.location.kind !== "ground")
    return { state, code: "not-found" };
  if (vessel.reservedBy || state.vesselWork.orders.length >= 1000)
    return { state, code: "busy" };
  const origin = vessel.location.position;
  const content = state.objects.items.find(
    (item) =>
      item.location.kind === "contained" && item.location.vesselId === vesselId,
  );
  let cargo = cargoId
    ? state.objects.items.find((item) => item.id === cargoId)
    : undefined;
  const position =
    action === "unload" || action === "transport" ? destination : origin;
  if (
    !["load", "unload", "seal", "open", "transport"].includes(action) ||
    !position
  )
    return { state, code: "invalid-cargo" };
  if (action === "transport") {
    if (
      !transport ||
      !["truck", "helicopter"].includes(transport.mode) ||
      !Number.isInteger(transport.duration) ||
      transport.duration < 30 ||
      transport.duration > 1440
    )
      return { state, code: "invalid-cargo" };
    if (!vessel.vessel.sealed || vessel.condition <= 0)
      return { state, code: "damaged" };
    const issue = vesselPlacementIssue(state, position);
    if (issue) return { state, code: issue };
  }
  if (action === "seal" && vessel.condition <= 0)
    return { state, code: "damaged" };
  if (
    (action === "seal") === vessel.vessel.sealed &&
    ["seal", "open"].includes(action)
  )
    return { state, code: "busy" };
  if (["load", "unload"].includes(action) && vessel.vessel.sealed)
    return { state, code: "sealed" };
  if (
    action === "load" &&
    (content ||
      !cargo ||
      cargo.kind === "vessel" ||
      OBJECT_DEFINITIONS[cargo.kind].stackable ||
      cargo.quantity !== 1 ||
      cargo.installed ||
      cargo.reservedBy ||
      cargo.location.kind !== "ground")
  )
    return { state, code: "invalid-cargo" };
  if (action === "unload") {
    if (!content) return { state, code: "invalid-cargo" };
    cargo = content;
    const issue = vesselPlacementIssue(state, position);
    if (issue) return { state, code: issue };
  }
  const cargoPosition =
    action === "load" && cargo?.location.kind === "ground"
      ? cargo.location.position
      : action === "transport"
        ? origin
        : position;
  const workSite = [origin, ...neighbors(origin)].find(
    (tile) =>
      isWalkable(state.world.map, tile) &&
      Math.abs(tile.x - cargoPosition.x) + Math.abs(tile.y - cargoPosition.y) <=
        1 &&
      state.personnel.some((person) => {
        const start = state.world.positions[person.id];
        return start && findRoute(state.world.map, start, tile) !== null;
      }),
  );
  if (!workSite) return { state, code: "unreachable" };
  const id = `vessel-order-${state.vesselWork.nextId}`;
  const order: VesselOrder = {
    id,
    jobId: `job-${id}`,
    action,
    vesselId,
    cargoId: cargo?.id ?? null,
    material: vessel.vessel.material,
    position: { ...position },
    phase: "working",
    blockedReason: null,
    ...(action === "transport"
      ? { transport: { ...transport!, arrivesAt: null } }
      : {}),
  };
  const objects = {
    ...state.objects,
    items: state.objects.items.map((item) =>
      item.id === vesselId || (action === "load" && item.id === cargo?.id)
        ? { ...item, reservedBy: order.jobId }
        : item,
    ),
  };
  return {
    code: "accepted",
    state: addOrder(
      { ...state, objects },
      order,
      jobFor(
        state,
        order,
        workSite,
        action === "seal" || action === "open" ? "engineering" : "logistics",
      ),
    ),
  };
}

export function advanceVesselWork(state: GameState): GameState {
  let objects = state.objects;
  let jobs = [...state.jobs];
  const orders = state.vesselWork.orders.map((order): VesselOrder => {
    if (!activeVesselOrder(order)) return order;
    if (order.phase === "transit") {
      if (state.tick < order.transport!.arrivesAt!) return order;
      if (
        vesselPlacementIssue({ ...state, objects }, order.position, order.id) ||
        Object.values(state.world.positions).some((position) =>
          sameTile(position, order.position),
        )
      )
        return {
          ...order,
          blockedReason:
            "Awaiting a clear deposit tile; containment wear continues.",
        };
      objects = {
        ...objects,
        items: objects.items.map((item) =>
          item.id === order.vesselId
            ? {
                ...item,
                reservedBy: null,
                location: { kind: "ground", position: { ...order.position } },
              }
            : item,
        ),
      };
      return { ...order, phase: "completed", blockedReason: null };
    }
    const job = jobs.find((job) => job.id === order.jobId)!;
    if (job.status !== "completed") return order;
    const cargo = objects.items.find((item) => item.id === order.cargoId);
    const carrier = job.assignedPersonId;
    const origin = carrier ? state.world.positions[carrier] : undefined;
    if (!origin) return { ...order, blockedReason: "Worker unavailable." };
    if (order.phase === "collecting") {
      const workSite = neighbors(order.position).find(
        (tile) => findRoute(state.world.map, origin, tile) !== null,
      );
      if (!workSite || !cargo || !carrier)
        return {
          ...order,
          blockedReason: "No accessible fabrication work face.",
        };
      const picked = pickUpObject(objects, cargo.id, job.id, carrier, origin);
      if (picked === objects)
        return { ...order, blockedReason: "Materials pickup blocked." };
      objects = picked;
      jobs = jobs.map((candidate) =>
        candidate.id === job.id
          ? {
              ...job,
              title: "Deliver vessel materials",
              status: "available",
              progress: 0,
              completedTick: null,
              assignedPersonId: null,
              requiredWorkerId: carrier,
              workSite,
            }
          : candidate,
      );
      return { ...order, phase: "delivering", blockedReason: null };
    }
    if (order.phase === "delivering") {
      if (!cargo || !carrier) return order;
      const placed = putDownObject(
        objects,
        cargo.id,
        job.id,
        carrier,
        job.workSite,
        origin,
      );
      if (placed === objects)
        return { ...order, blockedReason: "Materials delivery blocked." };
      objects = placed;
      jobs = jobs.map((candidate) =>
        candidate.id === job.id
          ? {
              ...job,
              title: `Fabricate ${MATERIALS[order.material].name.toLowerCase()} vessel`,
              skillId: "engineering",
              status: "available",
              progress: 0,
              requiredProgress: 48,
              completedTick: null,
              assignedPersonId: null,
              requiredWorkerId: null,
            }
          : candidate,
      );
      return { ...order, phase: "working", blockedReason: null };
    }
    if (order.action === "craft") {
      const issue = vesselPlacementIssue(
        { ...state, objects },
        order.position,
        order.id,
      );
      if (
        issue ||
        Object.values(state.world.positions).some((position) =>
          sameTile(position, order.position),
        )
      )
        return {
          ...order,
          blockedReason: "Fabrication footprint must be clear.",
        };
      if (!cargo)
        return { ...order, blockedReason: "Reserved materials missing." };
      const consumed = consumeObject(objects, cargo.id, job.id, origin);
      if (consumed === objects)
        return {
          ...order,
          blockedReason: "Materials must be at the work face.",
        };
      const vessel: PhysicalObject = {
        id: order.vesselId,
        kind: "vessel",
        quantity: 1,
        condition: 100,
        installed: false,
        orientation: "north",
        reservedBy: null,
        location: { kind: "ground", position: { ...order.position } },
        vessel: { material: order.material, sealed: false },
      };
      objects = { ...consumed, items: [...consumed.items, vessel] };
    } else {
      const vessel = objects.items.find((item) => item.id === order.vesselId)!;
      if (
        !vessel?.vessel ||
        vessel.location.kind !== "ground" ||
        Math.abs(origin.x - vessel.location.position.x) +
          Math.abs(origin.y - vessel.location.position.y) >
          1
      )
        return { ...order, blockedReason: "Worker must reach the vessel." };
      if (order.action === "transport") {
        if (!vessel.vessel.sealed || vessel.condition <= 0)
          return {
            ...order,
            blockedReason: "Transport requires an intact sealed vessel.",
          };
        objects = {
          ...objects,
          items: objects.items.map((item) =>
            item.id === vessel.id
              ? { ...item, location: { kind: "transit", orderId: order.id } }
              : item,
          ),
        };
        return {
          ...order,
          phase: "transit",
          transport: {
            ...order.transport!,
            arrivesAt: state.tick + order.transport!.duration,
          },
          blockedReason: null,
        };
      } else if (order.action === "load") {
        if (
          !cargo ||
          cargo.location.kind !== "ground" ||
          vessel.vessel.sealed ||
          Math.abs(origin.x - cargo.location.position.x) +
            Math.abs(origin.y - cargo.location.position.y) >
            1
        )
          return {
            ...order,
            blockedReason: "Stage packed cargo beside the open vessel.",
          };
        objects = {
          ...objects,
          items: objects.items.map((item) =>
            item.id === cargo.id
              ? {
                  ...item,
                  installed: false,
                  reservedBy: null,
                  location: { kind: "contained", vesselId: vessel.id },
                }
              : item,
          ),
        };
      } else if (order.action === "unload") {
        if (
          !cargo ||
          vessel.vessel.sealed ||
          vesselPlacementIssue(
            { ...state, objects },
            order.position,
            order.id,
          ) ||
          Object.values(state.world.positions).some((position) =>
            sameTile(position, order.position),
          )
        )
          return {
            ...order,
            blockedReason: "Clear the unloading tile beside the open vessel.",
          };
        objects = {
          ...objects,
          items: objects.items.map((item) =>
            item.id === cargo.id
              ? {
                  ...item,
                  location: { kind: "ground", position: { ...order.position } },
                  reservedBy: null,
                }
              : item,
          ),
        };
      } else {
        if (order.action === "seal" && vessel.condition <= 0)
          return {
            ...order,
            blockedReason: "A breached vessel cannot be sealed.",
          };
        objects = {
          ...objects,
          items: objects.items.map((item) =>
            item.id === vessel.id
              ? {
                  ...item,
                  vessel: {
                    ...vessel.vessel!,
                    sealed: order.action === "seal",
                  },
                }
              : item,
          ),
        };
      }
      objects = releaseObject(objects, vessel.id, job.id);
    }
    return { ...order, phase: "completed", blockedReason: null };
  });
  return {
    ...state,
    objects,
    jobs,
    vesselWork: { ...state.vesselWork, orders },
  };
}

export function cancelVesselWork(state: GameState, id: string): GameState {
  const order = state.vesselWork.orders.find((order) => order.id === id);
  if (
    !order ||
    !activeVesselOrder(order) ||
    order.phase === "delivering" ||
    order.phase === "transit"
  )
    return state;
  let objects = releaseObject(state.objects, order.vesselId, order.jobId);
  if (order.cargoId)
    objects = releaseObject(objects, order.cargoId, order.jobId);
  return {
    ...state,
    objects,
    jobs: state.jobs.filter((job) => job.id !== order.jobId),
    personnel: state.personnel.map((person) =>
      person.currentJobId === order.jobId
        ? { ...person, currentJobId: null, activity: "Vessel work cancelled" }
        : person,
    ),
    construction: {
      ...state.construction,
      availableMaterials:
        state.construction.availableMaterials +
        (order.action === "craft" ? vesselCost(order.material) : 0),
    },
    vesselWork: {
      ...state.vesselWork,
      orders: state.vesselWork.orders.map((candidate) =>
        candidate === order
          ? { ...candidate, phase: "cancelled", blockedReason: null }
          : candidate,
      ),
    },
  };
}
