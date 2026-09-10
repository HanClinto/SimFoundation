import type { EntityBase } from "./Entity";
import type { SampleProvenance } from "./Dispenser";
import type { Equipment } from "./Equipment";

export interface Item extends EntityBase {
  kind: "item";
  stackable?: boolean;
  equipment?: Equipment;
  restraint?: {
    attached: boolean;
    ticks: number;
    wearPerTick: number;
    accepts: readonly string[];
  };
  sample?: SampleProvenance;
  requiresCase?: boolean;
  case?: {
    accepts: readonly string[];
    sealTicks: number;
    sealWear: number;
    sealed: boolean;
  };
}
