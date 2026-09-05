import type { GameState } from "./state";
import {
  OBJECT_DEFINITIONS,
  objectFootprint,
  type ObjectKind,
  type PhysicalObject,
} from "./objects";
import { findRoute, isWalkable, tileAt, type TilePosition } from "./world";
import { orderObjectMove } from "./object-work";

export interface StorageArea {
  readonly id: string;
  readonly name: string;
  readonly origin: TilePosition;
  readonly width: number;
  readonly height: number;
  readonly accepts: readonly ObjectKind[];
  readonly capacity: number;
  readonly target: number;
  readonly serveMeals: boolean;
  readonly enabled: boolean;
}
export interface StorageState {
  readonly nextId: number;
  readonly areas: readonly StorageArea[];
  readonly blockedReasons: Readonly<Record<string, string>>;
}

export function createStorage(): StorageState {
  return {
    nextId: 4,
    blockedReasons: {},
    areas: [
      {
        id: "storage-1",
        name: "Dining pantry",
        origin: { x: 58, y: 67 },
        width: 1,
        height: 1,
        accepts: ["meals"],
        capacity: 36,
        target: 24,
        serveMeals: true,
        enabled: true,
      },
      {
        id: "storage-2",
        name: "Materials store",
        origin: { x: 67, y: 68 },
        width: 1,
        height: 1,
        accepts: ["materials"],
        capacity: 160,
        target: 0,
        serveMeals: false,
        enabled: true,
      },
      {
        id: "storage-3",
        name: "Meal reserve",
        origin: { x: 65, y: 68 },
        width: 1,
        height: 1,
        accepts: ["meals"],
        capacity: 108,
        target: 0,
        serveMeals: false,
        enabled: true,
      },
    ],
  };
}

export function storageContains(
  area: StorageArea,
  position: TilePosition,
): boolean {
  return (
    position.x >= area.origin.x &&
    position.y >= area.origin.y &&
    position.x < area.origin.x + area.width &&
    position.y < area.origin.y + area.height
  );
}
export function storedObjects(
  state: GameState,
  area: StorageArea,
): readonly PhysicalObject[] {
  return state.objects.items.filter(
    (item) =>
      item.location.kind === "ground" &&
      storageContains(area, item.location.position),
  );
}
export function storageQuantity(state: GameState, area: StorageArea): number {
  return storedObjects(state, area).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
}
export function servingMealCount(state: GameState): number {
  return state.objects.items
    .filter(
      (item) =>
        item.kind === "meals" &&
        !item.reservedBy &&
        item.location.kind === "ground" &&
        state.storage.areas.some(
          (area) =>
            area.enabled &&
            area.serveMeals &&
            area.accepts.includes("meals") &&
            item.location.kind === "ground" &&
            storageContains(area, item.location.position),
        ),
    )
    .reduce((sum, item) => sum + item.quantity, 0);
}
export function mealCollectionPoint(
  state: GameState,
  origin: TilePosition,
): TilePosition | null {
  return (
    state.objects.items
      .filter(
        (item) =>
          item.kind === "meals" &&
          item.quantity > 0 &&
          !item.reservedBy &&
          item.location.kind === "ground" &&
          state.storage.areas.some(
            (area) =>
              area.enabled &&
              area.serveMeals &&
              area.accepts.includes("meals") &&
              item.location.kind === "ground" &&
              storageContains(area, item.location.position),
          ),
      )
      .flatMap((item) => {
        if (item.location.kind !== "ground") return [];
        const route = findRoute(
          state.world.map,
          origin,
          item.location.position,
        );
        return route
          ? [
              {
                position: item.location.position,
                length: route.length,
                id: item.id,
              },
            ]
          : [];
      })
      .sort(
        (first, second) =>
          first.length - second.length || first.id.localeCompare(second.id),
      )[0]?.position ?? null
  );
}

export function storageTiles(
  area: Pick<StorageArea, "origin" | "width" | "height">,
): readonly TilePosition[] {
  return Array.from({ length: area.width * area.height }, (_, index) => ({
    x: area.origin.x + (index % area.width),
    y: area.origin.y + Math.floor(index / area.width),
  }));
}
export type StorageCommandCode =
  | "accepted"
  | "invalid-policy"
  | "invalid-floor"
  | "overlap"
  | "occupied"
  | "busy"
  | "not-found";
export type StoragePolicy = Omit<StorageArea, "id">;
export function incomingQuantity(
  state: GameState,
  area: StorageArea,
  exceptObject?: string,
): number {
  return state.objectOrders
    .filter(
      (order) =>
        !["completed", "cancelled"].includes(order.phase) &&
        order.objectId !== exceptObject &&
        storageContains(area, order.destination),
    )
    .reduce((sum, order) => {
      const item = state.objects.items.find(
        (item) => item.id === order.objectId,
      );
      return (
        sum +
        (item &&
        !(
          item.location.kind === "ground" &&
          storageContains(area, item.location.position)
        )
          ? item.quantity
          : 0)
      );
    }, 0);
}
export function storagePlacementIssue(
  state: GameState,
  policy: StoragePolicy,
  id?: string,
): StorageCommandCode | null {
  if (
    !policy.name.trim() ||
    policy.name.length > 60 ||
    !Number.isInteger(policy.width) ||
    !Number.isInteger(policy.height) ||
    policy.width < 1 ||
    policy.height < 1 ||
    policy.width > 8 ||
    policy.height > 8 ||
    !Number.isInteger(policy.origin.x) ||
    !Number.isInteger(policy.origin.y) ||
    !Number.isInteger(policy.capacity) ||
    policy.capacity < 1 ||
    policy.capacity > 1000 ||
    !Number.isInteger(policy.target) ||
    policy.target < 0 ||
    policy.target > policy.capacity ||
    !policy.accepts.length ||
    new Set(policy.accepts).size !== policy.accepts.length ||
    policy.accepts.some((kind) => !Object.hasOwn(OBJECT_DEFINITIONS, kind)) ||
    typeof policy.enabled !== "boolean" ||
    typeof policy.serveMeals !== "boolean" ||
    (policy.serveMeals && !policy.accepts.includes("meals"))
  )
    return "invalid-policy";
  const old = state.storage.areas.find((area) => area.id === id);
  if (id && !old) return "not-found";
  if (!id && state.storage.areas.length >= 32) return "invalid-policy";
  const area = { ...policy, id: id ?? "preview" };
  const tiles = storageTiles(area);
  if (
    tiles.some(
      (position) =>
        tileAt(state.world.map, position) !== "floor" ||
        !isWalkable(state.world.map, position),
    )
  )
    return "invalid-floor";
  if (
    state.storage.areas.some(
      (other) =>
        other.id !== id &&
        tiles.some((position) => storageContains(other, position)),
    )
  )
    return "overlap";
  if (
    state.construction.blueprints.some(
      (blueprint) =>
        !["completed", "cancelled"].includes(blueprint.status) &&
        tiles.some(
          (position) =>
            position.x >= blueprint.origin.x &&
            position.y >= blueprint.origin.y &&
            position.x < blueprint.origin.x + 9 &&
            position.y < blueprint.origin.y + 7,
        ),
    )
  )
    return "overlap";
  if (
    state.objectOrders.some(
      (order) =>
        !["completed", "cancelled"].includes(order.phase) &&
        (storageContains(area, order.destination) ||
          (old && storageContains(old, order.destination))),
    )
  )
    return "busy";
  if (
    state.objects.items.some(
      (item) =>
        item.location.kind === "ground" &&
        ((item.reservedBy &&
          (storageContains(area, item.location.position) ||
            (old && storageContains(old, item.location.position)))) ||
          (item.installed &&
            objectFootprint(item, item.location.position).some((position) =>
              storageContains(area, position),
            ))),
    )
  )
    return "occupied";
  const contents = storedObjects(state, area);
  if (
    contents.some((item) => !area.accepts.includes(item.kind)) ||
    storageQuantity(state, area) > area.capacity
  )
    return "occupied";
  return null;
}
export function setStorageArea(
  state: GameState,
  policy: StoragePolicy,
  id?: string,
): { state: GameState; code: StorageCommandCode } {
  const issue = storagePlacementIssue(state, policy, id);
  if (issue) return { state, code: issue };
  const area = {
    ...policy,
    origin: { ...policy.origin },
    accepts: [...policy.accepts],
    id: id ?? `storage-${state.storage.nextId}`,
  };
  return {
    code: "accepted",
    state: refreshMealSummary({
      ...state,
      storage: {
        ...state.storage,
        nextId: state.storage.nextId + Number(!id),
        areas: id
          ? state.storage.areas.map((existing) =>
              existing.id === id ? area : existing,
            )
          : [...state.storage.areas, area],
        blockedReasons: {},
      },
    }),
  };
}
export function removeStorageArea(
  state: GameState,
  id: string,
): { state: GameState; code: StorageCommandCode } {
  const area = state.storage.areas.find((area) => area.id === id);
  if (!area) return { state, code: "not-found" };
  if (
    state.objectOrders.some(
      (order) =>
        !["completed", "cancelled"].includes(order.phase) &&
        storageContains(area, order.destination),
    ) ||
    storedObjects(state, area).some((item) => item.reservedBy)
  )
    return { state, code: "busy" };
  return {
    code: "accepted",
    state: refreshMealSummary({
      ...state,
      storage: {
        ...state.storage,
        areas: state.storage.areas.filter((area) => area.id !== id),
        blockedReasons: {},
      },
    }),
  };
}
export function refreshMealSummary(state: GameState): GameState {
  const pantryMeals = servingMealCount(state);
  const meals = state.objects.items
    .filter(
      (item) =>
        item.kind === "meals" &&
        item.location.kind !== "consumed" &&
        !item.reservedBy?.startsWith("routine-"),
    )
    .reduce((sum, item) => sum + item.quantity, 0);
  return {
    ...state,
    routines: {
      ...state.routines,
      pantryMeals,
      reserveMeals: meals - pantryMeals,
    },
  };
}
export function discoverStorageWork(state: GameState): GameState {
  const reasons: Record<string, string> = {};
  for (const area of state.storage.areas) {
    if (!area.enabled) continue;
    const quantity = storageQuantity(state, area);
    const incoming = incomingQuantity(state, area);
    if (quantity + incoming >= area.target) {
      if (quantity + incoming >= area.capacity)
        reasons[area.id] = "Storage full.";
      continue;
    }
    if (
      state.objectOrders.filter(
        (order) => !["completed", "cancelled"].includes(order.phase),
      ).length >= 16
    ) {
      reasons[area.id] = "Waiting for active hauling orders.";
      continue;
    }
    const candidates = state.objects.items
      .filter(
        (item) =>
          item.location.kind === "ground" &&
          !item.installed &&
          !item.reservedBy &&
          area.accepts.includes(item.kind) &&
          !storageContains(area, item.location.position),
      )
      .map((item) => {
        const position =
          item.location.kind === "ground" ? item.location.position : null;
        const source = position
          ? state.storage.areas.find((other) =>
              storageContains(other, position),
            )
          : undefined;
        const surplus =
          source?.enabled && source.accepts.includes(item.kind)
            ? Math.max(
                0,
                storedObjects(state, source)
                  .filter((item) => !item.reservedBy)
                  .reduce((sum, item) => sum + item.quantity, 0) -
                  source.target,
              )
            : item.quantity;
        return { item, available: Math.min(item.quantity, surplus) };
      })
      .filter((candidate) => candidate.available > 0)
      .sort((first, second) => first.item.id.localeCompare(second.item.id));
    if (!candidates.length) {
      reasons[area.id] =
        "No available source stock; other stocking targets and reservations are protected.";
      continue;
    }
    let queued = false;
    let lastReason = "No accessible delivery tile.";
    for (const { item, available } of candidates) {
      const amount = Math.min(
        available,
        area.target - quantity - incoming,
        area.capacity - quantity - incoming,
        OBJECT_DEFINITIONS[item.kind].stackable ? 12 : 1,
      );
      for (const destination of storageTiles(area)) {
        const result = orderObjectMove(
          state,
          item.id,
          destination,
          item.orientation,
          false,
          amount,
        );
        if (result.code === "accepted") {
          state = result.state;
          queued = true;
          break;
        }
        lastReason =
          result.code === "unreachable"
            ? "Source or destination is unreachable."
            : result.code === "occupied"
              ? "Delivery footprint is occupied or reserved."
              : "No usable delivery floor.";
      }
      if (queued) break;
    }
    if (!queued) reasons[area.id] = lastReason;
  }
  return { ...state, storage: { ...state.storage, blockedReasons: reasons } };
}

export function storageStatus(state: GameState, area: StorageArea): string {
  if (!area.enabled) return "Paused";
  const orders = state.objectOrders.filter(
    (order) =>
      !["completed", "cancelled"].includes(order.phase) &&
      storageContains(area, order.destination),
  );
  if (orders.length)
    return orders
      .map((order) => {
        const job = state.jobs.find((job) => job.id === order.jobId);
        const worker = state.personnel.find(
          (person) => person.id === job?.assignedPersonId,
        );
        return `${order.phase}: ${order.blockedReason ?? (worker ? worker.name : (job?.assignmentReason ?? "Awaiting hauler"))}`;
      })
      .join("; ");
  return (
    state.storage.blockedReasons[area.id] ??
    (storageQuantity(state, area) >= area.target
      ? "Target met"
      : "Awaiting stocking review")
  );
}
