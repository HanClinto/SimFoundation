import type { EntityBase } from "./Entity";
import type { SampleProvenance } from "./Dispenser";

export interface Item extends EntityBase {
  kind: "item";
  sample?: SampleProvenance;
}
