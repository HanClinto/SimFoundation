import type { GameState } from "./state";
import type { PhysicalObject } from "./objects";
import type { TilePosition } from "./world";

export const ELECTRICAL = {
  generator: { supply: 24, demand: 0, repairCost: 8 },
  cable: { supply: 0, demand: 0, repairCost: 8 },
  light: { supply: 0, demand: 2, repairCost: 8 },
} as const;
export type ElectricalKind = keyof typeof ELECTRICAL;
export const isElectrical = (
  item: PhysicalObject,
): item is PhysicalObject & { kind: ElectricalKind } =>
  Object.hasOwn(ELECTRICAL, item.kind);
export type PowerStatus =
  | "powered"
  | "disconnected"
  | "overloaded"
  | "off"
  | "damaged"
  | "packed";
export interface PowerReading {
  readonly status: PowerStatus;
  readonly circuit: string | null;
  readonly supply: number;
  readonly demand: number;
}
export interface PowerNetwork {
  readonly readings: Readonly<Record<string, PowerReading>>;
  readonly circuits: readonly {
    readonly id: string;
    readonly members: readonly string[];
    readonly supply: number;
    readonly demand: number;
  }[];
}
const networks = new WeakMap<GameState, PowerNetwork>();

export function powerNetwork(state: GameState): PowerNetwork {
  const cached = networks.get(state);
  if (cached) return cached;
  const readings: Record<string, PowerReading> = {};
  const nodes: {
    id: string;
    position: TilePosition;
    supply: number;
    demand: number;
    off: boolean;
  }[] = [];
  for (const item of state.objects.items.filter(isElectrical)) {
    const status =
      item.location.kind !== "ground" || !item.installed
        ? "packed"
        : item.condition <= 0
          ? "damaged"
          : null;
    if (status || (item.kind === "cable" && item.utilityEnabled === false)) {
      readings[item.id] = {
        status: status ?? "off",
        circuit: null,
        supply: 0,
        demand: 0,
      };
      continue;
    }
    if (item.location.kind !== "ground") continue;
    const off = item.utilityEnabled === false;
    nodes.push({
      id: item.id,
      position: item.location.position,
      supply: off ? 0 : ELECTRICAL[item.kind].supply,
      demand: off ? 0 : ELECTRICAL[item.kind].demand,
      off,
    });
  }
  nodes.sort((first, second) => first.id.localeCompare(second.id));
  const at = new Map<string, typeof nodes>();
  for (const node of nodes) {
    const key = `${node.position.x},${node.position.y}`;
    at.set(key, [...(at.get(key) ?? []), node]);
  }
  const visited = new Set<string>();
  const circuits: {
    id: string;
    members: string[];
    supply: number;
    demand: number;
  }[] = [];
  for (const start of nodes) {
    if (visited.has(start.id)) continue;
    const members = [start];
    visited.add(start.id);
    for (let index = 0; index < members.length; index += 1) {
      const position = members[index]!.position;
      for (const [horizontal, vertical] of [
        [0, 0],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        for (const neighbor of at.get(
          `${position.x + horizontal!},${position.y + vertical!}`,
        ) ?? []) {
          if (visited.has(neighbor.id)) continue;
          visited.add(neighbor.id);
          members.push(neighbor);
        }
      }
    }
    const circuit = {
      id: start.id,
      members: members.map(({ id }) => id),
      supply: members.reduce((total, node) => total + node.supply, 0),
      demand: members.reduce((total, node) => total + node.demand, 0),
    };
    circuits.push(circuit);
    for (const node of members)
      readings[node.id] = {
        status: node.off ? "off" : "disconnected",
        circuit: circuit.id,
        supply: 0,
        demand: 0,
      };
  }
  for (const camera of state.observations.cameras) {
    const installed =
      !camera.installJobId ||
      state.jobs.some(
        (job) => job.id === camera.installJobId && job.status === "completed",
      );
    if (!camera.enabled || !installed) {
      readings[camera.id] = {
        status: !installed ? "packed" : "off",
        circuit: null,
        supply: 0,
        demand: 0,
      };
      continue;
    }
    const terminal = nodes.find(
      (node) =>
        Math.abs(node.position.x - camera.position.x) +
          Math.abs(node.position.y - camera.position.y) <=
        1,
    );
    const circuit = terminal
      ? circuits.find(
          (circuit) => circuit.id === readings[terminal.id]!.circuit,
        )
      : null;
    if (circuit) {
      circuit.demand += 3;
      circuit.members.push(camera.id);
    }
    readings[camera.id] = {
      status: "disconnected",
      circuit: circuit?.id ?? null,
      supply: 0,
      demand: 0,
    };
  }
  for (const circuit of circuits)
    for (const id of circuit.members)
      readings[id] = {
        ...readings[id]!,
        supply: circuit.supply,
        demand: circuit.demand,
        status:
          readings[id]!.status === "off"
            ? "off"
            : circuit.supply === 0
              ? "disconnected"
              : circuit.demand > circuit.supply
                ? "overloaded"
                : "powered",
      };
  const result = { readings, circuits };
  networks.set(state, result);
  return result;
}

export function setUtilityEnabled(
  state: GameState,
  id: string,
  enabled: boolean,
): GameState {
  if (typeof enabled !== "boolean") return state;
  const item = state.objects.items.find((item) => item.id === id);
  if (
    !item ||
    !isElectrical(item) ||
    item.location.kind !== "ground" ||
    !item.installed ||
    item.reservedBy
  )
    return state;
  return {
    ...state,
    objects: {
      ...state.objects,
      items: state.objects.items.map((item) =>
        item.id === id ? { ...item, utilityEnabled: enabled } : item,
      ),
    },
  };
}
