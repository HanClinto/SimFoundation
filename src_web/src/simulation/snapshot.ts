import { SIMULATION_VERSION, type Simulation } from "./model";

export function serialize(state: Simulation): string {
  return JSON.stringify(state);
}

export function deserialize(text: string): Simulation | null {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      "version" in value &&
      value.version === SIMULATION_VERSION
      ? (value as Simulation)
      : null;
  } catch {
    return null;
  }
}
