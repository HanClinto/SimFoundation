import { expect, it } from "vitest";
import {
  loadScenario,
  stepSession,
  restoreSession,
} from "../../../../src/application/ScenarioSession";
import { deliver, finish, order } from "../play";
import type { Facility } from "../../../../src/simulation/core/entity/Facility";
import { damageIntegrity } from "../../../../src/simulation/core/entity/Consumption";

it("recovers Blackwood's evidence and corroborates it against two independent records through physical study", () => {
  let session = loadScenario("scp1867");
  const initial = JSON.stringify(session);
  expect(session.quest?.status).toBe("active");
  const original = session;
  session = deliver(session, "investigator", "specimen", 3, 5);
  session = restoreSession(JSON.stringify(session))!;
  session = deliver(session, "investigator", "journal", 3, 3);
  expect(session.quest?.status).toBe("active");
  session = order(session, "investigator", {
    kind: "study",
    targetId: "site-1:bench",
    planId: "marsh-lead",
    workTicks: 0,
  });
  session = stepSession(session, 3);
  const restored = restoreSession(JSON.stringify(session))!;
  const result = stepSession(session, 20);
  expect(stepSession(restored, 20)).toEqual(result);
  expect(result.quest?.status).toBe("succeeded");
  const bench = result.state.sites["site-1"]!.entities[
    "site-1:bench"
  ] as Facility;
  expect(bench.study!.findings).toHaveLength(1);
  expect(bench.study!.findings[0]!.sourceIds.sort()).toEqual([
    "site-1:journal",
    "site-1:lab",
    "site-1:specimen",
    "site-1:survey",
  ]);
  expect(bench.study!.findings[0]!.actorId).toBe("site-1:investigator");
  expect(bench.study!.findings[0]!.text).toContain("Kestrel Marsh");
  expect(
    result.state.sites["site-1"]!.entities["site-1:device"]!.location,
  ).toEqual({ kind: "ground", position: { x: 11, y: 2 } });
  expect(JSON.stringify(original)).toBe(initial);
  const repeated = finish(result, "investigator", {
    kind: "study",
    targetId: "site-1:bench",
    planId: "marsh-lead",
    workTicks: 0,
  });
  expect(
    (repeated.state.sites["site-1"]!.entities["site-1:bench"] as Facility)
      .study!.findings,
  ).toHaveLength(1);
});

it("cannot substitute an unrelated object for independent corroboration", () => {
  let session = loadScenario("scp1867");
  session.state.sites["site-1"]!.entities["site-1:survey"]!.definitionId =
    "unverified-device";
  session = deliver(session, "investigator", "journal", 3, 3);
  session = deliver(session, "investigator", "specimen", 3, 5);
  session = order(session, "investigator", {
    kind: "study",
    targetId: "site-1:bench",
    planId: "marsh-lead",
    workTicks: 0,
  });
  session = stepSession(session, 180);
  expect(session.quest).toMatchObject({
    status: "failed",
    reason: "Deadline reached with incomplete objectives.",
  });
  expect(
    (session.state.sites["site-1"]!.entities["site-1:bench"] as Facility).study!
      .findings,
  ).toEqual([]);
});

it("fails specifically when essential physical evidence is damaged", () => {
  const session = loadScenario("scp1867");
  damageIntegrity(
    session.state.sites["site-1"]!.entities["site-1:specimen"]!,
    1,
  );
  expect(stepSession(session, 1).quest).toMatchObject({
    status: "failed",
    reason: "Essential evidence lost or damaged: specimen",
  });
});
