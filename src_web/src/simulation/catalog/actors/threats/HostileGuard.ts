import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { FieldAgent } from "../staff/FieldAgent";

export const HostileGuard = {
  id: "hostile-guard",
  name: "Hostile guard",
  description:
    "A stationary hostile pawn who can strike adjacent opponents. Used to exercise observed threat responses without a chase or weapon simulation.",
  defaults: {
    ...FieldAgent.defaults,
    mobile: false,
    playerControllable: false,
    needs: {},
    response: {
      faction: "hostile",
      hostileTo: ["site"],
      sight: 8,
      threat: "confront",
      attack: { damage: 8, windup: 3 },
    },
  },
} satisfies EntityTemplate;
