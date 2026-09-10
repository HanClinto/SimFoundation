import { expect, it } from "vitest";
import {
  loadScenario,
  stepSession,
  restoreSession,
  type ScenarioSession,
} from "../../../../src/application/ScenarioSession";
import {
  executeCommand,
  type Command,
} from "../../../../src/simulation/core/ControlPolicy";
import { materials } from "../../../../src/simulation/catalog";
import type { Pawn } from "../../../../src/simulation/core/entity/pawn/Pawn";

function command(session: ScenarioSession, order: Command): ScenarioSession {
  const result = executeCommand(session.state, order, materials);
  expect(result.code).toBe("accepted");
  return { ...session, state: result.state };
}

const actor = "site-1:daniel";
const meal = "site-1:meal";
const eat: Command = {
  kind: "enqueue",
  siteId: "site-1",
  entityId: actor,
  action: { kind: "eat", targetId: meal },
};

it("the shared gameplay setup is an unsolved challenge, not a registered test answer", () => {
  const session = loadScenario("consumption");
  expect(
    (session.state.sites["site-1"]!.entities[actor] as Pawn).queue,
  ).toEqual([]);
  expect(stepSession(session, 10).quest?.status).toBe("active");
});

it("passes with an ordinary eating order, preserving the unused half portion", () => {
  let session = command(loadScenario("consumption"), eat);
  session = stepSession(session, 1);
  expect(session.quest?.status).toBe("active");
  expect(session.state.sites["site-1"]!.entities[meal]!.amount).toBeCloseTo(
    1.9,
  );
  expect(
    (session.state.sites["site-1"]!.entities[actor] as Pawn).queue[0]!.action
      .kind,
  ).toBe("eat");
  session = stepSession(session, 30);
  expect(session.quest?.status).toBe("succeeded");
  expect(session.state.sites["site-1"]!.entities[meal]!.amount).toBeCloseTo(
    0.5,
  );
});

it("passes after cancelling, leaving, saving, returning and resuming the same meal", () => {
  let session = stepSession(command(loadScenario("consumption"), eat), 3);
  const partial = session.state.sites["site-1"]!.entities[meal]!;
  expect(partial.amount).toBeCloseTo(1.7);
  const actionId = (session.state.sites["site-1"]!.entities[actor] as Pawn)
    .queue[0]!.id;
  session = command(session, {
    kind: "cancel",
    siteId: "site-1",
    entityId: actor,
    actionId,
  });
  session = command(session, {
    kind: "enqueue",
    siteId: "site-1",
    entityId: actor,
    action: { kind: "move", destination: { x: 5, y: 3 } },
  });
  session = stepSession(session, 8);
  expect(session.state.sites["site-1"]!.entities[meal]).toEqual(partial);
  expect(session.quest?.status).toBe("active");
  session = restoreSession(JSON.stringify(session))!;
  const replay = restoreSession(JSON.stringify(session))!;
  session = stepSession(command(session, eat), 30);
  expect(stepSession(command(replay, eat), 30)).toEqual(session);
  expect(session.quest?.status).toBe("succeeded");
  expect(session.state.sites["site-1"]!.entities[meal]).toMatchObject({
    id: meal,
    nutrition: 30,
  });
  expect(session.state.sites["site-1"]!.entities[meal]!.amount).toBeCloseTo(
    0.5,
  );
});

it("fails by deadline when the available material is inedible, without consuming it", () => {
  let session = loadScenario("consumption");
  const food = session.state.sites["site-1"]!.entities[meal]!;
  food.materialId = "steel";
  const rejected = executeCommand(session.state, eat, materials);
  expect(rejected.code).toBe("rejected");
  session = stepSession(session, 80);
  expect(session.quest).toMatchObject({
    status: "failed",
    reason: "Deadline reached with incomplete objectives.",
  });
  expect(session.state.sites["site-1"]!.entities[meal]!.amount).toBe(2);
});

it("fails for the specified casualty condition rather than counting any failure as correct", () => {
  let session = loadScenario("consumption");
  (session.state.sites["site-1"]!.entities[actor] as Pawn).health!.bloodLoss =
    100;
  session = stepSession(session, 1);
  expect(session.quest).toMatchObject({
    status: "failed",
    reason: "The diner is incapacitated",
  });
  expect(
    stepSession(restoreSession(JSON.stringify(session))!, 80).quest,
  ).toEqual(session.quest);
});
