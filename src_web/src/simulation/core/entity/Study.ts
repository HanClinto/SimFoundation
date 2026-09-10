export interface StudyPlan {
  id: string;
  title: string;
  ticks: number;
  requires: readonly string[];
  finding: string;
  perActor?: boolean;
  containedSources?: boolean;
}

export interface Finding {
  planId: string;
  title: string;
  text: string;
  actorId: string;
  tick: number;
  sourceIds: string[];
}
