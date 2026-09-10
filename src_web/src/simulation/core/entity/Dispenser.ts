interface RequestBase {
  id: string;
  title: string;
  ticks: number;
}

export type DispenseRequest = RequestBase &
  (
    | {
        sourceDefinitionId: string;
        sampleDefinitionId: string;
        rejection?: never;
      }
    | {
        rejection: string;
        sourceDefinitionId?: never;
        sampleDefinitionId?: never;
      }
  );

export interface DispenseRecord {
  requestId: string;
  actorId: string;
  tick: number;
  paymentId: string;
  sourceId?: string;
  sampleId?: string;
  amount: number;
  result: string;
}

export interface Dispenser {
  paymentDefinitionId: string;
  portion: number;
  requests: readonly DispenseRequest[];
  nextSampleId: number;
  records: DispenseRecord[];
}

export interface SampleProvenance {
  machineId: string;
  requestId: string;
  sourceId: string;
  actorId: string;
  tick: number;
  amount: number;
}
