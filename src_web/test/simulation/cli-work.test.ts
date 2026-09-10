import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";

it("finishes existing commitments without guessed ticks and uses actor-scoped carried supply identity", () => {
  let console = openConsole();
  console = executeLine(console, "order alex take meals 2").console;
  const finished = executeLine(console, "finish alex");
  expect(finished.output).toContain("Watched commitments finished.");
  expect(finished.console.session.state.tick).toBeGreaterThan(0);
  console = executeLine(
    finished.console,
    "order alex deliver @held 1 7",
  ).console;
  console = executeLine(console, "finish alex").console;
  expect(
    console.session.state.sites["site-1"]!.entities[
      "site-1:meals:portion-action-1"
    ],
  ).toMatchObject({
    amount: 2,
    location: { kind: "ground", position: { x: 1, y: 7 } },
  });
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:meals"]!.amount,
  ).toBe(6);
});

it("advances all sites but stops on a watched blocker without burning the whole bound", () => {
  let console = openConsole();
  console = executeLine(console, "order alex deliver meals 3 2").console;
  const result = executeLine(console, "finish alex");
  expect(result.output).toContain("blocked: The destination is occupied.");
  expect(result.console.session.state.tick).toBeLessThan(100);
  const patient = result.console.session.state.sites["site-5"]!.entities[
    "site-5:mira"
  ] as Pawn;
  expect(patient.health!.bloodLoss).toBeGreaterThan(0);
});

it("captures multiple workers pending orders but does not wait for future autonomous commitments", () => {
  let console = openConsole();
  for (const line of [
    "order alex wait 2",
    "order alex wait 3",
    "order casey wait 4",
    "autonomy alex on",
  ])
    console = executeLine(console, line).console;
  const result = executeLine(console, "finish alex casey");
  expect(result.output).toContain("Advanced 5 ticks.");
  expect(result.output).toContain("Watched commitments finished.");
  expect(
    (
      result.console.session.state.sites["site-1"]!.entities[
        "site-1:alex"
      ] as Pawn
    ).queue,
  ).toHaveLength(0);
});

it("reports a failed watched identity even when other sites emit later events", () => {
  let console = executeLine(openConsole(), "order alex take meals").console;
  delete console.session.state.sites["site-1"]!.entities["site-1:meals"];
  const result = executeLine(console, "finish alex");
  expect(result.output).toContain(
    "site-1:alex failed: The target is no longer present.",
  );
  expect(result.console.session.state.tick).toBe(1);
});

it("bounds long commitments and replays the same work from a current save", () => {
  const console = executeLine(openConsole(), "order alex wait 1001").console;
  const restored = {
    ...console,
    session: restoreSession(JSON.stringify(console.session))!,
  };
  const result = executeLine(console, "finish alex");
  expect(result.output).toContain("1000-tick limit");
  expect(result.console.session.state.tick).toBe(1000);
  expect(executeLine(restored, "finish alex")).toEqual(result);
});

it("rejects empty carried aliases and missing workers without mutation or a global selection", () => {
  const console = openConsole();
  const before = JSON.stringify(console);
  expect(() => executeLine(console, "order alex drop @held")).toThrow(
    "exactly one",
  );
  expect(() => executeLine(console, "inspect @held")).toThrow("order's worker");
  expect(() => executeLine(console, "finish")).toThrow("finish <worker");
  expect(() => executeLine(console, "finish meals")).toThrow("workers");
  expect(executeLine(console, "finish alex").output).toContain(
    "No time advanced",
  );
  expect(JSON.stringify(console)).toBe(before);
});

it("finishes the linked follower handoff even when that queue starts after the wait begins", () => {
  let console = openConsole();
  for (const line of [
    "prepare care casey",
    "finish casey",
    "send care casey",
    "step 8",
    "site care",
    "order casey treat mira",
    "finish casey",
    "order casey escort mira 2 3",
    "finish casey",
    "send home casey mira",
    "step 8",
    "site home",
    "order casey escort mira 6 2",
    "finish casey",
  ])
    console = executeLine(console, line).console;
  const patient = console.session.state.sites["site-1"]!.entities[
    "site-5:mira"
  ] as Pawn;
  expect(patient.queue).toEqual([]);
  expect(executeLine(console, "admit mira bed").output).toContain("Admitted");
});
