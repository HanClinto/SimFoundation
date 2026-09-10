import { expect, it } from "vitest";
import { replayTranscript } from "./quest-transcript";
import type { Facility } from "../src/simulation/core/entity/Facility";

it.each([
  ["scp1370", "pass.txt", "succeeded"],
  ["scp1370", "fail-unsecured.txt", "failed"],
  ["scp1867", "pass.txt", "succeeded"],
  ["scp1867", "fail-missing-corroboration.txt", "failed"],
  ["consumption", "pass.txt", "succeeded"],
  ["consumption", "pass-resume.txt", "succeeded"],
  ["consumption", "fail-deadline.txt", "failed"],
])("%s/%s is an executable CLI answer key", (quest, filename, status) => {
  const { session } = replayTranscript(quest, filename);
  expect(session.quest).toMatchObject({
    status,
    reason:
      status === "succeeded"
        ? "All objectives satisfied."
        : "Deadline reached with incomplete objectives.",
  });
  const site = session.state.sites["site-1"]!;
  if (quest === "scp1370") {
    expect(
      (site.entities["site-1:station"] as Facility).study!.findings,
    ).toHaveLength(1);
    expect(site.entities["site-1:door"]).toMatchObject({
      open: status === "failed",
    });
  }
  if (quest === "scp1867") {
    expect(
      (site.entities["site-1:bench"] as Facility).study!.findings,
    ).toHaveLength(status === "succeeded" ? 1 : 0);
    expect(site.entities["site-1:journal"]!.location).toEqual({
      kind: "ground",
      position: { x: 3, y: 3 },
    });
    expect(site.entities["site-1:specimen"]!.location).toEqual({
      kind: "ground",
      position: { x: 3, y: 5 },
    });
  }
  if (quest === "consumption")
    expect(site.entities["site-1:meal"]!.amount).toBeCloseTo(
      status === "succeeded" ? 0.5 : 2,
    );
});
