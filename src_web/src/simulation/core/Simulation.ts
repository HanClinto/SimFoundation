import type { Site } from "./site/Site";
import type { Transfer } from "./site/Transfer";
import type { Materials } from "./material/Material";
import { tickPawn } from "./entity/pawn/Pawn";
import { tickDoor } from "./entity/Door";
import { advanceTransfers } from "./site/Transfer";
import type { ActionState } from "./entity/pawn/actions/Action";
import { beginOperatingCycle } from "./site/OperatingCycle";
import { publishServiceWarning } from "./entity/Service";

export const SIMULATION_VERSION = 40;

export interface Simulation {
  version: typeof SIMULATION_VERSION;
  tick: number;
  nextActionId: number;
  nextSiteId: number;
  nextTransferId: number;
  sites: Record<string, Site>;
  transfers: Record<string, Transfer>;
}

export interface TickEvent {
  tick?: number;
  siteId: string;
  entityId: string;
  kind:
    | "died"
    | "escaped"
    | "warning"
    | "breached"
    | "completed"
    | "blocked"
    | "failed"
    | "interrupted"
    | "opened"
    | "closed"
    | "attacked"
    | "treated"
    | "fled";
  targetId?: string;
  actionKind?: ActionState["kind"];
  actionId?: string;
  reason?: string;
}

export function createSimulation(): Simulation {
  return {
    version: SIMULATION_VERSION,
    tick: 0,
    nextActionId: 1,
    nextSiteId: 1,
    nextTransferId: 1,
    sites: {},
    transfers: {},
  };
}

export function advanceSimulation(
  state: Simulation,
  materials: Materials,
): { state: Simulation; events: TickEvent[] } {
  const next = structuredClone(state);
  next.tick++;
  const events: TickEvent[] = [];
  const turns = Object.keys(next.sites)
    .sort()
    .map((siteId) => ({
      siteId,
      entityIds: Object.keys(next.sites[siteId]!.entities).sort(),
    }));
  for (const { siteId, entityIds } of turns) {
    const site = next.sites[siteId];
    if (!site) continue;
    beginOperatingCycle(site, next.tick);
    for (const id of entityIds) {
      const entity = site.entities[id];
      if (entity?.kind === "pawn")
        tickPawn({ site, pawn: entity, tick: next.tick, materials, events });
      else if (entity?.kind === "door") tickDoor(site, entity, events);
      else if (entity?.kind === "facility")
        publishServiceWarning(site, entity, next.tick, events);
    }
  }
  const stateWithArrivals = advanceTransfers(next, events);
  return {
    state: stateWithArrivals,
    events: events.map((event) => ({ ...event, tick: next.tick })),
  };
}
