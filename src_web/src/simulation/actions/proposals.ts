import type { Need, Position, QueuedAction } from "../model";

export type ActionRequest =
  | { readonly kind: "move"; readonly destination: Position }
  | { readonly kind: "open"; readonly targetId: string }
  | { readonly kind: "take" | "drop" | "eat"; readonly targetId: string }
  | { readonly kind: "complete" | "wait" }
  | { readonly kind: "blocked"; readonly reason: string };

export type Proposal =
  | {
      readonly kind: "pawn";
      readonly entityId: string;
      readonly needs: Readonly<Record<string, Need>>;
      readonly current: QueuedAction | null;
      readonly request: ActionRequest | null;
    }
  | { readonly kind: "close"; readonly entityId: string };
