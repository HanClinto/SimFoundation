import type { ScenarioSession } from "../../application/ScenarioSession";
import { describeAction } from "./Queue";
import { healthStatus } from "../../simulation/core/entity/pawn/Health";
import {
  serviceDeadline,
  serviceStatus,
} from "../../simulation/core/entity/Service";
import { directWatchers } from "../../simulation/core/entity/pawn/Attention";

export function workboard(session: ScenarioSession): string {
  const { state, campaign } = session;
  if (!campaign) throw new Error("The workboard requires a campaign.");
  const owners = [
    ...Object.values(state.sites),
    ...Object.values(state.transfers),
  ];
  const staff = new Set(campaign.staffIds);
  const rows: string[] = [];
  for (const id of campaign.staffIds) {
    const owner = owners.find((owner) => owner.entities[id]);
    const worker = owner?.entities[id];
    if (worker?.kind !== "pawn") {
      rows.push(`STAFF ${id}: MISSING`);
      continue;
    }
    const current = worker.queue[0];
    rows.push(
      `${session.labels[id]} ${worker.name} at ${owner!.id}: ${healthStatus(worker)} | ${
        current
          ? `${describeAction(current.action)}${worker.queue.length > 1 ? ` (+${worker.queue.length - 1} queued)` : ""}${current.blockedReason ? ` | BLOCKED: ${current.blockedReason}` : ""}`
          : "idle"
      }${worker.serviceDuty ? ` | duty ${worker.serviceDuty}` : ""}`,
    );
  }
  for (const transfer of Object.values(state.transfers).sort((a, b) =>
    a.id < b.id ? -1 : 1,
  ))
    rows.push(
      `TRANSIT ${transfer.id}: ${transfer.originId} -> ${transfer.destinationId}, due ${transfer.arrivesAt}${transfer.blockedReason ? ` | BLOCKED: ${transfer.blockedReason}` : ""}`,
    );
  for (const site of Object.values(state.sites).sort((a, b) =>
    a.id < b.id ? -1 : 1,
  )) {
    const attended = Object.values(site.entities).some(
      (entity) =>
        staff.has(entity.id) && entity.kind === "pawn" && !entity.health?.death,
    );
    for (const entity of Object.values(site.entities).sort((a, b) =>
      a.id < b.id ? -1 : 1,
    )) {
      if (entity.kind === "facility") {
        const run = entity.processor?.current;
        if (run)
          rows.push(
            `DEVICE ${entity.id}: ${run.recipeId}, input ${run.inputId}, due ${run.completesAt}${run.blockedReason ? ` | BLOCKED: ${run.blockedReason}` : ""}`,
          );
        const deadline = entity.service
          ? serviceDeadline(entity.service)
          : null;
        if (deadline !== null)
          rows.push(
            `SERVICE ${entity.id}: ${serviceStatus(entity.service!, state.tick).toUpperCase()}, deadline ${deadline}`,
          );
      }
      if (entity.kind === "pawn" && entity.stillWhenWatched) {
        const observers = directWatchers(site, entity.id);
        if (attended || observers.length)
          rows.push(
            `WATCH ${entity.id}: ${observers.filter((observer) => observer.human).length} human, ${observers.filter((observer) => !observer.human).length} supplemental${observers.length ? ` | ${observers.map((observer) => observer.id).join(", ")}` : " | NONE; subject may move"}`,
          );
      }
    }
  }
  const visible = rows.slice(0, 24);
  return [
    `Current work | tick ${state.tick} | ${rows.length} rows${rows.length > visible.length ? `, showing first ${visible.length}` : ""}`,
    ...visible,
    "Read-only operations, not a safety guarantee. queue <worker>, inspect <id>, medical all, status for full detail; finish --alarms <worker-or-machine> to wait.",
  ].join("\n");
}
