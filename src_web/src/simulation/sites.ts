import { createCombatState } from "./combat";
import { createEnvironment, isActiveSurfaceOrder } from "./environment";
import { activeVesselOrder } from "./vessel-work";
import { surfacesForTile } from "./materials";
import type { SiteSimulationState, SiteState, SimulationClock } from "./state";
import { advanceSiteSimulation } from "./tick";
import { siteActions } from "./site-actions";
import { tileAt, type TileKind } from "./world";
import {
  advanceSiteTransfers,
  type SiteTransfer,
  type TransferHistory,
} from "./site-transfers";

export interface SimulationState extends SimulationClock {
  readonly seed: number;
  readonly nextSiteId: number;
  readonly sites: Readonly<Record<string, SiteState>>;
  readonly nextTransferId: number;
  readonly transfers: Readonly<Record<string, SiteTransfer>>;
  readonly transferHistory: readonly TransferHistory[];
}

export interface SiteSetup {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

export interface SiteResult {
  readonly state: SimulationState;
  readonly reason: string | null;
}

export function createSimulation(seed = 9620): SimulationState {
  return {
    seed,
    tick: 0,
    gameMinute: 480,
    nextSiteId: 1,
    sites: {},
    nextTransferId: 1,
    transfers: {},
    transferHistory: [],
  };
}

export function createSite(
  state: SimulationState,
  setup: SiteSetup,
): SiteResult & { readonly siteId: string | null } {
  if (
    !setup.name.trim() ||
    setup.name.length > 100 ||
    !Number.isInteger(setup.width) ||
    !Number.isInteger(setup.height) ||
    setup.width < 4 ||
    setup.height < 4 ||
    setup.width > 128 ||
    setup.height > 128
  )
    return {
      state,
      reason: "Provide a name and dimensions from 4 to 128 tiles.",
      siteId: null,
    };
  const siteId = `site-${state.nextSiteId}`;
  if (state.sites[siteId])
    return { state, reason: "Site identity is already in use.", siteId: null };
  const tiles: TileKind[] = Array.from(
    { length: setup.width * setup.height },
    () => "floor",
  );
  const site: SiteState = {
    siteName: setup.name.trim(),
    world: {
      map: {
        id: siteId,
        width: setup.width,
        height: setup.height,
        tiles,
        surfaces: Object.fromEntries(
          tiles.map((tile, index) => [index, surfacesForTile(tile)]),
        ),
        rooms: [],
        objectBlocks: [],
        doorPolicies: {},
      },
      positions: {},
    },
    personnel: [],
    entities: [],
    combat: createCombatState(),
    jobs: [],
    actionQueues: {},
    actionTimings: {},
    clinicalCare: {
      reviewInterval: 0,
      moodReviewInterval: 0,
      psychiatricReviewInterval: 0,
      clinicianIds: [],
    },
    routines: {
      pantryMeals: 0,
      reserveMeals: 0,
      mealsConsumed: 0,
      stations: [],
      schedules: {},
      activities: {},
      blockedReasons: {},
    },
    observations: {
      knownTiles: tiles.map(() => null),
      tileLastSeen: tiles.map(() => -1),
      knownSurfaces: {},
      objects: {},
      visibleTiles: [],
      visibleEntityIds: [],
      entities: {},
      knownRooms: [],
      entityStates: {},
      cameraKits: 0,
      cameras: [],
    },
    environment: createEnvironment(),
    objects: { idPrefix: `${siteId}:`, nextId: 1, items: [] },
    objectOrders: [],
    vesselWork: { nextId: 1, orders: [] },
    storage: { nextId: 1, areas: [], blockedReasons: {} },
    incident: { level: "green", summary: "Routine operations" },
  };
  return {
    state: {
      ...state,
      nextSiteId: state.nextSiteId + 1,
      sites: { ...state.sites, [siteId]: site },
    },
    reason: null,
    siteId,
  };
}

export function siteContext(
  state: SimulationState,
  siteId: string,
): SiteSimulationState | null {
  const site = state.sites[siteId];
  return site
    ? {
        ...site,
        tick: state.tick,
        gameMinute: state.gameMinute,
        seed: state.seed,
      }
    : null;
}

function localState(context: SiteSimulationState): SiteState {
  const { tick, gameMinute, seed, ...site } = context;
  return site;
}

export function updateSite(
  state: SimulationState,
  siteId: string,
  command: (site: SiteSimulationState) => SiteSimulationState,
): SiteResult {
  const context = siteContext(state, siteId);
  if (!context) return { state, reason: "This site no longer exists." };
  const next = command(context);
  if (
    next.world.map.id !== siteId ||
    next.tick !== state.tick ||
    next.gameMinute !== state.gameMinute ||
    next.seed !== state.seed
  )
    return {
      state,
      reason: "Local commands cannot change site identity or the global clock.",
    };
  const updated = {
    ...state,
    sites: { ...state.sites, [siteId]: localState(next) },
  };
  const reason = siteOwnershipIssue(updated);
  return reason ? { state, reason } : { state: updated, reason: null };
}

export function siteOwnershipIssue(state: SimulationState): string | null {
  if (
    !Number.isSafeInteger(state.nextSiteId) ||
    state.nextSiteId < 1 ||
    !Number.isSafeInteger(state.nextTransferId) ||
    state.nextTransferId < 1 ||
    !Number.isSafeInteger(state.tick) ||
    state.tick < 0 ||
    !Number.isSafeInteger(state.gameMinute) ||
    state.gameMinute < 0
  )
    return "Invalid global clock or identity allocator.";
  const historyIds = new Set(state.transferHistory.map((entry) => entry.id));
  if (historyIds.size !== state.transferHistory.length)
    return "Transfer completion identities must be unique.";
  for (const id of [...Object.keys(state.transfers), ...historyIds]) {
    const match = /^transfer-([1-9]\d*)$/.exec(id);
    if (!match || Number(match[1]) >= state.nextTransferId)
      return "Transfer identity allocator would reuse an existing identity.";
    if (state.transfers[id] && historyIds.has(id))
      return "A completed transfer cannot still own a payload.";
  }
  for (const siteId of Object.keys(state.sites)) {
    const match = /^site-([1-9]\d*)$/.exec(siteId);
    if (match && Number(match[1]) >= state.nextSiteId)
      return "Site identity allocator would reuse an existing identity.";
  }
  const owners = new Map<string, string>();
  for (const [siteId, site] of Object.entries(state.sites)) {
    if (site.world.map.id !== siteId)
      return "Site key and map identity disagree.";
    const people = new Set(site.personnel.map((person) => person.id));
    const actors = new Set([
      ...people,
      ...site.entities.map((entity) => entity.id),
    ]);
    const objects = new Map(site.objects.items.map((item) => [item.id, item]));
    const identities = [
      ...site.personnel.map((person) => person.id),
      ...site.objects.items.map((item) => item.id),
      ...site.entities.map((entity) => entity.id),
      ...(site.combat.adversary ? [site.combat.adversary.id] : []),
    ];
    for (const id of identities) {
      if (owners.has(id)) return `Entity ${id} has more than one owner.`;
      owners.set(id, siteId);
    }
    if (
      Object.keys(site.world.positions).some((id) => !actors.has(id)) ||
      [...actors].some((id) => !site.world.positions[id])
    )
      return "A site's actor positions must match its owned actors.";
    if (
      Object.values(site.world.positions).some(
        (position) =>
          !Number.isInteger(position.x) ||
          !Number.isInteger(position.y) ||
          tileAt(site.world.map, position) === null,
      )
    )
      return "Actor positions must be within their owner's map.";
    for (const item of site.objects.items) {
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 0 ||
        (item.location.kind !== "consumed" && item.quantity === 0)
      )
        return "Physical object quantities must be valid.";
      if (
        item.location.kind === "ground" &&
        (!Number.isInteger(item.location.position.x) ||
          !Number.isInteger(item.location.position.y) ||
          tileAt(site.world.map, item.location.position) === null)
      )
        return "Ground objects must be within their owner's map.";
      if (
        item.location.kind === "carried" &&
        !people.has(item.location.personId)
      )
        return "A carried object's owner is not at this site.";
      if (item.location.kind === "contained") {
        const vessel = objects.get(item.location.vesselId);
        if (
          !vessel ||
          vessel.id === item.id ||
          vessel.kind !== "vessel" ||
          vessel.location.kind === "contained"
        )
          return "A contained object needs a local, non-nested vessel.";
      }
    }
    if (
      site.environment.sources.some(
        (source) => source.objectId && !objects.has(source.objectId),
      )
    )
      return "An attached source needs a locally owned object.";
    if (
      Object.keys(site.combat.responders).some((id) => !people.has(id)) ||
      Object.keys(site.routines.activities).some((id) => !people.has(id))
    )
      return "Local execution refers to a person owned elsewhere.";
    if (
      site.jobs.some(
        (job) =>
          job.status !== "completed" &&
          ((job.assignedPersonId && !people.has(job.assignedPersonId)) ||
            (job.requiredWorkerId && !people.has(job.requiredWorkerId))),
      )
    )
      return "Local work refers to a person owned elsewhere.";
    if (
      Object.values(site.actionQueues).some(
        (queue) =>
          queue.current.intent.mapId !== siteId ||
          !people.has(queue.current.intent.actorId) ||
          queue.pending.some(
            (intent) => intent.mapId !== siteId || !people.has(intent.actorId),
          ),
      )
    )
      return "Queued actions must belong to this site and its people.";
  }
  for (const [transferId, transfer] of Object.entries(state.transfers)) {
    if (
      !Number.isSafeInteger(transfer.departedAt) ||
      transfer.departedAt < 0 ||
      transfer.departedAt > state.tick ||
      !Number.isSafeInteger(transfer.arrivesAt) ||
      transfer.arrivesAt < transfer.departedAt ||
      !Number.isInteger(transfer.duration) ||
      transfer.duration < 1 ||
      transfer.duration > 1440
    )
      return "Transfer deadlines must be valid global simulation times.";
    const people = new Set<string>();
    for (const person of transfer.personnel) {
      if (owners.has(person.id))
        return `Entity ${person.id} has more than one owner.`;
      owners.set(person.id, transferId);
      people.add(person.id);
      if (person.currentJobId)
        return "Travelling personnel cannot own local work.";
    }
    if (
      Object.keys(transfer.responders).some(
        (personId) => !people.has(personId),
      ) ||
      Object.keys(transfer.schedules).some((personId) => !people.has(personId))
    )
      return "Transit personal state requires an owned person.";
    if (
      transfer.id !== transferId ||
      !state.sites[transfer.originId] ||
      !state.sites[transfer.destinationId]
    )
      return "Transfer endpoints must exist.";
    const objects = new Map(
      transfer.objects.items.map((item) => [item.id, item]),
    );
    for (const item of transfer.objects.items) {
      if (owners.has(item.id))
        return `Entity ${item.id} has more than one owner.`;
      owners.set(item.id, transferId);
      if (item.location.kind === "transit") {
        if (item.location.orderId !== transferId)
          return "Transit payload belongs to another transfer.";
      } else if (item.location.kind === "contained") {
        const vessel = objects.get(item.location.vesselId);
        if (
          !vessel ||
          vessel.kind !== "vessel" ||
          vessel.location.kind !== "transit"
        )
          return "Contained transit cargo needs its vessel.";
      } else return "Transit payload cannot have a site location.";
      if (
        item.reservedBy ||
        item.installed ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      )
        return "Invalid transit cargo state.";
    }
    if (
      transfer.environment.sources.some(
        (source) => !source.objectId || !objects.has(source.objectId),
      )
    )
      return "Transit sources require a payload host.";
  }
  return null;
}

export function advanceSites(state: SimulationState): SimulationState {
  const beforeIssue = siteOwnershipIssue(state);
  if (beforeIssue) throw new Error(beforeIssue);
  const clock = { tick: state.tick + 1, gameMinute: state.gameMinute + 1 };
  const sites: Record<string, SiteState> = {};
  for (const siteId of Object.keys(state.sites).sort()) {
    const context = siteActions.advanceActionQueues(
      siteContext(state, siteId)!,
    );
    sites[siteId] = localState(
      siteActions.advanceActionQueues(
        advanceSiteSimulation(context, clock, "explicit"),
      ),
    );
  }
  const next = advanceSiteTransfers({ ...state, ...clock, sites });
  const afterIssue = siteOwnershipIssue(next);
  if (afterIssue) throw new Error(afterIssue);
  return next;
}

export function siteDisposalReason(
  state: SimulationState,
  siteId: string,
): string | null {
  const site = state.sites[siteId];
  if (!site) return "This site no longer exists.";
  if (
    Object.values(state.transfers).some(
      (transfer) =>
        transfer.originId === siteId || transfer.destinationId === siteId,
    )
  )
    return "Wait for active transfers before disposing this site.";
  if (
    site.personnel.length ||
    site.entities.length ||
    site.combat.adversary ||
    Object.keys(site.world.positions).length
  )
    return "Move all people and resident entities out before disposing this site.";
  if (
    site.objects.items.some((item) => item.location.kind !== "consumed") ||
    site.observations.cameras.length ||
    site.observations.cameraKits
  )
    return "Remove physical objects and camera equipment before disposing this site.";
  if (
    site.jobs.some((job) => job.status !== "completed") ||
    Object.keys(site.actionQueues).length ||
    Object.keys(site.routines.activities).length ||
    site.objectOrders.some(
      (order) => !["completed", "cancelled"].includes(order.phase),
    ) ||
    site.vesselWork.orders.some(activeVesselOrder) ||
    site.environment.orders.some(isActiveSurfaceOrder)
  )
    return "Resolve and clear local work before disposing this site.";
  if (site.environment.sources.some((source) => source.enabled !== false))
    return "Resolve active hazards before disposing this site.";
  return null;
}

export function disposeSite(
  state: SimulationState,
  siteId: string,
): SiteResult {
  const reason = siteDisposalReason(state, siteId);
  if (reason) return { state, reason };
  const sites = { ...state.sites };
  delete sites[siteId];
  return { state: { ...state, sites }, reason: null };
}
