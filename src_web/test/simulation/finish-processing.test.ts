import fs from "node:fs";
import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";

const lines = fs
  .readFileSync(
    new URL(
      "../../src/simulation/catalog/quests/scp914/tests/independent-cycle.txt",
      import.meta.url,
    ),
    "utf8",
  )
  .split(/\r?\n/);
function active() {
  let c = openConsole();
  for (const line of lines.slice(0, lines.indexOf("inspect machine"))) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    c = result.console;
  }
  return c;
}
function machine(c: ConsoleState) {
  const siteId = c.session.campaign!.siteIds.clockwork!;
  const entity = c.session.state.sites[siteId]!.entities[`${siteId}:machine`];
  if (entity?.kind !== "facility" || !entity.processor)
    throw new Error("Expected apparatus.");
  return entity;
}

it("finishes only the current machine run without creating operator work, with exact replay", () => {
  const c = active();
  const due = machine(c).processor!.current!.completesAt;
  const runId = machine(c).processor!.current!.id;
  const restored = restoreSession(JSON.stringify(c.session))!;
  const result = executeLine(c, "finish machine");
  expect(result.output).toContain("Watched commitments finished.");
  expect(result.console.session.state.tick).toBe(due);
  expect(machine(result.console).processor!.current).toBeNull();
  expect(
    result.console.session.state.sites[c.siteId]!.entities[`${runId}:output`],
  ).toBeDefined();
  expect(
    result.console.session.state.sites[c.siteId]!.entities["site-1:alex"],
  ).toMatchObject({ queue: [] });
  expect(executeLine({ ...c, session: restored }, "finish machine")).toEqual(
    result,
  );
  const idle = executeLine(result.console, "finish machine");
  expect(idle.console.session.state.tick).toBe(due);
  expect(idle.output).toContain("No time advanced.");
});

it("combines existing device work with actual operator transit while preserving selected-site authority", () => {
  let c = active();
  for (const line of ["prepare home alex", "finish alex", "send home alex"])
    c = executeLine(c, line).console;
  const result = executeLine(c, "finish machine alex");
  expect(result.console.siteId).toBe(c.siteId);
  expect(result.console.session.state.transfers).toEqual({});
  expect(
    result.console.session.state.sites["site-1"]!.entities["site-1:alex"],
  ).toBeDefined();
  expect(machine(result.console).processor!.current).toBeNull();
  expect(() => executeLine(result.console, "order alex wait 1")).toThrow(
    "Unknown entity",
  );
});

it("stops at a device output blocker and reports the same existing blocker on another wait", () => {
  let c = active();
  c = executeLine(c, "order alex move 8 3").console;
  c = executeLine(c, "finish alex").console;
  const blocked = executeLine(c, "finish machine");
  expect(blocked.output).toContain("Blocked processing");
  expect(blocked.output).toContain("Clear the output port");
  expect(machine(blocked.console).processor!.current).not.toBeNull();
  expect(executeLine(blocked.console, "finish machine").output).toContain(
    "Blocked processing",
  );
  const alarm = executeLine(c, "finish --alarms machine");
  expect(alarm.alarm).toMatchObject({
    kind: "warning",
    entityId: machine(c).id,
  });
});

it("does not capture a successor cycle started later in the completion tick", () => {
  const c = active();
  const lab = c.session.state.sites[c.siteId]!;
  const apparatus = machine(c);
  const first = structuredClone(apparatus.processor!.current!);
  const source = lab.entities["site-1:alex"];
  const input = lab.entities["site-1:vest"];
  if (source?.kind !== "pawn" || input?.kind !== "item")
    throw new Error("Expected physical setup.");
  const actor = structuredClone(source);
  source.location = { kind: "ground", position: { x: 1, y: 1 } };
  apparatus.processor!.activationTicks = 1;
  lab.entities["spare-input"] = {
    ...structuredClone(input),
    id: "spare-input",
    location: { kind: "ground", position: { x: 4, y: 3 } },
  };
  const wait = first.completesAt - c.session.state.tick - 1;
  // The normal sorted turn permits collection and a new activation after release.
  lab.entities[`${c.siteId}:n-collector`] = {
    ...structuredClone(actor),
    id: `${c.siteId}:n-collector`,
    name: "collector",
    location: { kind: "ground", position: { x: 7, y: 3 } },
    queue: [
      {
        id: "collector-wait",
        source: "script",
        elapsed: 0,
        blockedReason: null,
        action: { kind: "wait", ticks: wait },
      },
      {
        id: "collect-first",
        source: "script",
        elapsed: 0,
        blockedReason: null,
        action: { kind: "take", targetId: `${first.id}:output` },
      },
    ],
  };
  lab.entities[`${c.siteId}:z-operator`] = {
    ...structuredClone(actor),
    id: `${c.siteId}:z-operator`,
    name: "operator",
    location: { kind: "ground", position: { x: 5, y: 3 } },
    queue: [
      {
        id: "operator-wait",
        source: "script",
        elapsed: 0,
        blockedReason: null,
        action: { kind: "wait", ticks: wait },
      },
      {
        id: "start-next",
        source: "script",
        elapsed: 0,
        blockedReason: null,
        action: {
          kind: "process",
          targetId: apparatus.id,
          recipeId: "coarse",
          inputId: "spare-input",
          workTicks: 0,
        },
      },
    ],
  };
  const result = executeLine(c, "finish machine");
  expect(result.console.session.state.tick).toBe(first.completesAt);
  expect(result.output).toContain("Watched commitments finished.");
  expect(machine(result.console).processor!.current).toMatchObject({
    id: `${apparatus.id}:process-2`,
    recipeId: "coarse",
  });
});
