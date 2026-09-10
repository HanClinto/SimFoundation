import type { Quest } from "../../core/quest/Quest";

export const ColonyTrial: Quest = {
  id: "colony",
  name: "Shared facilities endurance",
  deadline: 1100,
  objectives: [
    {
      id: "time",
      description: "Run for 1000 ticks",
      condition: { kind: "elapsed", ticks: 1000 },
    },
    {
      id: "work",
      description: "Complete at least 100 activities",
      condition: { kind: "event", event: "completed", count: 100 },
    },
    {
      id: "care",
      description: "The medic treats the injured worker",
      condition: {
        kind: "event",
        event: "treated",
        actor: "worker-11",
        target: "worker-10",
        count: 1,
      },
    },
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `fed-${index}`,
      description: `Worker ${index} is not starving`,
      condition: {
        kind: "need" as const,
        actor: `worker-${index}`,
        need: "hunger",
        maximum: 70,
      },
    })),
    {
      id: "food",
      description: "Retain at least ten meal units across the site",
      condition: { kind: "stock", materialId: "plant-food", minimum: 10 },
    },
  ],
  failures: Array.from({ length: 12 }, (_, index) => ({
    id: `down-${index}`,
    description: `Worker ${index} incapacitated`,
    condition: {
      kind: "acting" as const,
      actor: `worker-${index}`,
      value: false,
    },
  })),
};
