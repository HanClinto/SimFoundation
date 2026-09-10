import type { Door } from "./Door";
import type { Item } from "./Item";
import type { Pawn } from "./pawn/Pawn";
import type { Facility } from "./Facility";

type InstanceFields = "id" | "definitionId" | "name" | "location";

export interface EntityTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly attribution?: {
    author: string;
    source: string;
    license: string;
    adaptation: string;
  };
  readonly defaults:
    | Omit<Pawn, InstanceFields>
    | Omit<Item, InstanceFields>
    | Omit<Door, InstanceFields>
    | Omit<Facility, InstanceFields>;
}

export type EntityTemplates = Readonly<Record<string, EntityTemplate>>;
