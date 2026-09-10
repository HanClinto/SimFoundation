import type { Quest } from "../../../core/quest/Quest";

export const DailyLifeTrial: Quest = {
  id: "daily",
  name: "Sustainable daily life",
  deadline: 400,
  objectives: [
    {
      id: "duration",
      description: "Run for at least 300 ticks",
      condition: { kind: "elapsed", ticks: 300 },
    },
    {
      id: "food",
      description: "Retain at least one meal unit",
      condition: { kind: "amount", entity: "meals", minimum: 1 },
    },
    ...(["research", "sleep", "relax", "exercise", "eat"] as const).map(
      (action) => ({
        id: action,
        description: `Complete ${action}`,
        condition: {
          kind: "event" as const,
          event: "completed" as const,
          actor: "researcher",
          action,
          count: 1,
        },
      }),
    ),
  ],
  failures: [
    {
      id: "down",
      description: "Researcher incapacitated",
      condition: { kind: "acting", actor: "researcher", value: false },
    },
  ],
};
