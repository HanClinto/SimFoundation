import fs from "node:fs";
import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../../src/adapters/cli/Console";
import {
  restoreSession,
  stepSession,
} from "../../../src/application/ScenarioSession";

function play(console: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(console, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    console = result.console;
    const ids = [
      ...Object.values(console.session.state.sites),
      ...Object.values(console.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size, line).toBe(ids.length);
  }
  return console;
}

it("retrieves one SCP-507, his own flashlight and a cased original log for home physical review", () => {
  const transcript = fs.readFileSync(
    new URL(
      "../../../src/simulation/catalog/quests/scp507/tests/return-and-review.txt",
      import.meta.url,
    ),
    "utf8",
  );
  const console = play(openConsole(), transcript.split(/\r?\n/));
  const home = console.session.state.sites["site-1"]!;
  expect(home.entities["site-7:tommy"]).toMatchObject({
    definitionId: "scp-507",
    kind: "pawn",
    acceptsEscort: true,
  });
  expect(home.entities["site-7:flashlight"]).toMatchObject({
    location: { kind: "carried", carrierId: "site-7:tommy" },
  });
  expect(home.entities["site-1:case"]!.integrity).toBe(35);
  expect(home.entities["site-7:log"]).toMatchObject({
    location: { kind: "ground", position: { x: 10, y: 4 } },
  });
  expect(home.entities["site-1:review"]).toMatchObject({
    study: {
      findings: [
        {
          planId: "returnee-review",
          sourceIds: ["site-7:tommy", "site-7:log"],
        },
      ],
    },
  });
  expect(console.session.campaign!.admissions["site-7:tommy"]).toMatchObject({
    bedId: "site-1:guest-bed",
  });
  expect(console.session.state.sites["site-7"]!.entities).toEqual({});
  expect(executeLine(console, "inspect tommy").output).toContain(
    "PennywiseTheClown",
  );
});

it("partial living return leaves the original log behind and exposes the missing home review evidence", () => {
  const console = play(openConsole(), [
    "prepare returnee alex",
    "step 12",
    "send returnee alex",
    "step 9",
    "site returnee",
    "order alex escort tommy 2 3",
    "step 30",
    "send home alex tommy",
    "step 9",
    "site home",
    "order alex escort tommy 10 6",
    "step 30",
    "order alex study review returnee-review",
    "step 12",
  ]);
  expect(executeLine(console, "queue alex").output).toContain(
    "Bring returnee-log",
  );
  expect(
    console.session.state.sites["site-7"]!.entities["site-7:log"],
  ).toBeDefined();
  expect(
    console.session.state.sites["site-1"]!.entities["site-7:tommy"],
  ).toBeDefined();
});

it("replays a mixed passenger and nested-case transfer without extra identities or restored wear", () => {
  const console = play(openConsole(), [
    "order alex take case",
    "step 12",
    "prepare returnee alex",
    "step 12",
    "send returnee alex",
    "step 9",
    "site returnee",
    "order alex pack log case",
    "step 20",
    "order alex escort tommy 2 3",
    "step 24",
    "send home alex tommy",
  ]);
  const transfer = Object.values(console.session.state.transfers)[0]!;
  expect(Object.keys(transfer.entities).sort()).toEqual([
    "site-1:alex",
    "site-1:case",
    "site-7:flashlight",
    "site-7:log",
    "site-7:tommy",
  ]);
  const restored = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(restored, 20)).toEqual(stepSession(console.session, 20));
});

it("a consenting admitted returnee can pause an autonomous routine for a later accompanied review", () => {
  let console = play(openConsole(), [
    "prepare returnee alex",
    "step 12",
    "send returnee alex",
    "step 9",
    "site returnee",
    "order alex escort tommy 2 3",
    "step 30",
    "send home alex tommy",
    "step 9",
    "site home",
    "order alex escort tommy 10 3",
    "step 30",
    "admit tommy guest-bed",
    "step 20",
  ]);
  console = play(console, ["order alex escort tommy 10 6"]);
  for (let tick = 0; tick < 40; tick++) {
    console = play(console, ["step"]);
    const leader =
      console.session.state.sites["site-1"]!.entities["site-1:alex"];
    if (leader?.kind === "pawn" && !leader.queue.length) break;
  }
  expect(
    console.session.state.sites["site-1"]!.entities["site-7:tommy"],
  ).toMatchObject({
    acceptsEscort: true,
    location: { kind: "ground", position: { x: 10, y: 6 } },
  });
  expect(console.session.events).toContainEqual(
    expect.objectContaining({
      entityId: "site-1:alex",
      kind: "completed",
      actionKind: "escort",
    }),
  );
});
