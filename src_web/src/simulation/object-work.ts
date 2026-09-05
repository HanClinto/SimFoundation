import type { GameState } from "./state";
import {
  storageContains,
  storageQuantity,
  incomingQuantity,
  refreshMealSummary,
  storageAccepts,
} from "./storage";
import type { SiteJob } from "./jobs";
import {
  findRoute,
  isWalkable,
  sameTile,
  tileAt,
  type TilePosition,
} from "./world";
import { isActiveSurfaceOrder, neighbors } from "./environment";
import {
  OBJECT_DEFINITIONS,
  objectFootprint,
  objectStations,
  objectBlocks,
  pickUpObject,
  putDownObject,
  releaseObject,
  mergeGroundStack,
  reserveStack,
  type ObjectOrientation,
  type PhysicalObject,
} from "./objects";

export interface ObjectOrder {
  readonly id: string;
  readonly objectId: string;
  readonly jobId: string;
  readonly destination: TilePosition;
  readonly orientation: ObjectOrientation;
  readonly install: boolean;
  readonly phase: "pickup" | "carry" | "install" | "completed" | "cancelled";
  readonly blockedReason: string | null;
}
export type ObjectCommandCode =
  | "accepted"
  | "not-found"
  | "busy"
  | "invalid-position"
  | "occupied"
  | "unreachable"
  | "already-carried";
const activeOrder = (order: ObjectOrder) =>
  order.phase !== "completed" && order.phase !== "cancelled";

export function objectPlacementIssue(
  state: GameState,
  objectId: string,
  destination: TilePosition,
  orientation: ObjectOrientation,
  install = true,
  quantity?: number,
): ObjectCommandCode | null {
  const object = state.objects.items.find(
    (item) => item.id === objectId && item.location.kind !== "consumed",
  );
  if (!object) return "not-found";
  const area = state.storage.areas.find((area) =>
    storageContains(area, destination),
  );
  if (area) {
    if (install || !storageAccepts(state, area, object)) return "occupied";
    const alreadyHere =
      object.location.kind === "ground" &&
      storageContains(area, object.location.position)
        ? object.quantity
        : 0;
    if (
      storageQuantity(state, area) -
        alreadyHere +
        incomingQuantity(state, area, objectId) +
        (quantity ?? object.quantity) >
      area.capacity
    )
      return "occupied";
  }
  if (
    !["north", "east", "south", "west"].includes(orientation) ||
    !Number.isInteger(destination.x) ||
    !Number.isInteger(destination.y)
  )
    return "invalid-position";
  const footprint = install
    ? objectFootprint({ ...object, orientation }, destination)
    : [destination];
  if (
    install &&
    state.storage.areas.some((area) =>
      footprint.some((position) => storageContains(area, position)),
    )
  )
    return "occupied";
  if (
    footprint.some((position) => {
      const tile = tileAt(state.world.map, position);
      return (
        tile === null ||
        tile === "wall" ||
        tile === "closed-door" ||
        (install && tile !== "floor")
      );
    })
  )
    return "invalid-position";
  if (
    state.construction.blueprints.some(
      (blueprint) =>
        blueprint.status !== "cancelled" &&
        blueprint.status !== "completed" &&
        footprint.some(
          (tile) =>
            tile.x >= blueprint.origin.x &&
            tile.x < blueprint.origin.x + 9 &&
            tile.y >= blueprint.origin.y &&
            tile.y < blueprint.origin.y + 7,
        ),
    )
  )
    return "occupied";
  const conflicts = (position: TilePosition) =>
    footprint.some((tile) => sameTile(tile, position));
  if (
    state.environment.orders.some(
      (order) =>
        isActiveSurfaceOrder(order) &&
        (order.operation ?? "replace") !== "replace" &&
        conflicts(order.position),
    )
  )
    return "occupied";
  if (
    state.objects.items.some(
      (item) =>
        item.id !== objectId &&
        item.location.kind === "ground" &&
        (install ||
          item.installed ||
          !OBJECT_DEFINITIONS[item.kind].stackable) &&
        (item.installed
          ? objectFootprint(item, item.location.position)
          : [item.location.position]
        ).some(conflicts),
    )
  )
    return "occupied";
  if (
    state.objectOrders.some(
      (order) =>
        activeOrder(order) &&
        order.objectId !== objectId &&
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
          ).some(conflicts);
        })(),
    )
  )
    return "occupied";
  return null;
}

function workFace(
  state: GameState,
  object: PhysicalObject,
  position: TilePosition,
  orientation: ObjectOrientation,
  install: boolean,
): TilePosition | null {
  if (object.location.kind !== "ground") return null;
  const footprint = install
    ? objectFootprint({ ...object, orientation }, position)
    : [position];
  return (
    neighbors(position).find(
      (tile) =>
        !footprint.some((occupied) => sameTile(tile, occupied)) &&
        isWalkable(state.world.map, tile) &&
        findRoute(
          state.world.map,
          object.location.kind === "ground"
            ? object.location.position
            : position,
          tile,
        ) !== null,
    ) ?? null
  );
}

export function orderObjectMove(
  state: GameState,
  objectId: string,
  destination: TilePosition,
  orientation: ObjectOrientation,
  install = true,
  quantity?: number,
): { state: GameState; code: ObjectCommandCode } {
  const object = state.objects.items.find((item) => item.id === objectId);
  if (!object || object.location.kind === "consumed")
    return { state, code: "not-found" };
  if (
    object.reservedBy ||
    state.objectOrders.some(
      (order) => activeOrder(order) && order.objectId === objectId,
    )
  )
    return { state, code: "busy" };
  if (object.location.kind !== "ground")
    return { state, code: "already-carried" };
  install = install && !OBJECT_DEFINITIONS[object.kind].stackable;
  const issue = objectPlacementIssue(
    state,
    objectId,
    destination,
    orientation,
    install,
    quantity,
  );
  if (issue) return { state, code: issue };
  if (!workFace(state, object, destination, orientation, install))
    return { state, code: "unreachable" };
  const pickup = neighbors(object.location.position).find(
    (tile) =>
      isWalkable(state.world.map, tile) &&
      state.personnel.some(
        (person) =>
          findRoute(
            state.world.map,
            state.world.positions[person.id]!,
            tile,
          ) !== null,
      ),
  );
  if (!pickup) return { state, code: "unreachable" };
  const id = `object-order-${state.objectOrders.length + 1}`;
  const jobId = `job-${id}`;
  const reserved = reserveStack(
    state.objects,
    object.id,
    quantity ?? object.quantity,
    jobId,
  );
  if (!reserved.objectId) return { state, code: "invalid-position" };
  const inUse = Object.values(state.routines.activities).some(
    (activity) => activity.stationId === objectId,
  );
  const job: SiteJob = {
    id: jobId,
    title: `Pick up ${OBJECT_DEFINITIONS[object.kind].name.toLowerCase()}`,
    description: `Move ${objectId} to ${destination.x},${destination.y}.`,
    skillId: "logistics",
    priority: 45,
    xpPerTick: 1,
    preferredBiases: { mindMight: 1, receptiveResolute: 1 },
    status: inUse ? "proposed" : "available",
    progress: 0,
    requiredProgress: 8,
    assignedPersonId: null,
    assignmentReason: inUse ? "Waiting for the object user to finish." : null,
    authorizedTick: state.tick,
    completedTick: null,
    requiredWorkerId: null,
    workSite: pickup,
  };
  return {
    code: "accepted",
    state: refreshMealSummary({
      ...state,
      objects: reserved.store,
      objectOrders: [
        ...state.objectOrders,
        {
          id,
          objectId: reserved.objectId,
          jobId,
          destination,
          orientation,
          install,
          phase: "pickup",
          blockedReason: inUse ? job.assignmentReason : null,
        },
      ],
      jobs: [...state.jobs, job],
    }),
  };
}

export function cancelObjectMove(state: GameState, orderId: string): GameState {
  const order = state.objectOrders.find((order) => order.id === orderId);
  if (!order || order.phase !== "pickup") return state;
  return refreshMealSummary({
    ...state,
    objects: releaseObject(state.objects, order.objectId, order.jobId),
    objectOrders: state.objectOrders.map((candidate) =>
      candidate === order
        ? { ...candidate, phase: "cancelled", blockedReason: null }
        : candidate,
    ),
    jobs: state.jobs.filter((job) => job.id !== order.jobId),
    personnel: state.personnel.map((person) =>
      person.currentJobId === order.jobId
        ? { ...person, currentJobId: null, activity: "Object move cancelled" }
        : person,
    ),
  });
}

export function advanceObjectWork(state: GameState): GameState {
  let objects = state.objects;
  let jobs = [...state.jobs];
  const orders = state.objectOrders.map((order): ObjectOrder => {
    if (!activeOrder(order)) return order;
    const job = jobs.find((job) => job.id === order.jobId)!;
    const object = objects.items.find((item) => item.id === order.objectId)!;
    const inUse = Object.values(state.routines.activities).some(
      (activity) => activity.stationId === object.id,
    );
    if (inUse)
      return {
        ...order,
        blockedReason: "Waiting for the object user to finish.",
      };
    if (job.status === "proposed") {
      jobs = jobs.map((candidate) =>
        candidate.id === job.id
          ? { ...candidate, status: "available", assignmentReason: null }
          : candidate,
      );
      return { ...order, blockedReason: null };
    }
    if (job.status !== "completed") return order;
    const carrier = job.assignedPersonId;
    const carrierPosition = carrier ? state.world.positions[carrier] : null;
    if (order.phase === "pickup") {
      if (!carrier || !carrierPosition)
        return { ...order, blockedReason: "Waiting for a carrier." };
      if (
        state.personnel.find((person) => person.id === carrier)?.currentJobId ||
        state.routines.activities[carrier]
      )
        return {
          ...order,
          blockedReason: "Waiting for the pickup worker to be available.",
        };
      const target = workFace(
        state,
        object,
        order.destination,
        order.orientation,
        order.install,
      );
      if (!target)
        return {
          ...order,
          blockedReason: "Destination is no longer reachable.",
        };
      const picked = pickUpObject(
        objects,
        object.id,
        job.id,
        carrier,
        carrierPosition,
      );
      if (picked === objects)
        return {
          ...order,
          blockedReason: "Pickup blocked; carrier or object unavailable.",
        };
      objects = picked;
      jobs = jobs.map((candidate) =>
        candidate.id === job.id
          ? {
              ...candidate,
              title: `Carry ${OBJECT_DEFINITIONS[object.kind].name.toLowerCase()}`,
              status: "available",
              progress: 0,
              completedTick: null,
              assignedPersonId: null,
              requiredWorkerId: carrier,
              workSite: target,
            }
          : candidate,
      );
      return { ...order, phase: "carry", blockedReason: null };
    }
    if (order.phase === "carry") {
      const issue = objectPlacementIssue(
        { ...state, objects },
        object.id,
        order.destination,
        order.orientation,
        order.install,
      );
      const footprint = order.install
        ? objectFootprint(
            { ...object, orientation: order.orientation },
            order.destination,
          )
        : [order.destination];
      if (
        issue ||
        Object.values(state.world.positions).some((position) =>
          footprint.some((tile) => sameTile(tile, position)),
        )
      )
        return {
          ...order,
          blockedReason: issue
            ? `Placement blocked: ${issue}.`
            : "Waiting for the placement footprint to clear.",
        };
      if (!carrier || !carrierPosition) return order;
      const placed = putDownObject(
        objects,
        object.id,
        job.id,
        carrier,
        order.destination,
        carrierPosition,
        false,
        order.orientation,
      );
      if (placed === objects)
        return {
          ...order,
          blockedReason: "Carrier must reach the destination.",
        };
      objects = placed;
      if (!order.install) {
        objects = mergeGroundStack(
          releaseObject(objects, object.id, job.id),
          object.id,
        );
        return { ...order, phase: "completed", blockedReason: null };
      }
      jobs = jobs.map((candidate) =>
        candidate.id === job.id
          ? {
              ...candidate,
              title: `Install ${OBJECT_DEFINITIONS[object.kind].name.toLowerCase()}`,
              skillId: "engineering",
              status: "available",
              progress: 0,
              requiredProgress: 16,
              assignedPersonId: null,
              requiredWorkerId: null,
              completedTick: null,
            }
          : candidate,
      );
      return { ...order, phase: "install", blockedReason: null };
    }
    const issue = objectPlacementIssue(
      { ...state, objects },
      object.id,
      order.destination,
      order.orientation,
      true,
    );
    if (
      issue ||
      Object.values(state.world.positions).some((position) =>
        objectFootprint(object, order.destination).some((tile) =>
          sameTile(tile, position),
        ),
      )
    )
      return {
        ...order,
        blockedReason: "Installation awaits a clear, usable footprint.",
      };
    objects = {
      ...objects,
      items: objects.items.map((item) =>
        item.id === object.id
          ? { ...item, installed: true, reservedBy: null }
          : item,
      ),
    };
    return { ...order, phase: "completed", blockedReason: null };
  });
  const activeStations = objectStations(objects);
  const occupiedStations = state.routines.stations.filter(
    (station) =>
      objects.items.some(
        (item) =>
          item.id === station.id &&
          item.installed &&
          item.condition > 0 &&
          item.location.kind === "ground",
      ) &&
      Object.values(state.routines.activities).some(
        (activity) => activity.stationId === station.id,
      ) &&
      !activeStations.some((candidate) => candidate.id === station.id),
  );
  return refreshMealSummary({
    ...state,
    objects,
    jobs,
    objectOrders: orders,
    world: {
      ...state.world,
      map: {
        ...state.world.map,
        objectBlocks: objectBlocks(objects, state.world.map.width),
      },
    },
    routines: {
      ...state.routines,
      stations: [...activeStations, ...occupiedStations],
    },
  });
}
