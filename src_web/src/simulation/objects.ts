import type { TilePosition } from "./world";
import type { RoutineStation } from "./routines";
import type { MaterialId } from "./materials";

export const OBJECT_DEFINITIONS = {
  vessel: {
    name: "Containment vessel",
    width: 1,
    height: 1,
    activity: null,
    stackable: false,
  },
  bed: {
    name: "Bed",
    width: 1,
    height: 2,
    activity: "sleep",
    stackable: false,
  },
  "meal-seat": {
    name: "Meal table and seat",
    width: 1,
    height: 1,
    activity: "meal",
    stackable: false,
  },
  "break-seat": {
    name: "Break seat",
    width: 1,
    height: 1,
    activity: "break",
    stackable: false,
  },
  materials: {
    name: "Building materials",
    width: 1,
    height: 1,
    activity: null,
    stackable: true,
  },
  meals: {
    name: "Packaged meals",
    width: 1,
    height: 1,
    activity: null,
    stackable: true,
  },
} as const;
export type ObjectKind = keyof typeof OBJECT_DEFINITIONS;
export type ObjectOrientation = "north" | "east" | "south" | "west";
export type ObjectLocation =
  | { readonly kind: "ground"; readonly position: TilePosition }
  | { readonly kind: "carried"; readonly personId: string }
  | { readonly kind: "contained"; readonly vesselId: string }
  | { readonly kind: "transit"; readonly orderId: string }
  | { readonly kind: "consumed" };
export interface PhysicalObject {
  readonly id: string;
  readonly kind: ObjectKind;
  readonly quantity: number;
  readonly condition: number;
  readonly orientation: ObjectOrientation;
  readonly installed: boolean;
  readonly location: ObjectLocation;
  readonly reservedBy: string | null;
  readonly vessel?: { readonly material: MaterialId; readonly sealed: boolean };
}
export interface ObjectStore {
  readonly nextId: number;
  readonly items: readonly PhysicalObject[];
}

export function createObjectStore(
  stations: readonly RoutineStation[],
): ObjectStore {
  const item = (
    id: string,
    kind: ObjectKind,
    position: TilePosition,
    quantity = 1,
    installed = false,
  ): PhysicalObject => ({
    id,
    kind,
    quantity,
    condition: 100,
    orientation: "north",
    installed,
    reservedBy: null,
    location: { kind: "ground", position },
  });
  return {
    nextId: 1,
    items: [
      ...stations.map((station) =>
        item(
          station.id,
          station.kind === "sleep"
            ? "bed"
            : station.kind === "meal"
              ? "meal-seat"
              : "break-seat",
          station.position,
          1,
          true,
        ),
      ),
      item("stock-materials", "materials", { x: 67, y: 68 }, 160),
      item("stock-meals", "meals", { x: 65, y: 68 }, 72),
      item("pantry-meals", "meals", { x: 58, y: 67 }, 36),
      item("spare-bed", "bed", { x: 65, y: 66 }),
      item("spare-meal-seat", "meal-seat", { x: 66, y: 66 }),
      item("spare-break-seat", "break-seat", { x: 67, y: 66 }),
    ],
  };
}

export function objectStations(store: ObjectStore): readonly RoutineStation[] {
  return store.items.flatMap((object) => {
    const kind = OBJECT_DEFINITIONS[object.kind].activity;
    return kind &&
      object.installed &&
      object.condition > 0 &&
      object.location.kind === "ground" &&
      !object.reservedBy
      ? [{ id: object.id, kind, position: object.location.position }]
      : [];
  });
}

export function objectBlocks(
  store: ObjectStore,
  width: number,
): readonly number[] {
  return store.items.flatMap((item) =>
    item.installed && item.location.kind === "ground"
      ? objectFootprint(item, item.location.position)
          .slice(1)
          .map((position) => position.y * width + position.x)
      : [],
  );
}

export function objectFootprint(
  object: Pick<PhysicalObject, "kind" | "orientation">,
  origin: TilePosition,
): readonly TilePosition[] {
  const definition = OBJECT_DEFINITIONS[object.kind];
  const horizontal =
    object.orientation === "east" || object.orientation === "west";
  const width = horizontal ? definition.height : definition.width;
  const height = horizontal ? definition.width : definition.height;
  return Array.from({ length: width * height }, (_, index) => ({
    x: origin.x + (index % width),
    y: origin.y + Math.floor(index / width),
  }));
}

export function objectPosition(
  object: PhysicalObject,
  positions: Readonly<Record<string, TilePosition>>,
  store?: ObjectStore,
): TilePosition | null {
  if (object.location.kind === "contained") {
    const vesselId = object.location.vesselId;
    const vessel = store?.items.find(
      (item) => item.id === vesselId && item.kind === "vessel",
    );
    return vessel?.location.kind === "ground"
      ? vessel.location.position
      : vessel?.location.kind === "carried"
        ? (positions[vessel.location.personId] ?? null)
        : null;
  }
  return object.location.kind === "ground"
    ? object.location.position
    : object.location.kind === "carried"
      ? (positions[object.location.personId] ?? null)
      : null;
}

export function reserveStack(
  store: ObjectStore,
  objectId: string,
  quantity: number,
  owner: string,
): { store: ObjectStore; objectId: string | null } {
  const object = store.items.find((item) => item.id === objectId);
  if (
    !object ||
    object.location.kind !== "ground" ||
    object.reservedBy ||
    !Number.isSafeInteger(quantity) ||
    quantity <= 0 ||
    quantity > object.quantity ||
    (!OBJECT_DEFINITIONS[object.kind].stackable && quantity !== 1)
  )
    return { store, objectId: null };
  if (quantity === object.quantity)
    return {
      store: {
        ...store,
        items: store.items.map((item) =>
          item === object ? { ...item, reservedBy: owner } : item,
        ),
      },
      objectId,
    };
  const id = `object-${store.nextId}`;
  return {
    objectId: id,
    store: {
      nextId: store.nextId + 1,
      items: [
        ...store.items.map((item) =>
          item === object
            ? { ...item, quantity: item.quantity - quantity }
            : item,
        ),
        { ...object, id, quantity, reservedBy: owner },
      ],
    },
  };
}

export function pickUpObject(
  store: ObjectStore,
  objectId: string,
  owner: string,
  personId: string,
  position: TilePosition,
): ObjectStore {
  const object = store.items.find((item) => item.id === objectId);
  if (
    !object ||
    object.reservedBy !== owner ||
    object.location.kind !== "ground" ||
    Math.abs(position.x - object.location.position.x) +
      Math.abs(position.y - object.location.position.y) >
      1 ||
    store.items.some(
      (item) =>
        item.location.kind === "carried" && item.location.personId === personId,
    )
  )
    return store;
  return {
    ...store,
    items: store.items.map((item) =>
      item === object
        ? { ...item, installed: false, location: { kind: "carried", personId } }
        : item,
    ),
  };
}

export function putDownObject(
  store: ObjectStore,
  objectId: string,
  owner: string,
  personId: string,
  position: TilePosition,
  carrierPosition: TilePosition,
  installed = false,
  orientation?: ObjectOrientation,
): ObjectStore {
  const object = store.items.find((item) => item.id === objectId);
  if (
    !object ||
    object.reservedBy !== owner ||
    object.location.kind !== "carried" ||
    object.location.personId !== personId ||
    Math.abs(position.x - carrierPosition.x) +
      Math.abs(position.y - carrierPosition.y) >
      1
  )
    return store;
  return {
    ...store,
    items: store.items.map((item) =>
      item === object
        ? {
            ...item,
            installed,
            orientation: orientation ?? item.orientation,
            location: { kind: "ground", position },
          }
        : item,
    ),
  };
}

export function consumeObject(
  store: ObjectStore,
  objectId: string,
  owner: string,
  position: TilePosition,
): ObjectStore {
  const object = store.items.find((item) => item.id === objectId);
  if (
    !object ||
    object.reservedBy !== owner ||
    object.location.kind !== "ground" ||
    Math.abs(position.x - object.location.position.x) +
      Math.abs(position.y - object.location.position.y) >
      1
  )
    return store;
  return {
    ...store,
    items: store.items.map((item) =>
      item === object
        ? {
            ...item,
            quantity: 0,
            installed: false,
            reservedBy: null,
            location: { kind: "consumed" },
          }
        : item,
    ),
  };
}

export function releaseObject(
  store: ObjectStore,
  objectId: string,
  owner: string,
): ObjectStore {
  return {
    ...store,
    items: store.items.map((item) =>
      item.id === objectId &&
      item.reservedBy === owner &&
      item.location.kind === "ground"
        ? { ...item, reservedBy: null }
        : item,
    ),
  };
}

export function reservedObject(
  store: ObjectStore,
  owner: string,
): PhysicalObject | undefined {
  return store.items.find(
    (item) => item.reservedBy === owner && item.location.kind !== "consumed",
  );
}

export function reserveSupply(
  store: ObjectStore,
  kind: "materials" | "meals",
  quantity: number,
  position: TilePosition,
  owner: string,
  allowOtherLocations = false,
): { store: ObjectStore; objectId: string | null } {
  if (!Number.isSafeInteger(quantity) || quantity <= 0)
    return { store, objectId: null };
  const candidates = store.items.filter(
    (item) =>
      item.kind === kind &&
      !item.installed &&
      !item.reservedBy &&
      item.location.kind === "ground" &&
      item.location.position.x === position.x &&
      item.location.position.y === position.y,
  );
  const condition = candidates.find(
    (candidate) =>
      candidates
        .filter((item) => item.condition === candidate.condition)
        .reduce((sum, item) => sum + item.quantity, 0) >= quantity,
  )?.condition;
  const stacks = candidates.filter((item) => item.condition === condition);
  const total = stacks.reduce((sum, item) => sum + item.quantity, 0);
  if (total < quantity || !stacks[0]) {
    if (allowOtherLocations) {
      for (const item of store.items)
        if (
          item.kind === kind &&
          !item.reservedBy &&
          item.location.kind === "ground" &&
          (item.location.position.x !== position.x ||
            item.location.position.y !== position.y)
        ) {
          const result = reserveSupply(
            store,
            kind,
            quantity,
            item.location.position,
            owner,
          );
          if (result.objectId) return result;
        }
    }
    return { store, objectId: null };
  }
  const ids = new Set(stacks.map((item) => item.id));
  const consolidated: ObjectStore = {
    ...store,
    items: store.items.map((item) =>
      item.id === stacks[0]!.id
        ? { ...item, quantity: total }
        : ids.has(item.id)
          ? {
              ...item,
              quantity: 0,
              location: { kind: "consumed" },
              installed: false,
            }
          : item,
    ),
  };
  return reserveStack(consolidated, stacks[0].id, quantity, owner);
}

export function supplyAt(
  store: ObjectStore,
  kind: "materials" | "meals",
  position: TilePosition,
): number {
  return store.items
    .filter(
      (item) =>
        item.kind === kind &&
        !item.reservedBy &&
        item.location.kind === "ground" &&
        item.location.position.x === position.x &&
        item.location.position.y === position.y,
    )
    .reduce((sum, item) => sum + item.quantity, 0);
}

export function mergeGroundStack(
  store: ObjectStore,
  objectId: string,
): ObjectStore {
  const object = store.items.find((item) => item.id === objectId);
  if (
    !object ||
    object.location.kind !== "ground" ||
    object.installed ||
    object.reservedBy ||
    !OBJECT_DEFINITIONS[object.kind].stackable
  )
    return store;
  const position = object.location.position;
  const compatible = store.items.filter(
    (item) =>
      item.id !== objectId &&
      item.kind === object.kind &&
      item.condition === object.condition &&
      !item.installed &&
      !item.reservedBy &&
      item.location.kind === "ground" &&
      item.location.position.x === position.x &&
      item.location.position.y === position.y,
  );
  if (!compatible.length) return store;
  const ids = new Set(compatible.map((item) => item.id));
  return {
    ...store,
    items: store.items.map((item) =>
      item.id === objectId
        ? {
            ...item,
            quantity:
              item.quantity +
              compatible.reduce((sum, other) => sum + other.quantity, 0),
          }
        : ids.has(item.id)
          ? {
              ...item,
              quantity: 0,
              reservedBy: null,
              location: { kind: "consumed" },
            }
          : item,
    ),
  };
}

export function consumeSupply(
  store: ObjectStore,
  kind: "materials" | "meals",
  quantity: number,
  position: TilePosition,
): ObjectStore {
  const reserved = reserveSupply(
    store,
    kind,
    quantity,
    position,
    "consumption",
  );
  return reserved.objectId
    ? consumeObject(reserved.store, reserved.objectId, "consumption", position)
    : store;
}
