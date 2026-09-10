export interface Response {
  faction: string;
  hostileTo: string[];
  sight: number;
  threat: "flee" | "confront";
  attack?: { damage: number; windup: number };
  medicine?: { ticks: number; supplies: number };
}
