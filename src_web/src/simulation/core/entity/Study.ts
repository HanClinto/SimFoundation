export interface StudyPlan {
  id: string;
  title: string;
  ticks: number;
  requires: readonly string[];
  finding: string;
  perActor?: boolean;
  containedSources?: boolean;
  recordedImpactsFrom?: string;
}

export interface Finding {
  planId: string;
  title: string;
  text: string;
  actorId: string;
  tick: number;
  sourceIds: string[];
  observationIds?: string[];
}

export function recordedFinding(
  site: Pick<Site, "entities">,
  planId: string,
  actorId?: string,
): { stationId: string; finding: Finding } | undefined {
  for (const station of Object.values(site.entities).sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  )) {
    if (station.kind !== "facility") continue;
    const finding = station.study?.findings.find(
      (entry) =>
        entry.planId === planId &&
        (actorId === undefined || entry.actorId === actorId),
    );
    if (finding) return { stationId: station.id, finding };
  }
}
import type { Site } from "../site/Site";
