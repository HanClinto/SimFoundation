import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import { fieldState } from "../../simulation_legacy/expeditions";

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
    cancelCurrentAction(mapId, actorId, key) {
      const result = controller.cancelCurrentAction(mapId, actorId, key);
      return {
        ...result,
        snapshot: fieldSnapshot(result.snapshot) ?? result.snapshot,
      };
    },
    cancelAutomatic(mapId, actorId, key) {
      const result = controller.cancelAutomatic(mapId, actorId, key);
      return {
        ...result,
        snapshot: fieldSnapshot(result.snapshot) ?? result.snapshot,
      };
    },
    queueAction(intent, mode) {
      const result = controller.queueAction(intent, mode);
      return {
        ...result,
        snapshot: fieldSnapshot(result.snapshot) ?? result.snapshot,
      };
    },
    editQueue(mapId, actorId, operation, index, beforeSequence) {
      const result = controller.editQueue(
        mapId,
        actorId,
        operation,
        index,
        beforeSequence,
      );
      return {
        ...result,
        snapshot: fieldSnapshot(result.snapshot) ?? result.snapshot,
      };
    },
    interact(request) {
      const result = controller.interact(request);
      return {
        ...result,
        snapshot: fieldSnapshot(result.snapshot) ?? result.snapshot,
      };
    },
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
