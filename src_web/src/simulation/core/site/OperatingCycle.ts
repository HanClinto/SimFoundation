import type { Site } from "./Site";

export interface OperatingCycle {
  dayTicks: number;
  nightTicks: number;
  startedTick: number | null;
}

export function operatingPhase(
  cycle: OperatingCycle | undefined,
  tick: number,
): { phase: "unstarted" | "day" | "night"; changesAt: number | null } {
  if (!cycle || cycle.startedTick === null)
    return { phase: "unstarted", changesAt: null };
  const period = cycle.dayTicks + cycle.nightTicks;
  const elapsed = (tick - cycle.startedTick) % period;
  return elapsed < cycle.dayTicks
    ? { phase: "day", changesAt: tick + cycle.dayTicks - elapsed }
    : { phase: "night", changesAt: tick + period - elapsed };
}

export function beginOperatingCycle(site: Site, tick: number): void {
  if (
    site.cycle?.startedTick === null &&
    Object.values(site.entities).some(
      (entity) =>
        entity.kind === "pawn" &&
        entity.playerControllable &&
        entity.location.kind === "ground",
    )
  )
    site.cycle.startedTick = tick;
}
