import type { SimulationState, SiteResult } from "./sites";
import { siteOwnershipIssue } from "./sites";
import type { PhysicalObject, ObjectStore } from "./objects";
import { reserveStack } from "./objects";
import type { EnvironmentState } from "./environment";
import { advanceVesselWear } from "./vessels";
import { isWalkable, sameTile, type TilePosition } from "./world";
import { advancePersonnel, type PersonnelRecord } from "./personnel";
import type { ResponderState } from "./combat";
import type { ScheduleBlock } from "./routines";

export interface FreightRequest {
  readonly originId: string;
  readonly destinationId: string;
  readonly loading: TilePosition;
  readonly arrival: TilePosition;
  readonly duration: number;
  readonly cargo: readonly {
    readonly objectId: string;
    readonly quantity: number;
  }[];
  readonly personnelIds?: readonly string[];
}

export interface SiteTransfer {
  readonly id: string;
  readonly originId: string;
  readonly destinationId: string;
  readonly loading: TilePosition;
  readonly arrival: TilePosition;
  readonly duration: number;
  readonly departedAt: number;
  readonly arrivesAt: number;
  readonly returning: boolean;
  readonly blockedReason: string | null;
  readonly objects: ObjectStore;
  readonly environment: EnvironmentState;
  readonly personnel: readonly PersonnelRecord[];
  readonly responders: Readonly<Record<string, ResponderState>>;
  readonly schedules: Readonly<Record<string, readonly ScheduleBlock[]>>;
}

export interface TransferHistory {
  readonly id: string;
  readonly originId: string;
  readonly destinationId: string;
  readonly originName: string;
  readonly destinationName: string;
  readonly arrivedAt: number;
  readonly cargo: readonly string[];
  readonly returned: boolean;
  readonly personnelIds: readonly string[];
}

export function dispatchFreight(
  state: SimulationState,
  request: FreightRequest,
): SiteResult {
  const origin = state.sites[request.originId];
  const destination = state.sites[request.destinationId];
  const fail = (reason: string): SiteResult => ({ state, reason });
  const ownershipIssue = siteOwnershipIssue(state);
  if (ownershipIssue) return fail(ownershipIssue);
  if (!origin || !destination || request.originId === request.destinationId)
    return fail("Choose two distinct existing sites.");
  if (
    !Number.isInteger(request.duration) ||
    request.duration < 1 ||
    request.duration > 1440
  )
    return fail("Travel duration must be from 1 to 1440 minutes.");
  const validPosition = (position: TilePosition) =>
    Number.isInteger(position.x) && Number.isInteger(position.y);
  if (
    !validPosition(request.loading) ||
    !validPosition(request.arrival) ||
    !isWalkable(origin.world.map, request.loading) ||
    !isWalkable(destination.world.map, request.arrival)
  )
    return fail("Choose reachable loading and arrival tiles.");
  const personnelIds = new Set(request.personnelIds ?? []);
  if (
    (!request.cargo.length && !personnelIds.size) ||
    request.cargo.length > 32 ||
    new Set(request.cargo.map((entry) => entry.objectId)).size !==
      request.cargo.length ||
    personnelIds.size !== (request.personnelIds?.length ?? 0)
  )
    return fail("Select distinct prepared cargo or personnel.");
  for (const personId of personnelIds) {
    const person = origin.personnel.find((entry) => entry.id === personId);
    const responder = origin.combat.responders[personId];
    if (
      !person ||
      !origin.world.positions[personId] ||
      !sameTile(origin.world.positions[personId]!, request.loading)
    )
      return fail("All travelling personnel must reach the loading tile.");
    if (
      person.currentJobId ||
      origin.routines.activities[personId] ||
      origin.actionQueues[personId] ||
      origin.jobs.some(
        (job) =>
          job.status !== "completed" &&
          (job.assignedPersonId === personId ||
            job.requiredWorkerId === personId ||
            job.assessment?.patientId === personId),
      ) ||
      origin.objects.items.some(
        (item) =>
          item.location.kind === "carried" &&
          item.location.personId === personId,
      )
    )
      return fail(
        "Resolve personal work, queues and carried cargo before departure.",
      );
    if (
      (responder &&
        (responder.injuries > 0 ||
          responder.incapacitated ||
          responder.phase !== "ready" ||
          responder.order !== "hold")) ||
      (origin.combat.status === "active" &&
        origin.combat.participants.includes(personId))
    )
      return fail(
        "Only stable, ready personnel outside active encounters can travel.",
      );
  }
  const id = `transfer-${state.nextTransferId}`;
  let store = origin.objects;
  const selected = new Set<string>();
  for (const entry of request.cargo) {
    const item = store.items.find(
      (candidate) => candidate.id === entry.objectId,
    );
    if (
      !item ||
      item.installed ||
      item.reservedBy ||
      item.location.kind !== "ground" ||
      !sameTile(item.location.position, request.loading)
    )
      return fail(
        "Pack and haul all unreserved cargo to the loading tile before dispatch.",
      );
    if (
      item.vessel &&
      !item.vessel.sealed &&
      store.items.some(
        (content) =>
          content.location.kind === "contained" &&
          content.location.vesselId === item.id,
      )
    )
      return fail("Seal loaded vessels before dispatch.");
    const split = reserveStack(store, item.id, entry.quantity, id);
    if (!split.objectId)
      return fail("The selected cargo quantity is unavailable.");
    if (
      split.objectId !== item.id &&
      origin.environment.sources.some((source) => source.objectId === item.id)
    )
      return fail("Cannot split an object with attached behavior.");
    store = split.store;
    selected.add(split.objectId);
    for (const content of store.items.filter(
      (candidate) =>
        candidate.location.kind === "contained" &&
        candidate.location.vesselId === item.id,
    )) {
      if (content.installed || content.reservedBy || content.kind === "vessel")
        return fail("Vessel contents are reserved or unsupported.");
      selected.add(content.id);
    }
  }
  const objects: PhysicalObject[] = store.items
    .filter((item) => selected.has(item.id))
    .map((item) => ({
      ...item,
      reservedBy: null,
      location:
        item.location.kind === "contained"
          ? item.location
          : { kind: "transit", orderId: id },
    }));
  const sources = origin.environment.sources.filter(
    (source) => source.objectId && selected.has(source.objectId),
  );
  if (
    destination.environment.sources.length + sources.length > 32 ||
    sources.some((source) =>
      destination.environment.sources.some(
        (existing) => existing.id === source.id,
      ),
    )
  )
    return fail(
      "Destination cannot accept the attached source identities or capacity.",
    );
  const transfer: SiteTransfer = {
    id,
    originId: request.originId,
    destinationId: request.destinationId,
    loading: { ...request.loading },
    arrival: { ...request.arrival },
    duration: request.duration,
    departedAt: state.tick,
    arrivesAt: state.tick + request.duration,
    returning: false,
    blockedReason: null,
    objects: { nextId: store.nextId, items: objects },
    environment: {
      ...origin.environment,
      sources,
      orders: [],
      automaticRepairs: false,
    },
    personnel: origin.personnel.filter((person) => personnelIds.has(person.id)),
    responders: Object.fromEntries(
      Object.entries(origin.combat.responders).filter(([personId]) =>
        personnelIds.has(personId),
      ),
    ),
    schedules: Object.fromEntries(
      Object.entries(origin.routines.schedules).filter(([personId]) =>
        personnelIds.has(personId),
      ),
    ),
  };
  const next: SimulationState = {
    ...state,
    nextTransferId: state.nextTransferId + 1,
    transfers: { ...state.transfers, [id]: transfer },
    sites: {
      ...state.sites,
      [request.originId]: {
        ...origin,
        personnel: origin.personnel.filter(
          (person) => !personnelIds.has(person.id),
        ),
        world: {
          ...origin.world,
          positions: Object.fromEntries(
            Object.entries(origin.world.positions).filter(
              ([personId]) => !personnelIds.has(personId),
            ),
          ),
        },
        combat: {
          ...origin.combat,
          responders: Object.fromEntries(
            Object.entries(origin.combat.responders).filter(
              ([personId]) => !personnelIds.has(personId),
            ),
          ),
          participants: origin.combat.participants.filter(
            (personId) => !personnelIds.has(personId),
          ),
        },
        routines: {
          ...origin.routines,
          schedules: Object.fromEntries(
            Object.entries(origin.routines.schedules).filter(
              ([personId]) => !personnelIds.has(personId),
            ),
          ),
          blockedReasons: Object.fromEntries(
            Object.entries(origin.routines.blockedReasons).filter(
              ([personId]) => !personnelIds.has(personId),
            ),
          ),
        },
        clinicalCare: {
          ...origin.clinicalCare,
          clinicianIds: origin.clinicalCare.clinicianIds.filter(
            (personId) => !personnelIds.has(personId),
          ),
        },
        actionTimings: Object.fromEntries(
          Object.entries(origin.actionTimings).filter(
            ([personId]) => !personnelIds.has(personId),
          ),
        ),
        observations: {
          ...origin.observations,
          visibleEntityIds: origin.observations.visibleEntityIds.filter(
            (personId) => !personnelIds.has(personId),
          ),
        },
        objects: {
          ...store,
          items: store.items.filter((item) => !selected.has(item.id)),
        },
        environment: {
          ...origin.environment,
          sources: origin.environment.sources.filter(
            (source) => !sources.includes(source),
          ),
        },
      },
    },
  };
  const issue = siteOwnershipIssue(next);
  return issue ? fail(issue) : { state: next, reason: null };
}

export function returnFreight(
  state: SimulationState,
  transferId: string,
): SiteResult {
  const transfer = state.transfers[transferId];
  if (!transfer) return { state, reason: "This transfer is no longer active." };
  if (transfer.returning)
    return { state, reason: "This transfer is already returning." };
  return {
    state: {
      ...state,
      transfers: {
        ...state.transfers,
        [transferId]: {
          ...transfer,
          returning: true,
          arrivesAt: state.tick + transfer.duration,
          blockedReason: null,
        },
      },
    },
    reason: null,
  };
}

export function advanceSiteTransfers(state: SimulationState): SimulationState {
  for (const transferId of Object.keys(state.transfers).sort()) {
    const worn = advanceVesselWear(state.transfers[transferId]!);
    const transfer = {
      ...worn,
      personnel: worn.personnel.map((person) =>
        advancePersonnel(person, state.tick),
      ),
    };
    const destinationId = transfer.returning
      ? transfer.originId
      : transfer.destinationId;
    const arrival = transfer.returning ? transfer.loading : transfer.arrival;
    const destination = state.sites[destinationId];
    const sources = transfer.environment.sources;
    const reason = !destination
      ? "Destination site is unavailable."
      : !isWalkable(destination.world.map, arrival)
        ? "Arrival tile is blocked."
        : destination.environment.sources.length + sources.length > 32 ||
            sources.some((source) =>
              destination.environment.sources.some(
                (existing) => existing.id === source.id,
              ),
            )
          ? "Destination source capacity or identity is blocked."
          : null;
    if (state.tick < transfer.arrivesAt || reason) {
      state = {
        ...state,
        transfers: {
          ...state.transfers,
          [transferId]: {
            ...transfer,
            blockedReason: state.tick >= transfer.arrivesAt ? reason : null,
          },
        },
      };
      continue;
    }
    const objects = transfer.objects.items.map((item) => ({
      ...item,
      location:
        item.location.kind === "contained"
          ? item.location
          : { kind: "ground" as const, position: { ...arrival } },
    }));
    const transfers = { ...state.transfers };
    delete transfers[transferId];
    state = {
      ...state,
      transfers,
      sites: {
        ...state.sites,
        [destinationId]: {
          ...destination!,
          objects: {
            ...destination!.objects,
            items: [...destination!.objects.items, ...objects],
          },
          personnel: [...destination!.personnel, ...transfer.personnel],
          world: {
            ...destination!.world,
            positions: {
              ...destination!.world.positions,
              ...Object.fromEntries(
                transfer.personnel.map((person) => [person.id, { ...arrival }]),
              ),
            },
          },
          combat: {
            ...destination!.combat,
            responders: {
              ...destination!.combat.responders,
              ...transfer.responders,
            },
          },
          routines: {
            ...destination!.routines,
            schedules: {
              ...destination!.routines.schedules,
              ...transfer.schedules,
            },
          },
          environment: {
            ...destination!.environment,
            sources: [...destination!.environment.sources, ...sources],
          },
        },
      },
      transferHistory: [
        ...state.transferHistory,
        {
          id: transfer.id,
          originId: transfer.originId,
          destinationId,
          originName: state.sites[transfer.originId]!.siteName,
          destinationName: destination!.siteName,
          arrivedAt: state.tick,
          cargo: objects.map((item) => item.id),
          personnelIds: transfer.personnel.map((person) => person.id),
          returned: transfer.returning,
        },
      ],
    };
  }
  return state;
}
