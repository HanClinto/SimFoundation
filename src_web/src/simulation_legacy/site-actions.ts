import { createActionQueueExecutor } from "./action-queue-core";
import { goHereAtSite } from "./direct-control";
import { performSiteInteraction } from "./site-interactions";
import type { SiteSimulationState } from "./state";

export const siteActions = createActionQueueExecutor<SiteSimulationState>({
  location: (state, mapId) => (state.world.map.id === mapId ? state : null),
  atLocation: (state, local) =>
    state.world.map.id === local.world.map.id ? local : state,
  ownership: (state, intent) =>
    state.world.map.id === intent.mapId &&
    !!state.world.positions[intent.actorId] &&
    state.personnel.some((person) => person.id === intent.actorId)
      ? null
      : "This person is no longer on this map.",
  execute: (state, intent) => {
    if (intent.action !== "move")
      return performSiteInteraction(state, {
        ...intent,
        action: intent.action,
      });
    const result = goHereAtSite(
      state,
      intent.mapId,
      intent.actorId,
      intent.destination!,
    );
    return {
      state: result.state,
      reason:
        result.code === "accepted"
          ? null
          : `Movement unavailable: ${result.code}.`,
    };
  },
  interact: performSiteInteraction,
  personalRoutines: () => true,
  recoverable: () => false,
  recovery: () => null,
});
