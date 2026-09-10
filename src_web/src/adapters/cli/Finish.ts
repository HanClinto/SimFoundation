import {
  stepSession,
  type ScenarioSession,
} from "../../application/ScenarioSession";
import type { TickEvent } from "../../simulation/core/Simulation";

export function finishCommitments(
  initial: ScenarioSession,
  workerIds: readonly string[],
) {
  const owners = [
    ...Object.values(initial.state.sites),
    ...Object.values(initial.state.transfers),
  ];
  const workers = workerIds.map((id) => {
    const entity = owners.map((owner) => owner.entities[id]).find(Boolean);
    if (entity?.kind !== "pawn")
      throw new Error("Choose workers with action queues or actual transport.");
    return entity;
  });
  const watched = new Set(
    workers.flatMap((worker) => worker.queue.map((entry) => entry.id)),
  );
  const transfers = Object.values(initial.state.transfers).filter((transfer) =>
    workers.some((worker) => transfer.entities[worker.id]),
  );
  const transferIds = new Set(transfers.map((transfer) => transfer.id));
  const travellingIds = new Set(
    transfers.flatMap((transfer) => Object.keys(transfer.entities)),
  );
  if (!watched.size && !transferIds.size)
    return {
      session: initial,
      elapsed: 0,
      reason:
        "No queued or travelling commitments to finish. No time advanced.",
    };
  let session = initial;
  let reason = "Reached the 1000-tick limit; inspect remaining work.";
  for (let ticks = 0; ticks < 1000; ticks++) {
    let events: readonly Readonly<TickEvent>[] = [];
    session = stepSession(session, 1, (current) => {
      events = current;
    });
    const pawns = Object.values(session.state.sites)
      .flatMap((site) => Object.values(site.entities))
      .filter((entity) => entity.kind === "pawn");
    for (const pawn of pawns) {
      for (const entry of pawn.queue) {
        if (
          entry.action.kind === "follow" &&
          watched.has(entry.action.escortActionId)
        )
          watched.add(entry.id);
      }
    }
    const incident = events.find(
      (event) =>
        (event.actionId &&
          watched.has(event.actionId) &&
          ["blocked", "failed", "interrupted"].includes(event.kind)) ||
        (travellingIds.has(event.entityId) &&
          ["warning", "died", "escaped"].includes(event.kind)),
    );
    if (incident) {
      reason = `${incident.entityId} ${incident.kind}: ${incident.reason ?? incident.actionKind ?? "inspect events"}`;
      break;
    }
    const blockedTransfer = Object.values(session.state.transfers).find(
      (transfer) => transferIds.has(transfer.id) && transfer.blockedReason,
    );
    if (blockedTransfer) {
      reason = `Blocked arrival ${blockedTransfer.id}: ${blockedTransfer.blockedReason}`;
      break;
    }
    const blocked = pawns.flatMap((pawn) =>
      pawn.queue
        .filter((entry) => watched.has(entry.id) && entry.blockedReason)
        .map((entry) => `${pawn.name}: ${entry.blockedReason}`),
    );
    if (blocked.length) {
      reason = `Blocked: ${blocked.join("; ")}`;
      break;
    }
    const workRemaining = pawns.some((pawn) =>
      pawn.queue.some((entry) => watched.has(entry.id)),
    );
    const travelRemaining = Object.keys(session.state.transfers).some((id) =>
      transferIds.has(id),
    );
    if (!workRemaining && !travelRemaining) {
      reason = "Watched commitments finished.";
      break;
    }
  }
  return { session, elapsed: session.state.tick - initial.state.tick, reason };
}
