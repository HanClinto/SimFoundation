import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { FieldAgent } from "./FieldAgent";

export const Researcher = {
  id: "researcher",
  name: "Researcher",
  description:
    "An inquisitive staff member who balances study with recreation, exercise and ordinary care. Curiosity creates motivation to study, not a research qualification or access privilege.",
  defaults: {
    ...FieldAgent.defaults,
    needs: {
      ...FieldAgent.defaults.needs,
      curiosity: { value: 60, increasePerTick: 0.3 },
      restlessness: { value: 20, increasePerTick: 0.2 },
    },
  },
} satisfies EntityTemplate;
