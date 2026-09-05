import type { ControllerSnapshot } from "../../application/controller";
import type { TilePosition } from "../../simulation/world";

export interface PlacementTile {
  readonly position: TilePosition;
  readonly entrance?: boolean;
}
export interface PlacementRequest {
  readonly label: string;
  readonly origin: TilePosition;
  readonly footprint: (origin: TilePosition) => readonly PlacementTile[];
  readonly validate: (
    origin: TilePosition,
    snapshot: ControllerSnapshot,
  ) => string | null;
  readonly confirm: (origin: TilePosition) => {
    accepted: boolean;
    message: string;
    snapshot: ControllerSnapshot;
  };
}

export function createPlacementSession(request: PlacementRequest) {
  let origin = { ...request.origin };
  let pinned = false;
  return {
    request,
    get origin() {
      return origin;
    },
    move(position: TilePosition, pin = false) {
      if (pinned && !pin) return;
      origin = { x: Math.round(position.x), y: Math.round(position.y) };
      pinned ||= pin;
    },
    preview(snapshot: ControllerSnapshot) {
      const issue = request.validate(origin, snapshot);
      return { tiles: request.footprint(origin), valid: issue === null, issue };
    },
    confirm(snapshot: ControllerSnapshot) {
      const issue = request.validate(origin, snapshot);
      return issue === null
        ? request.confirm(origin)
        : { accepted: false, message: issue, snapshot };
    },
  };
}
