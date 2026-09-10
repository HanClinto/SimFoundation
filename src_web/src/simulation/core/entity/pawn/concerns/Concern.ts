import type { ActionState } from "../actions/Action";

export interface Concern {
  causeId: string;
  kind: "threat" | "injury";
  urgency: number;
  action: ActionState;
}
