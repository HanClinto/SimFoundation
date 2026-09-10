import type { Pawn } from "./pawn/Pawn";
import type { Item } from "./Item";
import type { Door } from "./Door";
import type { Facility } from "./Facility";

export interface Position {
  x: number;
  y: number;
}

export type Location =
  | { kind: "ground"; position: Position }
  | { kind: "carried"; carrierId: string };

export interface EntityBase {
  id: string;
  definitionId: string;
  name: string;
  location: Location;
  carryable: boolean;
  blocksMovement: boolean;
  blocksSight: boolean;
  materialId: string;
  amount: number;
}

export type Entity = Pawn | Item | Door | Facility;
