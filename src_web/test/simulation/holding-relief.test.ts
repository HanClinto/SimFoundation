import fs from "node:fs";
import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../src/adapters/cli/Console";
import {
  restoreSession,
  stepSession,
} from "../../src/application/ScenarioSession";
import type { Facility } from "../../src/simulation/core/entity/Facility";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import { secureContainment } from "../../src/simulation/core/entity/Containment";

function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(
      /^rejected|Advanced.*(?:blocked|Blocked|failed|1000-tick limit)/,
    );
    c = result.console;
  }
  return c;
}
function held() {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/containment-cycle.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  return play(openConsole(), lines.slice(0, lines.indexOf("inspect holding")));
}
const holding = (c: ConsoleState) =>
  c.session.state.sites["site-1"]!.entities["site-1:holding"] as Facility;

it.each([
  ["ben", "casey"],
  ["casey", "ben"],
])(
  "two-worker duty shares one physical source regardless of assignment order %s/%s",
  (first, second) => {
    let c = play(held(), [
      `assign ${first} holding`,
      `assign ${second} holding`,
    ]);
    const restored = restoreSession(JSON.stringify(c.session))!;
    expect(stepSession(restored, 200)).toEqual(stepSession(c.session, 200));
    c = play(c, ["step 200"]);
    const service = holding(c).service!;
    const receipts = service.history.filter(
      (entry) => entry.kind === "service",
    );
    expect(receipts).toHaveLength(3);
    expect(
      c.session.state.sites["site-1"]!.entities["site-1:power-units"]!.amount,
    ).toBe(0);
    for (let i = 1; i < receipts.length; i++)
      expect(receipts[i]!.tick - receipts[i - 1]!.tick).toBeGreaterThanOrEqual(
        service.interval - service.leadTime,
      );
    expect(
      c.session.state.sites["site-1"]!.entities["site-13:specimen"]!.location,
    ).toEqual({ kind: "carried", carrierId: holding(c).id });
  },
);

it("physically relieves a real worker while another takes over the existing containment duty", () => {
  let c = play(held(), [
    "assign ben holding",
    "assign casey holding",
    "step 35",
    "assign ben none",
    "autonomy ben off",
    "finish ben",
    "finish casey",
    "step 1",
    "prepare support ben",
    "finish ben",
    "send support ben",
    "finish ben",
  ]);
  const departedAt = c.session.state.tick;
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 95)).toEqual(stepSession(c.session, 95));
  c = play(c, ["step 95"]);
  const receipts = holding(c).service!.history.filter(
    (entry) => entry.kind === "service",
  );
  expect(
    receipts.some(
      (entry) => entry.actorId === "site-1:casey" && entry.tick > departedAt,
    ),
  ).toBe(true);
  expect(
    c.session.state.sites[c.session.campaign!.siteIds.support!]!.entities[
      "site-1:ben"
    ],
  ).toBeDefined();
  expect(
    (c.session.state.sites["site-1"]!.entities["site-1:casey"] as Pawn)
      .serviceDuty,
  ).toBe(holding(c).id);
  expect(secureContainment(holding(c), c.session.state.tick)).toBe(true);
});
