import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import { fieldState } from "../../simulation/expeditions";

export function fieldSnapshot(
  snapshot: ControllerSnapshot,
): ControllerSnapshot | null {
  const game = fieldState(snapshot.game);
  return game
    ? {
        game,
        running:
          snapshot.running &&
          ["field", "regrouping"].includes(
            snapshot.game.expeditions.active!.phase,
          ),
      }
    : null;
}

export function expeditionMapController(
  controller: GameController,
): GameController {
  return {
    ...controller,
    getSnapshot: () =>
      fieldSnapshot(controller.getSnapshot()) ?? controller.getSnapshot(),
    goHere(mapId, personId, destination) {
      const result = controller.goHere(mapId, personId, destination);
      return {
        ...result,
        snapshot: fieldSnapshot(result.snapshot) ?? result.snapshot,
      };
    },
    setDoorPolicy(position, policy) {
      const current = controller.getSnapshot();
      const active = current.game.expeditions.active;
      if (!active) return current;
      const result = controller.setFieldDoorPolicy(active.id, position, policy);
      return fieldSnapshot(result) ?? result;
    },
  };
}
