import fs from "node:fs";
import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";

function play(c: ConsoleState, commands: readonly string[]) {
  for (const line of commands) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    c = result.console;
  }
  return c;
}

it("stops targeted work at a new remote critical event and does not replay old alarms", () => {
  const c = play(openConsole(), ["order alex wait 120"]);
  const restored = restoreSession(JSON.stringify(c.session))!;
  const alarm = executeLine(c, "finish --alarms alex");
  expect(alarm.console.session.state.tick).toBe(60);
  expect(alarm.alarm).toMatchObject({
    entityId: "site-12:rowan",
    kind: "warning",
    tick: 60,
  });
  expect(alarm.output).toContain("ALARM at tick 60");
  expect(
    executeLine({ ...c, session: restored }, "finish --alarms alex"),
  ).toEqual(alarm);
  const next = executeLine(alarm.console, "finish --alarms alex");
  expect(next.console.session.state.tick).toBe(80);
  const ordinary = executeLine(c, "finish alex");
  expect(ordinary.console.session.state.tick).toBe(120);
  expect(ordinary.output).toContain("Watched commitments finished.");
  expect(ordinary.output).toContain("site-12:rowan died");
  expect(ordinary.output).toContain("finish --alarms");
  expect(ordinary.alarm).toBeUndefined();
});

it("bounds reported full-tick alarms without losing early high-severity events beyond saved history", () => {
  const c = openConsole();
  const home = c.session.state.sites[c.session.campaign!.homeId]!;
  const source = home.entities["site-1:alex"];
  if (source?.kind !== "pawn") throw new Error("Expected worker.");
  for (let index = 0; index < 120; index++) {
    const id = `doomed-${String(index).padStart(3, "0")}`;
    home.entities[id] = {
      ...structuredClone(source),
      id,
      name: id,
      queue: [],
      health: {
        wounds: [{ id: "critical", severity: 150, bleeding: 0 }],
        bloodLoss: 0,
        mortality: { criticalTicks: 0, fatalAfterTicks: 1 },
      },
    };
  }
  const queued = play(c, ["order alex wait 1"]);
  const result = executeLine(queued, "finish alex");
  expect(result.output).toContain("8 of 120");
  expect(result.output).toContain("doomed-000 died");
  expect(result.output).not.toContain("doomed-008 died");
  expect(
    result.console.session.events.some(
      (event) => event.entityId === "doomed-000",
    ),
  ).toBe(false);
  expect(executeLine(queued, "finish --alarms alex").alarm).toMatchObject({
    kind: "died",
    entityId: "doomed-000",
  });
});

it("surfaces the actually reproduced distant watch-loss casualty while a local worker sleeps", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/quests/scp173/tests/watch-maintenance.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = play(openConsole(), lines.slice(0, lines.indexOf("status") + 1));
  c = play(c, [
    "order riley watch subject 300",
    "step 1",
    "step 130",
    "relieve alex riley",
    "order alex door gate open",
    "finish alex",
    "prepare home alex",
    "finish alex",
    "send home alex",
    "finish alex",
    "site home",
    "order alex eat meals",
    "finish alex",
    "order alex sleep bed",
  ]);
  const guarded = executeLine(c, "finish --alarms alex");
  const reserveId = c.session.campaign!.siteIds.reserve!;
  const annexId = c.session.campaign!.siteIds.statue!;
  expect(guarded.alarm).toMatchObject({
    kind: "warning",
    entityId: `${reserveId}:riley`,
  });
  const riley =
    guarded.console.session.state.sites[annexId]!.entities[
      `${reserveId}:riley`
    ];
  if (riley?.kind !== "pawn")
    throw new Error("Expected actual remote watcher.");
  expect(riley.health!.death).toBeUndefined();
  const ordinary = executeLine(c, "finish alex");
  expect(ordinary.output).toContain("Watched commitments finished.");
  expect(ordinary.output).toContain(`${reserveId}:riley died`);
  const lost =
    ordinary.console.session.state.sites[annexId]!.entities[riley.id];
  expect(lost).toMatchObject({
    health: { death: { cause: "critical-trauma" } },
  });
  expect(guarded.console.session.state.tick).toBeLessThan(
    ordinary.console.session.state.tick,
  );
});

it("rejects malformed flags and advances no time when there is no selected work", () => {
  const c = openConsole();
  const before = JSON.stringify(c);
  for (const line of [
    "finish --alarms",
    "finish --wrong alex",
    "finish alex --alarms",
  ])
    expect(() => executeLine(c, line)).toThrow("Use finish");
  expect(JSON.stringify(c)).toBe(before);
  const result = executeLine(c, "finish --alarms alex");
  expect(result.console.session.state.tick).toBe(0);
  expect(result.alarm).toBeUndefined();
  expect(result.output).toContain("No time advanced.");
});
