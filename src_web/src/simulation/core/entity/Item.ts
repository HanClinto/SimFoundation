import type { EntityBase } from "./Entity";
import type { SampleProvenance } from "./Dispenser";
import type { Equipment } from "./Equipment";
import type { CraftProvenance } from "./Crafting";

export interface Item extends EntityBase {
  kind: "item";
  stackable?: boolean;
  equipment?: Equipment;
  crafted?: CraftProvenance;
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
