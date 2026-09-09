import type { Site } from "./site/Site";
import type { Transfer } from "./site/Transfer";
import type { Materials } from "./material/Material";
import { tickPawn } from "./entity/pawn/Pawn";
import { tickDoor } from "./entity/Door";
import { advanceTransfers } from "./site/Transfer";

export const SIMULATION_VERSION = 3;

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
  siteId: string;
  entityId: string;
  kind: "completed" | "blocked" | "opened" | "closed";
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
    for (const id of entityIds) {
      const entity = site.entities[id];
      if (entity?.kind === "pawn")
        tickPawn({ site, pawn: entity, tick: next.tick, materials, events });
      else if (entity?.kind === "door") tickDoor(site, entity, events);
    }
  }
  return { state: advanceTransfers(next), events };
}
