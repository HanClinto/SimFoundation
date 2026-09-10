import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { FieldAgent } from "./FieldAgent";

export const CareRecipient: EntityTemplate = {
  id: "care-recipient",
  name: "Mira",
  description:
    "A cooperative adult awaiting transfer from a closing aid station. Accepts walking escort, not arbitrary direct orders. A small untreated wound continues bleeding; stabilize it with a medic before the trip. Home admission starts ordinary bed rest without erasing injury or blood loss. Original scenario, not an SCP article character.",
  defaults: {
    ...FieldAgent.defaults,
    playerControllable: false,
    acceptsEscort: true,
    autonomy: false,
    health: {
      wounds: [{ id: "laceration", severity: 10, bleeding: 0.1 }],
      bloodLoss: 0,
    },
    needs: {
      ...FieldAgent.defaults.needs,
      fatigue: { value: 70, increasePerTick: 0.1 },
    },
  },
};
