import type { Entity, Position } from "../entity/Entity";
import type { Simulation, TickEvent } from "../Simulation";
import { facilityInUse } from "../entity/Facility";
import { advancePhysiology } from "../entity/pawn/Health";
import type { Pawn } from "../entity/pawn/Pawn";
import { distance, floorAt, traversalAt, samePosition } from "./TileMap";
import type { Site } from "./Site";
import { restraintFor, tickCustody } from "../entity/pawn/Custody";
import { equipmentUnderRepair } from "../entity/Equipment";

export interface Transfer {
  id: string;
  originId: string;
  destinationId: string;
  arrival: Position;
  arrivalRadius?: number;
  arrivalMode?: "pad" | "area";
  arrivesAt: number;
  blockedReason: string | null;
  entities: Record<string, Entity>;
}

export interface TransferRequest {
  readonly originId: string;
  readonly destinationId: string;
  readonly entityIds: readonly string[];
  readonly loading: Position;
  readonly loadingRadius?: number;
  readonly arrival: Position;
  readonly arrivalRadius?: number;
  readonly arrivalMode?: "pad" | "area";
  readonly duration: number;
}

export function depart(
  state: Simulation,
  request: TransferRequest,
): { state: Simulation; reason: string | null; transferId?: string } {
  const fail = (reason: string) => ({ state, reason });
  const origin = state.sites[request.originId];
  const destination = state.sites[request.destinationId];
  if (!origin || !destination || origin === destination)
    return fail("Choose two distinct sites.");
  if (
    !Number.isSafeInteger(request.duration) ||
    request.duration < 1 ||
    !floorAt(origin, request.loading) ||
    !floorAt(destination, request.arrival)
  )
    return fail("Choose valid endpoints and a positive travel duration.");
  const selected = new Set(request.entityIds);
  if (
    request.arrivalRadius !== undefined &&
    (!Number.isSafeInteger(request.arrivalRadius) ||
      request.arrivalRadius < 0 ||
      request.arrivalRadius > 3)
  )
    return fail("Arrival radius must be an integer from zero to three.");
  if (
    request.arrivalMode === "area" &&
    !(request.arrivalRadius && request.arrivalRadius > 0)
  )
    return fail(
      "Area admission requires an explicit positive bounded arrival radius.",
    );
  const loadingRadius = request.loadingRadius ?? 0;
  if (!Number.isSafeInteger(loadingRadius) || loadingRadius < 0)
    return fail("Loading radius must be a nonnegative integer.");
  if (!selected.size || selected.size !== request.entityIds.length)
    return fail("Choose distinct entities.");
  for (const id of selected) {
    const entity = origin.entities[id];
    if (
      !entity ||
      entity.kind === "door" ||
      entity.location.kind !== "ground" ||
      distance(entity.location.position, request.loading) > loadingRadius
    )
      return fail("Selected entities must be prepared in the loading area.");
  }
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const entity of Object.values(origin.entities)) {
      if (
        entity.location.kind === "carried" &&
        selected.has(entity.location.carrierId) &&
        !selected.has(entity.id)
      ) {
        selected.add(entity.id);
        expanded = true;
      }
    }
  }
  for (const id of selected) {
    const entity = origin.entities[id]!;
    if (entity.kind === "facility" && entity.processor?.current)
      return fail(
        "An active processing apparatus must finish before transfer.",
      );
    if (equipmentUnderRepair(origin, id))
      return fail("Finish or cancel funded equipment repair before transfer.");
    if (
      entity.kind === "pawn" &&
      entity.requiresRestraint &&
      !entity.health?.death &&
      !restraintFor(origin.entities, id)
    )
      return fail(
        "Living hostile recovery requires an effective physical restraint, even during subdual.",
      );
    if (entity.kind === "facility" && facilityInUse(origin, id))
      return fail("Finish or cancel use of the travelling facility first.");
    if (entity.kind === "pawn" && entity.queue.length)
      return fail("Finish or cancel travelling pawns' queued actions first.");
  }
  const transferId = `transfer-${state.nextTransferId}`;
  const transfer: Transfer = {
    id: transferId,
    originId: origin.id,
    destinationId: destination.id,
    arrival: { ...request.arrival },
    ...(request.arrivalRadius !== undefined
      ? { arrivalRadius: request.arrivalRadius }
      : {}),
    ...(request.arrivalMode ? { arrivalMode: request.arrivalMode } : {}),
    arrivesAt: state.tick + request.duration,
    blockedReason: null,
    entities: Object.fromEntries(
      Object.entries(origin.entities).filter(([id]) => selected.has(id)),
    ),
  };
  return {
    reason: null,
    transferId,
    state: {
      ...state,
      nextTransferId: state.nextTransferId + 1,
      sites: {
        ...state.sites,
        [origin.id]: {
          ...origin,
          entities: Object.fromEntries(
            Object.entries(origin.entities).filter(([id]) => !selected.has(id)),
          ),
        },
      },
      transfers: { ...state.transfers, [transferId]: transfer },
    },
  };
}

function advanceTransitPawn(
  pawn: Pawn,
  tick: number,
  originId: string,
  events: TickEvent[],
): Pawn {
  const next = structuredClone(pawn);
  const notice = advancePhysiology(next, tick);
  if (notice) events.push({ siteId: originId, entityId: next.id, ...notice });
  return next;
}

function landingPositions(
  site: Site,
  transfer: Transfer,
): Record<string, Position> | null {
  if (transfer.arrivalRadius === undefined) return {};
  const radius = transfer.arrivalRadius;
  const candidates: Position[] = [];
  for (
    let y = transfer.arrival.y - radius;
    y <= transfer.arrival.y + radius;
    y++
  )
    for (
      let x = transfer.arrival.x - radius;
      x <= transfer.arrival.x + radius;
      x++
    ) {
      const position = { x, y };
      if (
        distance(position, transfer.arrival) <= radius &&
        traversalAt(site, position).kind === "clear"
      )
        candidates.push(position);
    }
  candidates.sort(
    (a, b) =>
      distance(a, transfer.arrival) - distance(b, transfer.arrival) ||
      a.y - b.y ||
      a.x - b.x,
  );
  const assigned: Record<string, Position> = {};
  const used: Position[] = [];
  for (const entity of Object.values(transfer.entities).sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  )) {
    if (entity.location.kind !== "ground") continue;
    if (!entity.blocksMovement || (entity.integrity ?? 100) <= 0) {
      assigned[entity.id] = transfer.arrival;
      continue;
    }
    const position = candidates.find(
      (candidate) =>
        !used.some((existing) => samePosition(existing, candidate)),
    );
    if (!position) return null;
    assigned[entity.id] = position;
    used.push(position);
  }
  return assigned;
}

export function advanceTransfers(
  state: Simulation,
  events: TickEvent[] = [],
): Simulation {
  let result = state;
  for (const id of Object.keys(state.transfers).sort()) {
    const original = state.transfers[id]!;
    const entities: Record<string, Entity> = Object.fromEntries(
      Object.entries(original.entities)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entity]) => [
          key,
          entity.kind === "pawn"
            ? advanceTransitPawn(entity, state.tick, original.originId, events)
            : structuredClone(entity),
        ]),
    );
    const transfer = { ...original, entities };
    for (const entity of Object.values(entities).sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    )) {
      if (entity.kind === "pawn")
        tickCustody(entities, entity, original.originId, events, state.tick);
    }
    const destination = result.sites[transfer.destinationId];
    const traversal = destination
      ? traversalAt(destination, transfer.arrival)
      : null;
    const alternateFloorPad =
      destination &&
      transfer.arrivalMode === "area" &&
      floorAt(destination, transfer.arrival) &&
      !Object.values(destination.entities).some(
        (entity) =>
          entity.kind === "door" &&
          !entity.open &&
          (entity.integrity ?? 100) > 0 &&
          entity.location.kind === "ground" &&
          samePosition(entity.location.position, transfer.arrival),
      );
    let reason =
      !destination || !traversal || traversal.kind === "open-door"
        ? "Arrival tile is unavailable."
        : traversal.kind === "blocked" && !alternateFloorPad
          ? traversal.reason
          : Object.keys(entities).some(
                (entityId) => destination.entities[entityId],
              )
            ? "Arrival would duplicate an entity identity."
            : null;
    const landing =
      !reason && destination ? landingPositions(destination, transfer) : null;
    if (!reason && !landing)
      reason =
        "The complete travelling group needs more free space in the arrival area.";
    if (state.tick < transfer.arrivesAt || reason) {
      result = {
        ...result,
        transfers: {
          ...result.transfers,
          [id]: {
            ...transfer,
            blockedReason: state.tick >= transfer.arrivesAt ? reason : null,
          },
        },
      };
      continue;
    }
    const arrived = Object.fromEntries(
      Object.entries(entities).map(([key, entity]) => [
        key,
        {
          ...entity,
          location:
            entity.location.kind === "carried"
              ? entity.location
              : {
                  kind: "ground" as const,
                  position: { ...(landing![key] ?? transfer.arrival) },
                },
        },
      ]),
    );
    const transfers = { ...result.transfers };
    delete transfers[id];
    result = {
      ...result,
      transfers,
      sites: {
        ...result.sites,
        [destination!.id]: {
          ...destination!,
          entities: { ...destination!.entities, ...arrived },
        },
      },
    };
  }
  return result;
}
