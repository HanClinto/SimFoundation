import fs from "node:fs";
import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../src/adapters/cli/Console";

function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    c = result.console;
  }
  return c;
}
function assertReadonly(c: ConsoleState) {
  const before = JSON.stringify(c);
  const result = executeLine(c, "status work");
  expect(JSON.stringify(c)).toBe(before);
  expect(result.console).toBe(c);
  expect(result.output.split("\n").length).toBeLessThanOrEqual(26);
  return result.output;
}

it("shows a compact initial roster without unrelated routes, patients, idle devices or unstarted facilities", () => {
  const c = openConsole();
  const output = assertReadonly(c);
  expect(output).toContain("3 rows");
  expect(output).toContain("@1 alex at site-1: active | idle");
  expect(output).not.toMatch(/kestrel|Rowan|DEVICE|SERVICE|WATCH|LOCKED/);
  expect(executeLine(c, "status").output).toContain("kestrel");
  expect(() => executeLine(c, "status unknown")).toThrow("Use status");
});

it("shows current blocked work and pending count using the same action description", () => {
  const c = play(openConsole(), [
    "order alex study bench marsh-lead",
    "order alex wait 2",
    "finish alex",
  ]);
  const output = assertReadonly(c);
  expect(output).toContain("study marsh-lead at site-1:bench");
  expect(output).toContain("+1 queued");
  expect(output).toContain("BLOCKED: Bring blackwood-journal");
  expect(output).not.toContain("2. pending");
});

it("shows actual worker ownership and blocked transfer rather than inventing map work", () => {
  const c = play(openConsole(), [
    "prepare gallery alex",
    "finish alex",
    "send gallery alex",
  ]);
  c.session.state.sites["site-3"]!.entities["site-3:exhibit"]!.location = {
    kind: "ground",
    position: { x: 2, y: 3 },
  };
  const blocked = executeLine(c, "finish alex").console;
  const output = assertReadonly(blocked);
  expect(output).toContain("alex at transfer-1");
  expect(output).toContain("TRANSIT transfer-1: site-1 -> site-3");
  expect(output).toContain("BLOCKED: The destination is occupied.");
});

it("shows started coverage and actual human watchers without including the rest of the portfolio", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/quests/scp173/tests/watch-maintenance.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  const c = play(openConsole(), lines.slice(0, lines.indexOf("status") + 1));
  const output = assertReadonly(c);
  const annexId = c.session.campaign!.siteIds.statue!;
  expect(output).toContain(`WATCH ${annexId}:subject: 2 human, 0 supplemental`);
  expect(output).toContain("SERVICE site-1:holding:");
  expect(output).toContain(`SERVICE ${annexId}:station:`);
  expect(output).not.toContain("diner");
  expect(output).not.toContain("Finding at");
});

it("shows independent device ownership without making the idle operator appear busy", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/quests/scp914/tests/independent-cycle.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  const c = play(
    openConsole(),
    lines.slice(0, lines.indexOf("inspect machine")),
  );
  const output = assertReadonly(c);
  const labId = c.session.campaign!.siteIds.clockwork!;
  expect(output).toContain(
    `DEVICE ${labId}:machine: very-fine, input site-1:vest, due`,
  );
  expect(output).toContain("alex at");
  expect(output).toContain("| idle");
  expect(output).not.toContain("winding");
});
