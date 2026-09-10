export interface Response {
  faction: string;
  hostileTo: string[];
  sight: number;
  threat: "flee" | "confront";
  hostileDuring?: "day" | "night";
  attack?: { damage: number; windup: number; maximumSeverity?: number };
  medicine?: { ticks: number; supplies: number };
}
