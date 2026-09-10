import type { Quest } from "../../../core/quest/Quest";

export const ResponseTrial: Quest = {
  id: "response",
  name: "Threat and casualty response",
  deadline: 40,
  objectives: [
    {
      id: "attack",
      description: "Soldier attacks the threat",
      condition: {
        kind: "event",
        event: "attacked",
        actor: "soldier",
        target: "threat",
        count: 1,
      },
    },
    {
      id: "withdraw",
      description: "Researcher withdraws from danger",
      condition: {
        kind: "event",
        event: "fled",
        actor: "researcher",
        count: 1,
      },
    },
    {
      id: "separation",
      description: "Researcher reaches at least five tiles of separation",
      condition: {
        kind: "distance",
        first: "researcher",
        second: "threat",
        minimum: 5,
      },
    },
    {
      id: "care",
      description: "Medic treats the wounded staff member",
      condition: {
        kind: "event",
        event: "treated",
        actor: "medic",
        target: "patient",
        count: 1,
      },
    },
  ],
  failures: [
    {
      id: "soldier-down",
      description: "Soldier incapacitated",
      condition: { kind: "acting", actor: "soldier", value: false },
    },
    {
      id: "civilian-down",
      description: "Researcher incapacitated",
      condition: { kind: "acting", actor: "researcher", value: false },
    },
  ],
};
