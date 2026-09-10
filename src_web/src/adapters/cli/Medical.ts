import type { ScenarioSession } from "../../application/ScenarioSession";
import type { Pawn } from "../../simulation/core/entity/pawn/Pawn";
import { healthStatus } from "../../simulation/core/entity/pawn/Health";
import {
  stabilizationCapability,
  wornEquipment,
} from "../../simulation/core/entity/Equipment";
import { restraintFor } from "../../simulation/core/entity/pawn/Custody";

function severity(pawn: Pawn): number {
  return (
    pawn.health?.wounds.reduce((sum, wound) => sum + wound.severity, 0) ?? 0
  );
}
function bleeding(pawn: Pawn): number {
  return (
    pawn.health?.wounds.reduce((sum, wound) => sum + wound.bleeding, 0) ?? 0
  );
}
function priority(pawn: Pawn): number {
  if ((pawn.health?.mortality?.criticalTicks ?? 0) > 0) return 0;
  if (bleeding(pawn) > 0) return 1;
  if (!pawn.canAct) return 2;
  return 3;
}

export function medicalOverview(
  session: ScenarioSession,
  siteId?: string,
): string {
  const owners = [
    ...Object.values(session.state.sites),
    ...Object.values(session.state.transfers),
  ].filter((owner) => siteId === undefined || owner.id === siteId);
  const people = owners.flatMap((owner) =>
    Object.values(owner.entities)
      .filter(
        (entity): entity is Pawn => entity.kind === "pawn" && !!entity.health,
      )
      .map((pawn) => ({ pawn, owner })),
  );
  const patients = people
    .filter(
      ({ pawn }) =>
        !pawn.health!.death &&
        (!pawn.canAct ||
          severity(pawn) > 0 ||
          pawn.health!.bloodLoss > 0 ||
          pawn.health!.postoperative ||
          pawn.health!.subdual ||
          Object.values(pawn.health!.organs ?? {}).some(
            (organ) => organ.trauma > 0,
          )),
    )
    .sort(
      (a, b) =>
        priority(a.pawn) - priority(b.pawn) ||
        bleeding(b.pawn) - bleeding(a.pawn) ||
        (a.pawn.id < b.pawn.id ? -1 : a.pawn.id > b.pawn.id ? 1 : 0),
    );
  const label = (pawn: Pawn) =>
    `${session.labels[pawn.id] ?? pawn.id} ${pawn.name} [${pawn.id}]`;
  const bodies = people.filter(({ pawn }) => pawn.health!.death);
  const medics = people.filter(
    ({ pawn }) => pawn.response?.medicine && !pawn.health!.death,
  );
  return [
    `Game care overview | tick ${session.state.tick} | ${siteId ?? "all owners"}`,
    "Read-only current facts; no automatic treatment or override of the bear's youngest-patient selection.",
    "PATIENTS",
    ...(patients.length
      ? patients.map(({ pawn, owner }) => {
          const organs = Object.entries(pawn.health!.organs ?? {}).map(
            ([kind, organ]) =>
              `${kind} trauma ${organ.trauma}${organ.replacement ? " (replacement recorded)" : ""}`,
          );
          return `${label(pawn)} at ${owner.id}: ${healthStatus(pawn)} | wounds ${severity(pawn).toFixed(1)} | bleeding ${bleeding(pawn).toFixed(2)}/tick | blood loss ${pawn.health!.bloodLoss.toFixed(1)}${organs.length ? ` | ${organs.join(", ")}` : ""}${pawn.health!.postoperative ? ` | POSTOPERATIVE COURSE PENDING since ${pawn.health!.postoperative.sinceTick}` : ""}${pawn.requiresRestraint ? " | custody subject: verify restraint/containment before care" : ""}`;
        })
      : ["No current patients in this scope."]),
    "MEDICAL WORKERS",
    ...(medics.length
      ? medics.map(({ pawn, owner }) => {
          const capability = stabilizationCapability(owner, pawn);
          const kit = wornEquipment(owner, pawn.id, "tool");
          return `${label(pawn)} at ${owner.id}: ${healthStatus(pawn)} | stabilization supplies ${capability?.supplies ?? 0} | ${kit?.equipment?.medicine ? `kit ${kit.id}, condition ${kit.integrity ?? 100}` : "initial allowance"}${"terrain" in owner ? "" : " | IN TRANSIT: no local orders"}${pawn.location.kind === "carried" ? ` | carried by ${pawn.location.carrierId}: no independent orders` : ""}${restraintFor(owner.entities, pawn.id) ? " | restrained: no independent care" : ""}${session.campaign && !session.campaign.staffIds.includes(pawn.id) ? " | not in deployed roster" : ""}`;
        })
      : ["No living trained medical workers in this scope."]),
    "RETAINED BODIES",
    ...(bodies.length
      ? bodies.map(
          ({ pawn, owner }) =>
            `${label(pawn)} at ${owner.id}: ${healthStatus(pawn)}; physical recovery only.`,
        )
      : ["None in this scope."]),
  ].join("\n");
}
