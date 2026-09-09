import type { GameState, SiteSimulationState } from "./state";
import { draftResponder, orderResponder, type TacticalCode } from "./combat";
import { expeditionMember, fieldState, storeFieldState } from "./expeditions";
import type { TilePosition } from "./world";

export function goHere(
  state: GameState,
  mapId: string,
  personId: string,
  destination: TilePosition,
): { state: GameState; code: TacticalCode } {
  const active = state.expeditions.active;
  const field = active?.site?.world.map.id === mapId;
  const local = field
    ? fieldState(state)
    : mapId === state.world.map.id
      ? state
      : null;
  if (
    !local ||
    !local.world.positions[personId] ||
    !local.personnel.some((person) => person.id === personId)
  )
    return { state, code: "not-found" };
  if (
    field
      ? active!.phase !== "field" ||
        active!.recoveryOrders.some(
          (order) => order.personId === personId && order.phase !== "delivered",
        )
      : expeditionMember(state, personId)
  )
    return { state, code: "busy" };
  const result = goHereAtSite(local, mapId, personId, destination);
  return result.code === "accepted"
    ? {
        code: result.code,
        state: field ? storeFieldState(state, result.state) : result.state,
      }
    : { state, code: result.code };
}

export function goHereAtSite<State extends SiteSimulationState>(
  state: State,
  mapId: string,
  personId: string,
  destination: TilePosition,
): { state: State; code: TacticalCode } {
  if (
    state.world.map.id !== mapId ||
    !state.world.positions[personId] ||
    !state.personnel.some((person) => person.id === personId)
  )
    return { state, code: "not-found" };
  const local = state;
  const responder = local.combat.responders[personId];
  const temporary = !responder?.drafted || responder.returnToAutonomy === true;
  const drafted = responder?.drafted
    ? { state: local, code: "accepted" as const }
    : draftResponder(local, personId, true);
  if (drafted.code !== "accepted") return { state, code: drafted.code };
  const ordered = orderResponder(drafted.state, personId, "move", destination);
  if (ordered.code !== "accepted") return { state, code: ordered.code };
  const next = {
    ...ordered.state,
    combat: {
      ...ordered.state.combat,
      responders: {
        ...ordered.state.combat.responders,
        [personId]: {
          ...ordered.state.combat.responders[personId]!,
          returnToAutonomy: temporary,
        },
      },
    },
  };
  return {
    code: "accepted",
    state: next,
  };
}
