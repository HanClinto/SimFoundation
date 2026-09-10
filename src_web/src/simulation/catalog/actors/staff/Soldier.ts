import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { FieldAgent } from "./FieldAgent";

export const Soldier = {
  id: "soldier",
  name: "Soldier",
  description:
    "Security staff who confront visible hostiles with a close-range attack. Damage and windup are prototype capability values, not an equipment system.",
  defaults: {
    ...FieldAgent.defaults,
    response: {
      ...FieldAgent.defaults.response,
      sight: 10,
      threat: "confront",
      attack: { damage: 30, windup: 2 },
    },
  },
} satisfies EntityTemplate;
