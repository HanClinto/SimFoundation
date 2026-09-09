import type { Door } from "./Door";
import type { Item } from "./Item";
import type { Pawn } from "./pawn/Pawn";

type InstanceFields = "id" | "definitionId" | "name" | "location";

export interface EntityTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly defaults:
    | Omit<Pawn, InstanceFields>
    | Omit<Item, InstanceFields>
    | Omit<Door, InstanceFields>;
}

export type EntityTemplates = Readonly<Record<string, EntityTemplate>>;
