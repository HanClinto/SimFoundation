import type { Proposal } from "./actions/proposals";
import { resolveTick } from "./actions/resolve";
import { definitions } from "./behaviors/definitions";
import type { Simulation, Site, TickEvent } from "./model";
import { advanceTransfers } from "./campaign/transfers";

export function collectProposals(
  site: Site,
  tick: number,
): readonly Proposal[] {
  return Object.values(site.entities).flatMap((entity) => {
    const proposal = definitions[entity.definitionId].onTick?.(
      site,
      entity,
      tick,
    );
    return proposal ? [proposal] : [];
  });
}

export function advanceSimulation(state: Simulation): {
  state: Simulation;
  events: readonly TickEvent[];
} {
  const tick = state.tick + 1;
  const sites: Record<string, Site> = {};
  const events: TickEvent[] = [];
  for (const id of Object.keys(state.sites).sort()) {
    const site = state.sites[id]!;
    const result = resolveTick(site, collectProposals(site, tick));
    sites[id] = result.site;
    events.push(...result.events);
  }
  return { state: advanceTransfers({ ...state, tick, sites }), events };
}
