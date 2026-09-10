import type { EntityTemplates } from "../../core/entity/EntityTemplate";
import type { Simulation } from "../../core/Simulation";
import { createSimulation } from "../../core/Simulation";
import { instantiateSite } from "../../core/site/Site";
import { depart } from "../../core/site/Transfer";
import { executeCommand } from "../../core/ControlPolicy";
import type { Materials } from "../../core/material/Material";
import { opportunities } from "./setup";
import { home, homeLoading, homePads } from "./Home";
import { requireDepartureReadiness, authorizeRisk } from "./Readiness";
import { operatingPhase } from "../../core/site/OperatingCycle";
import { reserveSite } from "./emergency";
import { restraintFor } from "../../core/entity/pawn/Custody";
import { recordedFinding } from "../../core/entity/Study";

export interface Campaign {
  homeId: string;
  siteIds: Record<string, string>;
  staffIds: string[];
  admissions: Record<string, { tick: number; bedId: string }>;
}

export function createCampaign(definitions: EntityTemplates): {
  state: Simulation;
  campaign: Campaign;
} {
  const created = instantiateSite(createSimulation(), home, definitions);
  let state = created.state;
  const siteIds: Record<string, string> = { home: created.siteId };
  for (const [key, opportunity] of Object.entries(opportunities)) {
    const field = instantiateSite(state, opportunity.site, definitions);
    state = field.state;
    siteIds[key] = field.siteId;
  }
  const reserve = instantiateSite(state, reserveSite, definitions);
  state = reserve.state;
  siteIds.reserve = reserve.siteId;
  return {
    state,
    campaign: {
      homeId: created.siteId,
      siteIds,
      staffIds: ["alex", "ben", "casey"].map(
        (name) => `${created.siteId}:${name}`,
      ),
      admissions: {},
    },
  };
}

export function opportunityBlocker(
  state: Simulation,
  campaign: Campaign,
  key: string,
): string | null {
  const opportunity = opportunities[key];
  if (!opportunity) return "Unknown opportunity.";
  if (
    opportunity.requiresFinding &&
    !recordedFinding(state.sites[campaign.homeId]!, opportunity.requiresFinding)
  )
    return `Home study required: ${opportunity.requiresFinding}.`;
  return null;
}

function route(campaign: Campaign, originId: string, destination: string) {
  const outbound = originId === campaign.homeId;
  const key = outbound
    ? destination
    : Object.keys(opportunities).find(
        (key) => campaign.siteIds[key] === originId,
      );
  if (!key || !opportunities[key] || (!outbound && destination !== "home"))
    throw new Error(
      "Routes connect home to one field site; return home first.",
    );
  const opportunity = opportunities[key]!;
  return {
    key,
    outbound,
    destinationId: outbound ? campaign.siteIds[key]! : campaign.homeId,
    loading: outbound ? homeLoading : opportunity.loading,
    pads: outbound ? homePads : opportunity.pads,
    arrival: outbound ? opportunity.loading : homeLoading,
    duration: opportunity.duration,
    maximumPassengers: opportunity.maximumPassengers ?? 1,
    loadingRadius: outbound ? 1 : (opportunity.loadingRadius ?? 1),
    daytimeReturn: opportunity.daytimeReturn ?? false,
  };
}

function team(
  state: Simulation,
  campaign: Campaign,
  siteId: string,
  ids: readonly string[],
) {
  if (ids.length < 1 || ids.length > 2 || new Set(ids).size !== ids.length)
    throw new Error("Choose one or two distinct existing staff.");
  return ids.map((id) => {
    const pawn = state.sites[siteId]?.entities[id];
    if (
      !campaign.staffIds.includes(id) ||
      pawn?.kind !== "pawn" ||
      !pawn.playerControllable ||
      !pawn.canAct ||
      pawn.location.kind !== "ground"
    )
      throw new Error(
        "Choose available staff at this site; carry incapacitated people with a responder.",
      );
    if (pawn.queue.length)
      throw new Error(`Finish or cancel ${pawn.name}'s queued work first.`);
    return pawn;
  });
}

export function prepareTeam(
  state: Simulation,
  campaign: Campaign,
  originId: string,
  destination: string,
  ids: readonly string[],
  materials: Materials,
): Simulation {
  const trip = route(campaign, originId, destination);
  if (trip.outbound) {
    const reason = opportunityBlocker(state, campaign, trip.key);
    if (reason) throw new Error(reason);
  }
  const pawns = team(state, campaign, originId, ids);
  if (trip.outbound) requireDepartureReadiness(pawns);
  let result = state;
  for (const [index, pawn] of pawns.entries()) {
    const base = { siteId: originId, entityId: pawn.id };
    result = executeCommand(
      result,
      { ...base, kind: "autonomy", enabled: false },
      materials,
    ).state;
    const ordered = executeCommand(
      result,
      {
        ...base,
        kind: "enqueue",
        action: { kind: "move", destination: trip.pads[index]! },
      },
      materials,
    );
    if (ordered.code === "rejected") throw new Error(ordered.reason!);
    result = ordered.state;
  }
  return result;
}

export function departTeam(
  state: Simulation,
  campaign: Campaign,
  originId: string,
  destination: string,
  ids: readonly string[],
): Simulation {
  const trip = route(campaign, originId, destination);
  const staffIds = ids.filter((id) => campaign.staffIds.includes(id));
  const crew = team(state, campaign, originId, staffIds);
  if (trip.outbound) requireDepartureReadiness(crew);
  const passengerIds = ids.filter((id) => !campaign.staffIds.includes(id));
  if (
    passengerIds.length > trip.maximumPassengers ||
    new Set(ids).size !== ids.length
  )
    throw new Error(
      `Choose distinct travellers, with at most ${trip.maximumPassengers} cooperative passengers on this route.`,
    );
  for (const id of passengerIds) {
    const person = state.sites[originId]?.entities[id];
    if (
      person?.kind !== "pawn" ||
      !(
        person.acceptsEscort ||
        restraintFor(state.sites[originId]!.entities, id)
      ) ||
      !person.canAct ||
      !person.mobile ||
      person.location.kind !== "ground" ||
      person.queue.length
    )
      throw new Error(
        "A passenger must consent, be able to walk, and finish following before departure. Carry incapacitated passengers instead.",
      );
  }
  if (trip.outbound) {
    const reason = opportunityBlocker(state, campaign, trip.key);
    if (reason) throw new Error(reason);
  }
  if (!trip.outbound && trip.daytimeReturn) {
    const cycle = operatingPhase(state.sites[originId]!.cycle, state.tick);
    if (cycle.phase === "night")
      throw new Error(
        `The night exit window is closed; it reopens at tick ${cycle.changesAt}.`,
      );
  }

  const result = depart(state, {
    originId,
    destinationId: trip.destinationId,
    entityIds: ids,
    loading: trip.loading,
    loadingRadius: trip.loadingRadius,
    arrival: trip.arrival,
    arrivalRadius: 1,
    duration: trip.duration,
  });
  if (result.reason) throw new Error(result.reason);
  result.state = authorizeRisk(
    result.state,
    result.transferId!,
    trip.outbound ? opportunities[trip.key]!.fatalAfterTicks : undefined,
  );
  return result.state;
}
