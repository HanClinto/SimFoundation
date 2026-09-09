import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { Steel } from "../../materials/Steel";

export const AutomaticSteelDoor = {
  id: "automatic-steel-door",
  name: "Automatic steel door",
  description:
    "Opens when approached by a moving pawn and closes when its surroundings are clear.",
  defaults: {
    kind: "door",
    carryable: false,
    blocksMovement: true,
    materialId: Steel.id,
    amount: 1,
    open: false,
    policy: "automatic",
  },
} satisfies EntityTemplate;
