import { expect, it } from "vitest";
import {
  loadScenario,
  stepSession,
  restoreSession,
} from "../../src/application/ScenarioSession";
import { ResponseTrial } from "../../src/simulation/catalog/quests/ResponseTrial";
import { evaluateQuest } from "../../src/simulation/core/quest/Quest";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import { instantiateEntity } from "../../src/simulation/core/site/EntityPlacement";
import { entities } from "../../src/simulation/catalog";

it.each(["response", "daily"])(
  "the playable %s quest succeeds through its ordinary conditions and replay",
  (name) => {
    const initial = loadScenario(name);
    const midway = stepSession(initial, 3);
    const restored = restoreSession(JSON.stringify(midway))!;
    const count = name === "response" ? 40 : 400;
    const result = stepSession(midway, count);
    expect(result.quest?.status).toBe("succeeded");
    expect(stepSession(restored, count)).toEqual(result);
    expect(initial.state.tick).toBe(0);
  },
);

it("quest failure and timeout are durable, not a special test-only exit", () => {
  const session = loadScenario("response");
  (session.state.sites["site-1"]!.entities["site-1:soldier"] as Pawn).canAct =
    false;
  const failed = stepSession(session, 1);
  expect(failed.quest).toMatchObject({
    status: "failed",
    reason: "Soldier incapacitated",
  });
  expect(stepSession(failed, 40).quest).toEqual(failed.quest);
  const timeout = loadScenario("response");
  for (const entity of Object.values(timeout.state.sites["site-1"]!.entities))
    if (entity.kind === "pawn") entity.autonomy = false;
  expect(stepSession(timeout, 40).quest?.reason).toContain("Deadline");
});

it("evaluating the same tick twice does not count events twice", () => {
  const session = stepSession(loadScenario("response"), 1);
  expect(
    evaluateQuest(ResponseTrial, session.quest!, session.state, session.events),
  ).toEqual(session.quest);
});

it("a populated finite-supply colony recovers after an active target disappears and meets its quest conditions", () => {
  let session = stepSession(loadScenario("colony"), 10);
  const site = session.state.sites["site-1"]!;
  const user = Object.values(site.entities).find(
    (entity) =>
      entity.kind === "pawn" &&
      entity.queue[0] &&
      "targetId" in entity.queue[0].action &&
      entity.queue[0].action.kind !== "eat",
  ) as Pawn | undefined;
  expect(user).toBeDefined();
  const action = user!.queue[0]!.action;
  if (!("targetId" in action)) throw new Error("Expected physical target");
  delete site.entities[action.targetId];
  site.entities.barrier = instantiateEntity(
    {
      id: "barrier",
      definitionId: "bookshelf",
      location: { kind: "ground", position: { x: 10, y: 12 } },
    },
    entities,
  );
  session = stepSession(session, 1);
  expect(session.events).toContainEqual(
    expect.objectContaining({ entityId: user!.id, kind: "failed" }),
  );
  const replay = restoreSession(JSON.stringify(session))!;
  session = stepSession(session, 1090);
  expect(session.quest?.status).toBe("succeeded");
  expect(stepSession(replay, 1090)).toEqual(session);
  for (const entity of Object.values(session.state.sites["site-1"]!.entities)) {
    if (entity.kind === "pawn") {
      expect(entity.canAct).toBe(true);
      expect(entity.queue[0]?.blockedTicks ?? 0).toBeLessThan(8);
    }
  }
}, 60000);

it("failure wins over simultaneous success and missing actors cannot satisfy state objectives", () => {
  const session = loadScenario("response");
  const quest = {
    ...ResponseTrial,
    objectives: [
      {
        id: "now",
        description: "Now",
        condition: { kind: "elapsed" as const, ticks: 0 },
      },
    ],
  };
  (session.state.sites["site-1"]!.entities["site-1:soldier"] as Pawn).canAct =
    false;
  expect(evaluateQuest(quest, session.quest!, session.state, []).status).toBe(
    "failed",
  );
  delete session.state.sites["site-1"]!.entities["site-1:researcher"];
  expect(
    evaluateQuest(
      { ...ResponseTrial, failures: [], deadline: 0 },
      session.quest!,
      session.state,
      [],
    ).status,
  ).toBe("failed");
});

it("discards incompatible CLI saves without migrations", () => {
  for (const text of [
    "bad",
    "null",
    "[]",
    "{}",
    '{"version":1,"simulationVersion":8}',
  ])
    expect(restoreSession(text)).toBeNull();
});
