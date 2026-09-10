import type { Quest } from "../../../core/quest/Quest";

export const ConsumptionTrial: Quest = {
  id: "consumption",
  name: "A meal for later",
  deadline: 80,
  objectives: [
    {
      id: "fed",
      description: "Satisfy the diner's hunger",
      condition: {
        kind: "need",
        actor: "daniel",
        need: "hunger",
        maximum: 0.001,
      },
    },
    {
      id: "leftovers",
      description: "Leave at least a quarter portion for later",
      condition: { kind: "amount", entity: "meal", minimum: 0.25 },
    },
    {
      id: "ate",
      description: "Finish an eating action on this meal",
      condition: {
        kind: "event",
        event: "completed",
        action: "eat",
        actor: "daniel",
        target: "meal",
        count: 1,
      },
    },
  ],
  failures: [
    {
      id: "incapable",
      description: "The diner is incapacitated",
      condition: { kind: "acting", actor: "daniel", value: false },
    },
  ],
};
