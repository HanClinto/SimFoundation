import type { TickEvent } from "../simulation/core/Simulation";

const priority: readonly TickEvent["kind"][] = [
  "died",
  "breached",
  "escaped",
  "warning",
];

export function alarmPriority(event: Readonly<TickEvent>): number {
  return priority.indexOf(event.kind);
}

export function firstAlarm(
  events: readonly Readonly<TickEvent>[],
): Readonly<TickEvent> | undefined {
  return priority
    .map((kind) => events.find((event) => event.kind === kind))
    .find((event) => event !== undefined);
}
