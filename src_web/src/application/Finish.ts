import { stepSession, type ScenarioSession } from "./ScenarioSession";
import type { TickEvent } from "../simulation/core/Simulation";
import { alarmPriority, firstAlarm } from "./Alarms";

export function finishCommitments(
  initial: ScenarioSession,
  targetIds: readonly string[],
  stopOnAlarms = false,
) {
  const notices: Readonly<TickEvent>[] = [];
  let noticeCount = 0;
  let alarm: Readonly<TickEvent> | undefined;
  let finalEvents: readonly Readonly<TickEvent>[] = [];
  const owners = [
    ...Object.values(initial.state.sites),
    ...Object.values(initial.state.transfers),
  ];
  const targets = targetIds.map((id) => {
    const owner = owners.find((owner) => owner.entities[id]);
    const entity = owner?.entities[id];
    if (
      entity?.kind !== "pawn" &&
      !(
        entity?.kind === "facility" &&
        entity.processor &&
        owner &&
        "terrain" in owner
      )
    )
      throw new Error(
        "Choose workers with queues/transport or installed processing apparatus.",
      );
    return entity;
  });
  const workers = targets.filter((entity) => entity.kind === "pawn");
  const processes = targets.flatMap((entity) =>
    entity.kind === "facility" && entity.processor?.current
      ? [
          {
            machineId: entity.id,
            runId: entity.processor.current.id,
            siteId: Object.values(initial.state.sites).find(
              (site) => site.entities[entity.id],
            )!.id,
          },
        ]
      : [],
  );
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
  if (!watched.size && !transferIds.size && !processes.length)
    return {
      session: initial,
      elapsed: 0,
      reason:
        "No queued, travelling or processing commitments to finish. No time advanced.",
      notices,
      noticeCount,
      alarm,
      events: finalEvents,
    };
  let session = initial;
  let reason = "Reached the 1000-tick limit; inspect remaining work.";
  for (let ticks = 0; ticks < 1000; ticks++) {
    let events: readonly Readonly<TickEvent>[] = [];
    session = stepSession(session, 1, (current) => {
      events = current;
    });
    finalEvents = events;
    for (const event of events) {
      if (alarmPriority(event) < 0) continue;
      noticeCount++;
      notices.push(event);
      notices.sort((a, b) => alarmPriority(a) - alarmPriority(b));
      if (notices.length > 8) notices.pop();
    }
    if (stopOnAlarms) {
      alarm = firstAlarm(events);
      if (alarm) {
        reason = `ALARM at tick ${session.state.tick}: ${alarm.siteId} ${alarm.entityId} ${alarm.kind}: ${alarm.reason ?? "inspect events"}`;
        break;
      }
    }
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
    const deviceStates = processes.map((process) => {
      const machine =
        session.state.sites[process.siteId]?.entities[process.machineId];
      if (machine?.kind !== "facility" || !machine.processor)
        return {
          remaining: false,
          reason: `Processing apparatus ${process.machineId} is no longer present.`,
        };
      const current = machine.processor.current;
      return current?.id === process.runId
        ? {
            remaining: true,
            reason: current.blockedReason
              ? `Blocked processing ${machine.id}: ${current.blockedReason}`
              : null,
          }
        : { remaining: false, reason: null };
    });
    const deviceBlocker = deviceStates.find((device) => device.reason);
    if (deviceBlocker) {
      reason = deviceBlocker.reason!;
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
    if (
      !workRemaining &&
      !travelRemaining &&
      !deviceStates.some((device) => device.remaining)
    ) {
      reason = "Watched commitments finished.";
      break;
    }
  }
  return {
    session,
    elapsed: session.state.tick - initial.state.tick,
    reason,
    notices,
    noticeCount,
    alarm,
    events: finalEvents,
  };
}
