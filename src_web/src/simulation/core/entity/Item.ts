import type { EntityBase } from "./Entity";
import type { SampleProvenance } from "./Dispenser";

export interface Item extends EntityBase {
  kind: "item";
  stackable?: boolean;
  sample?: SampleProvenance;
  requiresCase?: boolean;
  case?: {
    accepts: readonly string[];
    sealTicks: number;
    sealWear: number;
    sealed: boolean;
  };
}
