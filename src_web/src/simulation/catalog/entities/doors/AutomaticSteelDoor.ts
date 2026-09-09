import type { EntityDefinition } from "../../../core/entity/Definition";
import { Steel } from "../../materials/Steel";

export const AutomaticSteelDoor = {
  id: "automatic-steel-door",
  name: "Automatic steel door",
  description:
    "Opens when approached by a moving pawn and closes when its surroundings are clear.",
  defaults: {
    kind: "door",
    carryable: false,
    materialId: Steel.id,
    amount: 1,
    open: false,
    policy: "automatic",
  },
} satisfies EntityDefinition;
