import { expect, it } from "vitest";
import {
  loadScenario,
  stepSession,
  restoreSession,
  type ScenarioSession,
} from "../../../../src/application/ScenarioSession";
import { finish, deliver } from "../play";
import { damageIntegrity } from "../../../../src/simulation/core/entity/Consumption";
import type { Facility } from "../../../../src/simulation/core/entity/Facility";
import type { Pawn } from "../../../../src/simulation/core/entity/pawn/Pawn";

function recoverAndObserve(session: ScenarioSession): ScenarioSession {
  let result = deliver(session, "handler", "exhibit", 9, 3);
  result = restoreSession(JSON.stringify(result))!;
  return finish(result, "handler", {
    kind: "study",
    targetId: "site-1:station",
    planId: "safe-exhibit",
    workTicks: 0,
  });
}

it("recovers SCP-1370 without combat, observes it and leaves the display secured", () => {
  let session = recoverAndObserve(loadScenario("scp1370"));
  expect(session.quest?.status).toBe("active");
  session = finish(session, "handler", {
    kind: "move",
    destination: { x: 2, y: 3 },
  });
  session = stepSession(session, 2);
  expect(session.quest?.status).toBe("succeeded");
  const site = session.state.sites["site-1"]!;
  expect(site.entities["site-1:exhibit"]).toMatchObject({
    kind: "pawn",
    definitionId: "scp-1370",
    integrity: 100,
    canAct: true,
    location: { kind: "ground", position: { x: 9, y: 3 } },
  });
  expect((site.entities["site-1:handler"] as Pawn).health!.wounds).toEqual([]);
  expect(site.entities["site-1:door"]).toMatchObject({ open: false });
  expect(
    (site.entities["site-1:station"] as Facility).study!.findings[0]!.sourceIds,
  ).toEqual(["site-1:exhibit"]);
  expect(session.events.some((event) => event.kind === "attacked")).toBe(false);
});

it("does not pass when the recovered display is left unsecured", () => {
  let session = loadScenario("scp1370");
  const door = session.state.sites["site-1"]!.entities["site-1:door"]!;
  if (door.kind !== "door") throw new Error("Expected door");
  door.open = true;
  door.policy = "held-open";
  session = recoverAndObserve(session);
  session = finish(session, "handler", {
    kind: "move",
    destination: { x: 2, y: 3 },
  });
  session = stepSession(session, 140);
  expect(session.quest).toMatchObject({
    status: "failed",
    reason: "Deadline reached with incomplete objectives.",
  });
  expect(
    (session.state.sites["site-1"]!.entities["site-1:station"] as Facility)
      .study!.findings,
  ).toHaveLength(1);
});

it("damage is failure, not a shortcut for subduing a harmless exhibit", () => {
  const session = loadScenario("scp1370");
  damageIntegrity(
    session.state.sites["site-1"]!.entities["site-1:exhibit"]!,
    1,
  );
  expect(stepSession(session, 1).quest).toMatchObject({
    status: "failed",
    reason: "SCP-1370 was lost or damaged",
  });
});
