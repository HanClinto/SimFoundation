export type Scp9620Phase =
  | "calibration"
  | "baseline"
  | "activation"
  | "feedback-incident"
  | "stabilized";

export interface Scp9620Observation {
  readonly id: string;
  readonly recordedTick: number;
  readonly certainty: "confirmed" | "unresolved";
  readonly label: string;
}

export interface Scp9620State {
  readonly id: "SCP-9620";
  readonly phase: Scp9620Phase;
  readonly observations: readonly Scp9620Observation[];
}

export function createScp9620State(): Scp9620State {
  return {
    id: "SCP-9620",
    phase: "calibration",
    observations: [],
  };
}
