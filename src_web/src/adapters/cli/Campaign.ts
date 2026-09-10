import type { ScenarioSession } from "../../application/ScenarioSession";
import {
  opportunityBlocker,
  readyDocket,
} from "../../simulation/catalog/campaign/Campaign";
import { opportunities } from "../../simulation/catalog/campaign/setup";
import { homeLoading } from "../../simulation/catalog/campaign/Home";
import { departureReadiness } from "../../simulation/catalog/campaign/Readiness";
import {
  serviceDeadline,
  serviceStatus,
} from "../../simulation/core/entity/Service";
import { operatingPhase } from "../../simulation/core/site/OperatingCycle";
import { healthStatus } from "../../simulation/core/entity/pawn/Health";
import { restraintFor } from "../../simulation/core/entity/pawn/Custody";
import {
  containmentFor,
  secureContainment,
} from "../../simulation/core/entity/Containment";

export function campaignStatus(session: ScenarioSession): string {
  const { campaign, state } = session;
  if (!campaign) throw new Error("No active campaign.");
  const owners = [
    ...Object.values(state.sites),
    ...Object.values(state.transfers),
  ];
  const home = state.sites[campaign.homeId]!;
  return [
    `Tick ${state.tick} | Provisional Site campaign | home ${campaign.homeId}`,
    "No mission reset or victory freeze: sites, staff, cargo and findings persist.",
    ...campaign.staffIds.map((id) => {
      const owner = owners.find((owner) => owner.entities[id]);
      const pawn = owner?.entities[id];
      return `${session.labels[id]} ${pawn?.name ?? id}: ${owner?.id ?? "MISSING"}${pawn?.kind === "pawn" ? ` | ${healthStatus(pawn)} | hunger ${pawn.needs.hunger?.value.toFixed(1) ?? "-"} | fatigue ${pawn.needs.fatigue?.value.toFixed(1) ?? "-"} | autonomy ${pawn.autonomy ? "on" : "off"} | ${pawn.queue[0]?.action.kind ?? "idle"}${pawn.queue[0]?.blockedReason ? ` BLOCKED: ${pawn.queue[0].blockedReason}` : ""}${!pawn.health?.death && departureReadiness(pawn) ? `\n  ${departureReadiness(pawn)}` : ""}` : ""}`;
    }),
    ...owners.flatMap((owner) =>
      Object.values(owner.entities).flatMap((entity) =>
        entity.kind === "pawn" && entity.requiresRestraint
          ? [
              `Custody ${entity.name} at ${owner.id}: ${healthStatus(entity)} | ${restraintFor(owner.entities, entity.id) ? `restraint condition ${restraintFor(owner.entities, entity.id)!.integrity}` : "UNRESTRAINED"}${containmentFor(owner.entities, entity.id) ? ` | in ${containmentFor(owner.entities, entity.id)!.name}` : " | NOT CONTAINED"}`,
            ]
          : [],
      ),
    ),
    ...owners.flatMap((owner) =>
      Object.values(owner.entities).flatMap((entity) =>
        entity.kind === "pawn" && entity.serviceDuty
          ? [
              `Duty: ${entity.name} -> ${entity.serviceDuty}${"terrain" in owner && owner.entities[entity.serviceDuty] ? "" : " (not at the assigned site)"}`,
            ]
          : [],
      ),
    ),
    ...Object.values(state.sites).flatMap((site) =>
      Object.values(site.entities).flatMap((entity) =>
        entity.kind === "facility" && entity.service
          ? [
              `Service at ${site.id}: ${entity.name} | condition ${entity.integrity ?? 100} | ${serviceStatus(entity.service, state.tick).toUpperCase()} | deadline ${serviceDeadline(entity.service) ?? "after first completed service"} | ${entity.service.history.filter((record) => record.kind === "service").length} services | late ${entity.service.history.filter((record) => record.lateBy > 0).length}`,
            ]
          : [],
      ),
    ),
    ...Object.values(state.sites).flatMap((site) =>
      Object.values(site.entities).flatMap((entity) =>
        entity.kind === "facility" && entity.containment
          ? [
              `Containment ${entity.id}: ${secureContainment(entity, state.tick) ? "SECURE" : "UNSAFE"} | lockdown until ${entity.containment.lockdown.untilTick ?? "unused"} | ${entity.service ? serviceStatus(entity.service, state.tick).toUpperCase() : "no service"}`,
            ]
          : [],
      ),
    ),
    ...Object.values(state.sites).flatMap((site) =>
      site.cycle
        ? [
            `Cycle at ${site.id}: ${operatingPhase(site.cycle, state.tick).phase.toUpperCase()} | changes at ${operatingPhase(site.cycle, state.tick).changesAt ?? "first responder entry"}`,
          ]
        : [],
    ),
    ...owners.flatMap((owner) =>
      Object.values(owner.entities).flatMap((entity) =>
        entity.kind === "pawn" && entity.acceptsEscort
          ? [
              `${session.labels[entity.id]} ${entity.name}: ${owner.id} | ${healthStatus(entity)} | blood loss ${entity.health?.bloodLoss.toFixed(1) ?? "-"}${campaign.admissions[entity.id] ? ` | admitted tick ${campaign.admissions[entity.id]!.tick}` : " | awaiting care"}`,
            ]
          : [],
      ),
    ),
    `Home stocks: ${Object.values(home.entities)
      .filter((entity) =>
        [
          "packaged-meal",
          "transport-docket",
          "coin-allocation",
          "clinical-pack",
          "wound-care-pack",
        ].includes(entity.definitionId),
      )
      .map(
        (entity) => `${entity.name} ${entity.amount.toFixed(1)} [${entity.id}]`,
      )
      .join("; ")}`,
    ...Object.entries(opportunities).map(([key, opportunity]) => {
      const reason = opportunityBlocker(state, campaign, key);
      return `${key} (${campaign.siteIds[key]}): ${reason ? `LOCKED: ${reason}` : readyDocket(state, campaign) ? "AVAILABLE" : "BLOCKED: no transport docket ready at home pad"} | ${opportunity.duration} travel ticks | 1 outbound docket/group; return prepaid${opportunity.fatalAfterTicks ? ` | LETHAL RISK: ${opportunity.fatalAfterTicks} critical ticks; equip before departure` : ""}`;
    }),
    ...Object.values(state.transfers).map(
      (transfer) =>
        `${transfer.id}: ${transfer.originId} -> ${transfer.destinationId} | arrival tick ${transfer.arrivesAt}${transfer.blockedReason ? ` | BLOCKED: ${transfer.blockedReason}` : ""} | ${Object.values(
          transfer.entities,
        )
          .map((entity) => `${entity.name} [${entity.id}]`)
          .join(", ")}`,
    ),
    ...Object.values(state.sites).flatMap((site) =>
      Object.values(site.entities).flatMap((entity) =>
        entity.kind === "facility"
          ? (entity.study?.findings ?? []).map(
              (finding) =>
                `Finding at ${site.id}: ${finding.title} | tick ${finding.tick} | by ${finding.actorId} | sources ${finding.sourceIds.join(", ")}`,
            )
          : [],
      ),
    ),
    ...Object.values(home.entities).flatMap((entity) =>
      entity.kind === "facility" && entity.dispenser
        ? entity.dispenser.records.map(
            (record) =>
              `${entity.name}: ${record.requestId} | tick ${record.tick} | ${record.result}${record.sampleId ? ` | sample ${record.sampleId} from ${record.sourceId} (${record.amount} cup)` : ""}`,
          )
        : [],
    ),
    `Reserve at ${campaign.siteIds.reserve}: ${Object.values(
      state.sites[campaign.siteIds.reserve!]!.entities,
    )
      .map((entity) => `${entity.name} (${entity.amount})`)
      .join(
        ", ",
      )}. reserve <home|route> <devon|riley>; physical arrival in 12 ticks.`,
    `Home loading area: (${homeLoading.x},${homeLoading.y}) and adjacent tiles. prepare <route> <staff...>, step until ready, send <route> <staff...>. Preparation turns their autonomy off.`,
    `brief <${Object.keys(opportunities).join("|")}|scp294|clinic> | site <home|${Object.keys(opportunities).join("|")}> | inspect <id>`,
  ].join("\n");
}

export function campaignBrief(key?: string): string {
  if (key === "clinic")
    return [
      "Clinical recovery: real bedside work, not an admission cure",
      "Stabilize bleeding first. Deliver a carried patient to (4,2), beside clinic, then order casey nurse <patient> clinic.",
      "One of four clinical-packs funds up to 25 blood-loss recovery over 16 work ticks. Keep packs beside the bed or carried by the medic.",
      "Spent supplies and partial recovery remain after cancellation. Recorded blood-loss incapacity can clear on completion; wounds and arbitrary incapacity do not.",
      "After recovery, escort the cooperative person to an ordinary bed and admit for rest. A paid postoperative course is required even at zero blood loss. Default care does not cure wounds or brain trauma.",
      "Explicit nurse <patient> clinic wounds uses a separate wound-care pack and twenty work ticks for up to forty severity recovery. Original injuries retain treatment provenance; no death, brain or organ cure is implied.",
    ].join("\n");
  if (key === "scp294")
    return [
      "SCP-294: bounded home experiment",
      "Inspect machine for four approved requests. Example: order ben dispense machine tracer tracer.",
      "Eight coin allocations; two tracer portions. Payment is nonrefundable after work starts. Sources must stay grounded at this site.",
      "Clear each output with order ben deliver <sample-id> 8 3 (first) or 9 4 (second). Inspect machine to find IDs; map also assigns stable oN labels.",
      "Then order ben study sample-bench repeated-tracer. Diamond spends a coin and records OUT OF RANGE without a sample.",
      "Adapted from SCP-294 by Arcibi, CC BY-SA 3.0: https://scp-wiki.wikidot.com/scp-294. No arbitrary requests or harmful effects are implemented.",
    ].join("\n");
  if (key) {
    const opportunity = opportunities[key];
    if (!opportunity) throw new Error("Unknown opportunity.");
    return [
      opportunity.name,
      opportunity.briefing,
      `Field loading area: (${opportunity.loading.x},${opportunity.loading.y}) and adjacent tiles.`,
    ].join("\n");
  }
  return [
    "Manage a finite home site. Recover evidence, study it physically, and spend transport allocations deliberately.",
    "Start with brief blackwood. Prepare actual staff; take supplies before assembling. One carrier holds one object.",
    "Example: prepare blackwood alex ben; step 10; send blackwood alex ben; step 8; site blackwood.",
    "At home, deliver journal to (3,3) and specimen to (3,5), then order ben study bench marsh-lead.",
    "Partial withdrawal is allowed. Return transport is prepaid, retained sites do not restock, and no command creates replacement staff.",
    "Use autonomy <staff> on for home routines; preparation disables it so staff wait at the loading area. Keep the arrival pad clear.",
    "SCP-294 is installed at home for a bounded experiment. brief scp294 explains finite paid requests and sample comparison.",
    "SCP-1867 by Djoric and SCP-1370 by Sorts, SCP Wiki, CC BY-SA 3.0. Kestrel and this campaign are original adaptations; inspect evidence for source links.",
  ].join("\n");
}
