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
import { entities, materials } from "../../../../src/simulation/catalog";
import type { Pawn } from "../../../../src/simulation/core/entity/pawn/Pawn";
import { ConsumptionTrial } from "../../../../src/simulation/catalog/quests/consumption/quest";
import {
  createSimulation,
  advanceSimulation,
} from "../../../../src/simulation/core/Simulation";
import { instantiateSite } from "../../../../src/simulation/core/site/Site";
import {
  startQuest,
  evaluateQuest,
} from "../../../../src/simulation/core/quest/Quest";

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
  expect(session.bindings).toEqual({ diner: actor, meal });
  expect(session.quest!.bindings).toEqual(session.bindings);
  expect(restoreSession(JSON.stringify({ ...session, version: 2 }))).toBeNull();
  expect(
    (session.state.sites["site-1"]!.entities[actor] as Pawn).queue,
  ).toEqual([]);
  expect(stepSession(session, 10).quest?.status).toBe("active");
});

it.each([false, true])(
  "reuses unchanged objectives with independently authored actors and food (incapacitated: %s)",
  (incapacitated) => {
    const created = instantiateSite(
      createSimulation(),
      {
        name: "Another meal",
        terrain: ["....", "...."],
        entities: [
          {
            id: "alex",
            definitionId: "researcher",
            location: { kind: "ground", position: { x: 0, y: 0 } },
            overrides: {
              name: "Alex",
              autonomy: false,
              needs: { hunger: { value: 30, increasePerTick: 0 } },
            },
          },
          {
            id: "packed-lunch",
            definitionId: "packaged-meal",
            location: { kind: "ground", position: { x: 1, y: 0 } },
            overrides: { amount: 2 },
          },
        ],
      },
      entities,
    );
    const dinerId = `${created.siteId}:alex`;
    const foodId = `${created.siteId}:packed-lunch`;
    let state = created.state;
    let progress = startQuest(ConsumptionTrial, created.siteId, state.tick, {
      diner: dinerId,
      meal: foodId,
    });
    if (incapacitated)
      (
        state.sites[created.siteId]!.entities[dinerId] as Pawn
      ).health!.bloodLoss = 100;
    else {
      const result = executeCommand(
        state,
        {
          kind: "enqueue",
          siteId: created.siteId,
          entityId: dinerId,
          action: { kind: "eat", targetId: foodId },
        },
        materials,
      );
      expect(result.code).toBe("accepted");
      state = result.state;
    }
    for (let tick = 0; tick < 40 && progress.status === "active"; tick++) {
      const next = advanceSimulation(state, materials);
      state = next.state;
      progress = evaluateQuest(ConsumptionTrial, progress, state, next.events);
    }
    expect(progress).toMatchObject({
      status: incapacitated ? "failed" : "succeeded",
      reason: incapacitated
        ? "The diner is incapacitated"
        : "All objectives satisfied.",
    });
    expect(state.sites[created.siteId]!.entities[foodId]!.amount).toBeCloseTo(
      incapacitated ? 2 : 1,
    );
  },
);

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
