import { expect, it } from "vitest";
import {
  loadScenario,
  stepSession,
} from "../../../../src/application/ScenarioSession";
import { replayTranscript } from "../../../quest-transcript";
import { damageIntegrity } from "../../../../src/simulation/core/entity/Consumption";
import type { Facility } from "../../../../src/simulation/core/entity/Facility";
import type { Pawn } from "../../../../src/simulation/core/entity/pawn/Pawn";

it("recovers SCP-1370 without combat, observes it and leaves the display secured", () => {
  const { session } = replayTranscript("scp1370", "pass.txt");
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
  const { session } = replayTranscript("scp1370", "fail-unsecured.txt");
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
