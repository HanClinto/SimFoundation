import { expect, it } from "vitest";
import { createController } from "../src/application/legacy/controller";
import { createInitialState } from "../src/simulation_legacy/state";
import {
  expeditionAssembled,
  fieldState,
} from "../src/simulation_legacy/expeditions";
import {
  expeditionScenario,
  expeditionRecoveryComplete,
} from "../src/simulation_legacy/expedition-site";
import { loadGameState } from "../src/adapters/browser_legacy/game-persistence";
import { actionProgress } from "../src/simulation_legacy/action-progress";
import { findRoute } from "../src/simulation_legacy/world";

it.each([2, 3])(
  "plays the transfer scenario through recovery of %i cases and return using the shared lifecycle",
  (count) => {
    const scenario = expeditionScenario("notice-records-transfer");
    const controller = createController(createInitialState());
    const team = ["person-caleb-ward", "person-lena-ortiz"];
    expect(controller.enlistExpedition(scenario.noticeId, team).code).toBe(
      "accepted",
    );
    for (
      let tick = 0;
      tick < 180 && !expeditionAssembled(controller.getSnapshot().game);
      tick++
    )
      controller.advance();
    expect(controller.dispatchExpedition().code).toBe("accepted");
    const departing = controller.getSnapshot().game;
    expect(departing.expeditions.active!.arrivesAt! - departing.tick).toBe(12);
    controller.advance(scenario.travelMinutes);
    const active = controller.getSnapshot().game.expeditions.active!;
    expect(active.phase).toBe("field");
    expect(active.site!.world.map).toMatchObject({ width: 16, height: 14 });
    expect(active.site!.combat.adversary).toBeNull();
    expect(fieldState(controller.getSnapshot().game)!.siteName).toBe(
      scenario.siteName,
    );
    const initialAmmo = active.site!.combat.responders[team[0]!]!.ammunition;
    const checkSave = () => {
      const state = controller.getSnapshot().game;
      const loaded = loadGameState({
        getItem: () => JSON.stringify(state),
        setItem: () => {},
      });
      expect(loaded.status).toBe("loaded");
      if (loaded.status !== "loaded") throw new Error("Scenario save rejected");
      return loaded.state;
    };
    checkSave();
    const recovered = scenario.recoveryTargets
      .slice(0, count)
      .map((key) => `${active.id}-${key}`);
    for (const [index, objectId] of recovered.entries()) {
      const intent = {
        mapId: active.site!.world.map.id,
        actorId: team[0]!,
        action: "recover" as const,
        targetId: `object:${objectId}`,
      };
      expect(controller.queueAction(intent).reason).toBeNull();
      for (
        let tick = 0;
        tick < 150 &&
        controller
          .getSnapshot()
          .game.expeditions.active!.recoveryOrders.find(
            (order) => order.objectId === objectId,
          )?.phase !== "carrying";
        tick++
      )
        controller.advance();
      const carrying = controller.getSnapshot().game;
      expect(
        carrying.expeditions.active!.recoveryOrders.find(
          (order) => order.objectId === objectId,
        )!.phase,
      ).toBe("carrying");
      const local = fieldState(carrying)!;
      expect(actionProgress(local, team[0]!)!.text).toContain(
        String(
          findRoute(
            local.world.map,
            local.world.positions[team[0]!]!,
            scenario.extraction,
          )!.length,
        ),
      );
      checkSave();
      expect(controller.previewRecallExpedition()).toContain("cargo recovery");
      if (index === 0) {
        const origin = local.world.positions[team[0]!]!;
        expect(
          controller.editQueue(intent.mapId, team[0]!, "cancel").reason,
        ).toBeNull();
        expect(
          fieldState(controller.getSnapshot().game)!.objects.items.find(
            (item) => item.id === objectId,
          )!.location,
        ).toEqual({ kind: "ground", position: origin });
        expect(controller.queueAction(intent).reason).toBeNull();
      }
      for (
        let tick = 0;
        tick < 180 &&
        !controller
          .getSnapshot()
          .game.expeditions.active!.cargo.includes(objectId);
        tick++
      )
        controller.advance();
      expect(controller.getSnapshot().game.expeditions.active!.cargo).toContain(
        objectId,
      );
      expect(
        fieldState(controller.getSnapshot().game)!.objects.items.find(
          (item) => item.id === objectId,
        )!.location,
      ).toEqual({ kind: "ground", position: scenario.extraction });
      checkSave();
    }
    expect(controller.recallExpedition().code).toBe("accepted");
    for (
      let tick = 0;
      tick < 180 && controller.getSnapshot().game.expeditions.active;
      tick++
    )
      controller.advance();
    const returned = checkSave();
    expect(returned.expeditions.active).toBeNull();
    expect(
      returned.expeditions.notices.find(
        (notice) => notice.id === scenario.noticeId,
      )!.status,
    ).toBe(count === 3 ? "resolved" : "available");
    const history = returned.expeditions.history.at(-1)!;
    expect(history.cargo).toEqual(recovered);
    expect(
      expeditionRecoveryComplete(history.noticeId, history.id, history.cargo),
    ).toBe(count === 3);
    expect(returned.combat.responders[team[0]!]!.ammunition).toBe(initialAmmo);
    for (const objectId of recovered)
      expect(
        returned.objects.items.filter((item) => item.id === objectId),
      ).toHaveLength(1);
    const replay = createController(returned);
    controller.advance(2);
    expect(replay.advance(2)).toEqual(controller.getSnapshot());
  },
);

it("requires declared object identities, not an arbitrary cargo count", () => {
  expect(
    expeditionRecoveryComplete("notice-depot", "expedition-1", [
      "wrong-a",
      "wrong-b",
    ]),
  ).toBe(false);
  expect(
    expeditionRecoveryComplete("notice-records-transfer", "expedition-1", [
      "expedition-1-case-a",
      "expedition-1-case-b",
    ]),
  ).toBe(false);
});
