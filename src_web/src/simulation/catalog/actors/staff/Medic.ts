import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { FieldAgent } from "./FieldAgent";

export const Medic = {
  id: "medic",
  name: "Medic",
  description:
    "Treats visible allied bleeding outside immediate danger. Each stabilized wound consumes one of two carried medical supply charges; treatment does not erase injury or blood loss.",
  defaults: {
    ...FieldAgent.defaults,
    response: {
      ...FieldAgent.defaults.response,
      sight: 10,
      medicine: { ticks: 4, supplies: 2 },
    },
  },
} satisfies EntityTemplate;
