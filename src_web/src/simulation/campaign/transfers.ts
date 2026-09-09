import type { Entity, Position, Simulation, Transfer } from "../model";
import { advanceNeeds } from "../entities/needs";
import { doorAt, floorAt, samePosition } from "../world/spatial";

export interface TransferRequest {
  readonly originId: string;
  readonly destinationId: string;
  readonly entityIds: readonly string[];
  readonly loading: Position;
  readonly arrival: Position;
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
  if (!selected.size || selected.size !== request.entityIds.length)
    return fail("Choose distinct entities.");
  for (const id of selected) {
    const entity = origin.entities[id];
    if (
      !entity ||
      entity.kind === "door" ||
      entity.location.kind !== "ground" ||
      !samePosition(entity.location.position, request.loading)
    )
      return fail("Selected entities must be prepared at the loading tile.");
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
    if (entity.kind === "pawn" && entity.queue.length)
      return fail("Finish or cancel travelling pawns' queued actions first.");
  }
  const transferId = `transfer-${state.nextTransferId}`;
  const transfer: Transfer = {
    id: transferId,
    originId: origin.id,
    destinationId: destination.id,
    arrival: { ...request.arrival },
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

export function advanceTransfers(state: Simulation): Simulation {
  let result = state;
  for (const id of Object.keys(state.transfers).sort()) {
    const original = state.transfers[id]!;
    const entities: Record<string, Entity> = Object.fromEntries(
      Object.entries(original.entities).map(([key, entity]) => [
        key,
        entity.kind === "pawn"
          ? { ...entity, needs: advanceNeeds(entity.needs) }
          : entity,
      ]),
    );
    const transfer = { ...original, entities };
    const destination = result.sites[transfer.destinationId];
    const door = destination ? doorAt(destination, transfer.arrival) : null;
    const reason =
      !destination ||
      !floorAt(destination, transfer.arrival) ||
      (door && !door.open)
        ? "Arrival tile is unavailable."
        : Object.values(destination.entities).some(
              (entity) =>
                entity.kind === "pawn" &&
                entity.location.kind === "ground" &&
                samePosition(entity.location.position, transfer.arrival),
            )
          ? "Arrival tile is occupied."
          : Object.keys(entities).some(
                (entityId) => destination.entities[entityId],
              )
            ? "Arrival would duplicate an entity identity."
            : null;
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
              : { kind: "ground" as const, position: { ...transfer.arrival } },
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
