import type { Quest } from "../../../core/quest/Quest";

export const quest: Quest = {
  id: "scp1370",
  name: "SCP-1370: A place in the gallery",
  deadline: 140,
  briefing:
    "The threatening exhibit has toppled over in the gallery. It is sapient and belligerent, but physically incapable of injuring personnel. Recover it carefully without damage, place it at (9,3) inside the glass display bay, and use the observation station's safe-exhibit study plan. Return to reception and leave the automatic display door closed. The oversized bay is a one-level abstraction of adequate display containment; the mission does not simulate dialogue, container dimensions, power requirements or a combat encounter.",
  sources: [
    {
      title: "SCP-1370",
      author: "Sorts",
      url: "https://scp-wiki.wikidot.com/scp-1370",
      license: "CC BY-SA 3.0",
    },
  ],
  objectives: [
    {
      id: "recover",
      description: "Carefully place SCP-1370 inside the display at (9,3)",
      condition: { kind: "ground-at", entity: "exhibit", x: 9, y: 3 },
    },
    {
      id: "observe",
      description: "Study safe-exhibit at the observation station",
      condition: {
        kind: "finding",
        station: "station",
        planId: "safe-exhibit",
      },
    },
    {
      id: "secure",
      description: "Leave the display door closed",
      condition: { kind: "door-closed", entity: "door" },
    },
    {
      id: "leave",
      description: "Return the handler to the reception tile (2,3)",
      condition: { kind: "ground-at", entity: "handler", x: 2, y: 3 },
    },
  ],
  failures: [
    {
      id: "damage",
      description: "SCP-1370 was lost or damaged",
      condition: { kind: "lost", entity: "exhibit", minimumIntegrity: 100 },
    },
    {
      id: "case-damage",
      description: "The display door was damaged",
      condition: { kind: "lost", entity: "door", minimumIntegrity: 100 },
    },
    {
      id: "down",
      description: "The handler is incapacitated",
      condition: { kind: "acting", actor: "handler", value: false },
    },
  ],
};
