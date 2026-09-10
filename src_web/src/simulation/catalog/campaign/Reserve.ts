import type { Simulation } from "../../core/Simulation";
import { depart } from "../../core/site/Transfer";
import type { Campaign } from "./Campaign";
import { homeLoading, opportunities } from "./setup";
import { authorizeRisk } from "./Readiness";

export function dispatchReserve(
  state: Simulation,
  campaign: Campaign,
  destination: string,
  name: string,
) {
  const reserve = state.sites[campaign.siteIds.reserve!]!;
  const responder = reserve.entities[`${reserve.id}:${name}`];
  if (
    responder?.kind !== "pawn" ||
    !["devon", "riley"].includes(name) ||
    !responder.canAct ||
    responder.health?.death
  )
    throw new Error(
      "Choose an unused reserve responder: devon or riley. No replacements are generated.",
    );
  const destinationId = campaign.siteIds[destination];
  const opportunity = opportunities[destination];
  if (!destinationId || (destination !== "home" && !opportunity))
    throw new Error("Choose home or a known field route for reserve dispatch.");
  const docket = reserve.entities[`${reserve.id}:dispatches`]!;
  if (docket.amount < 1)
    throw new Error("The finite emergency dispatch allocations are exhausted.");
  const sent = depart(state, {
    originId: reserve.id,
    destinationId,
    entityIds: [responder.id],
    loading: { x: 2, y: 2 },
    loadingRadius: 1,
    arrival: destination === "home" ? homeLoading : opportunity!.loading,
    duration: 12,
  });
  if (sent.reason) throw new Error(sent.reason);
  const result = structuredClone(sent.state);
  result.sites[reserve.id]!.entities[docket.id]!.amount--;
  const incoming = result.transfers[sent.transferId!]!.entities[responder.id];
  if (incoming?.kind !== "pawn")
    throw new Error("Reserve departure lost its responder.");
  incoming.playerControllable = true;
  return {
    state: authorizeRisk(
      result,
      sent.transferId!,
      opportunity?.fatalAfterTicks,
    ),
    campaign: { ...campaign, staffIds: [...campaign.staffIds, responder.id] },
  };
}
