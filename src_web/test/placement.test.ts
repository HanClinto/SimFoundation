import { expect, it, vi } from "vitest";
import { createPlacementSession } from "../src/adapters/browser/placement";
import { createInitialState } from "../src/simulation/state";
import { createController } from "../src/application/controller";
import { laboratoryPlacement } from "../src/adapters/browser/construction-view";
import { cameraPlacement } from "../src/adapters/browser/surveillance-view";

it("pins any footprint and revalidates before committing without knowing the object type", () => {
  const snapshot = { game: createInitialState(), running: false };
  const confirm = vi.fn(() => ({
    accepted: true,
    message: "Queued",
    snapshot,
  }));
  const validate = vi.fn((): string | null => null);
  const session = createPlacementSession({
    label: "Test object",
    origin: { x: 1, y: 1 },
    footprint: (origin) => [{ position: origin }],
    validate,
    confirm,
  });
  session.move({ x: 4.2, y: 5.4 }, true);
  session.move({ x: 10, y: 10 });
  expect(session.preview(snapshot).tiles).toEqual([
    { position: { x: 4, y: 5 } },
  ]);
  validate.mockReturnValue("Occupied");
  expect(session.confirm(snapshot).accepted).toBe(false);
  expect(confirm).not.toHaveBeenCalled();
  validate.mockReturnValue(null);
  expect(session.confirm(snapshot).accepted).toBe(true);
  expect(confirm).toHaveBeenCalledWith({ x: 4, y: 5 });
});

it("lets owning systems supply both building and device placement through the same contract", () => {
  const controller = createController(createInitialState());
  const building = createPlacementSession(laboratoryPlacement(controller));
  expect(building.preview(controller.getSnapshot()).tiles).toHaveLength(63);
  expect(building.confirm(controller.getSnapshot()).accepted).toBe(true);
  expect(building.confirm(controller.getSnapshot()).accepted).toBe(false);
  const camera = createPlacementSession(cameraPlacement(controller));
  expect(camera.preview(controller.getSnapshot()).tiles).toHaveLength(1);
  expect(camera.confirm(controller.getSnapshot()).accepted).toBe(true);
  expect(controller.getSnapshot().game.observations.cameraKits).toBe(2);
  expect(controller.getSnapshot().game.construction.availableMaterials).toBe(
    120,
  );
});
