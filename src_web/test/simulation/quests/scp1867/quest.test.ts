import { expect, it } from "vitest";
import {
  loadScenario,
  stepSession,
  deployAgent,
  startSession,
} from "../../../../src/application/ScenarioSession";
import { deliver, finish, order } from "../play";
import { replayTranscript } from "../../../quest-transcript";
import type { Facility } from "../../../../src/simulation/core/entity/Facility";
import { damageIntegrity } from "../../../../src/simulation/core/entity/Consumption";

it("recovers Blackwood's evidence and corroborates it against two independent records through physical study", () => {
  const { session: result } = replayTranscript("scp1867", "pass.txt");
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
  expect(bench.study!.findings[0]!.actorId).toBe("site-1:ben");
  expect(bench.study!.findings[0]!.text).toContain("Kestrel Marsh");
  expect(
    result.state.sites["site-1"]!.entities["site-1:device"]!.location,
  ).toEqual({ kind: "ground", position: { x: 11, y: 2 } });
  const repeated = finish(result, "ben", {
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
  let session = startSession(
    deployAgent(loadScenario("scp1867"), "researcher", "ben"),
  );
  session.state.sites["site-1"]!.entities["site-1:survey"]!.definitionId =
    "unverified-device";
  session = deliver(session, "ben", "journal", 3, 3);
  session = deliver(session, "ben", "specimen", 3, 5);
  session = order(session, "ben", {
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
  const session = startSession(
    deployAgent(loadScenario("scp1867"), "researcher", "ben"),
  );
  damageIntegrity(
    session.state.sites["site-1"]!.entities["site-1:specimen"]!,
    1,
  );
  expect(stepSession(session, 1).quest).toMatchObject({
    status: "failed",
    reason: "Essential evidence lost or damaged: specimen",
  });
});
