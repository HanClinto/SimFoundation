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
import { opportunityBlocker } from "../../src/simulation/catalog/campaign/Campaign";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";

function play(console: ConsoleState, lines: readonly string[]): ConsoleState {
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

const commands = fs
  .readFileSync(
    new URL(
      "../../src/simulation/catalog/campaign/tests/home-loop.txt",
      import.meta.url,
    ),
    "utf8",
  )
  .split(/\r?\n/);

function staff(console: ConsoleState, site: string, name: string): Pawn {
  const entity = console.session.state.sites[site]!.entities[`site-1:${name}`];
  if (entity?.kind !== "pawn") throw new Error("Missing campaign staff.");
  return entity;
}

it("runs the ordinary CLI recovery, home study, unlocked equipment study and finite supply return", () => {
  let console = openConsole();
  expect(console.session.campaign).not.toBeNull();
  expect(executeLine(console, "status").output).toContain(
    "kestrel (site-4): LOCKED",
  );
  expect(() => executeLine(console, "deploy medic extra")).toThrow(
    "before mission start",
  );
  expect(() => executeLine(console, "prepare kestrel alex")).toThrow(
    "Home study required",
  );
  console = play(console, commands);
  const { state, campaign } = console.session;
  const home = state.sites[campaign!.homeId]!;
  const bench = home.entities["site-1:bench"];
  expect(bench).toMatchObject({
    study: {
      findings: [
        {
          planId: "marsh-lead",
          sourceIds: [
            "site-2:journal",
            "site-2:specimen",
            "site-1:survey",
            "site-1:lab",
          ],
        },
      ],
    },
  });
  expect(opportunityBlocker(state, campaign!, "kestrel")).toBeNull();
  expect(state.sites["site-2"]!.entities["site-2:journal"]).toBeUndefined();
  expect(state.sites["site-2"]!.entities["site-2:specimen"]).toBeUndefined();
  expect(home.entities["site-4:dockets"]!.amount).toBe(3);
  expect(home.entities["site-4:rations"]!.amount).toBe(8);
  expect(home.entities["site-1:transport"]!.amount).toBe(2);
  expect(state.sites["site-4"]!.entities["site-1:kit"]).toBeDefined();
  expect(state.sites["site-4"]!.entities["site-4:station"]).toMatchObject({
    study: {
      findings: [{ planId: "depot-survey", sourceIds: ["site-1:kit"] }],
    },
  });
  expect(staff(console, "site-1", "casey").needs.hunger!.value).toBeGreaterThan(
    20,
  );
  const restored = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(restored, 20)).toEqual(stepSession(console.session, 20));
  expect(executeLine(console, "inspect journal").output).toContain(
    '"id": "site-2:journal"',
  );
});

it("partial return and a revisit preserve injury, remaining evidence and current-version transit", () => {
  let console = play(openConsole(), [
    "prepare blackwood alex",
    "step 12",
    "send blackwood alex",
  ]);
  const inTransit = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(inTransit, 8)).toEqual(stepSession(console.session, 8));
  console = play(console, [
    "step 8",
    "site blackwood",
    "order alex take journal",
    "step 20",
    "prepare home alex",
    "step 20",
  ]);
  staff(console, "site-2", "alex").health!.wounds.push({
    id: "old-injury",
    severity: 10,
    bleeding: 0,
  });
  console = play(console, [
    "send home alex",
    "step 8",
    "site home",
    "order alex deliver journal 3 3",
    "step 16",
    "order ben study bench marsh-lead",
    "step 16",
  ]);
  expect(executeLine(console, "queue ben").output).toContain(
    "Bring blackwood-specimen",
  );
  expect(staff(console, "site-1", "alex").health!.wounds).toEqual([
    { id: "old-injury", severity: 10, bleeding: 0 },
  ]);
  expect(
    console.session.state.sites["site-2"]!.entities["site-2:specimen"],
  ).toBeDefined();
  console = play(console, [
    "cancel ben",
    "prepare blackwood alex",
    "step 16",
    "send blackwood alex",
    "step 8",
    "site blackwood",
  ]);
  expect(
    console.session.state.sites["site-2"]!.entities["site-2:journal"],
  ).toBeUndefined();
  expect(
    console.session.state.sites["site-1"]!.entities["site-2:journal"],
  ).toBeDefined();
});

it("spends no docket on failed departure and allows a prepaid return after outbound stock depletion", () => {
  let console = openConsole();
  const stock = () =>
    console.session.state.sites["site-1"]!.entities["site-1:transport"]!;
  expect(() => executeLine(console, "send blackwood alex")).toThrow(
    "loading area",
  );
  expect(stock().amount).toBe(4);
  stock().amount = 1;
  console = play(console, [
    "prepare blackwood alex",
    "step 12",
    "send blackwood alex",
    "step 8",
    "site blackwood",
    "send home alex",
    "step 8",
    "site home",
  ]);
  expect(stock().amount).toBe(0);
  expect(executeLine(console, "status").output).toContain(
    "BLOCKED: no transport docket ready at home pad",
  );
  expect(() => executeLine(console, "send blackwood alex")).toThrow(
    "needs one intact transport docket",
  );
  expect(staff(console, "site-1", "alex")).toBeDefined();
});

it("rejects earlier session versions rather than migrating campaign state", () => {
  const session = openConsole().session;
  expect(restoreSession(JSON.stringify({ ...session, version: 3 }))).toBeNull();
  expect(restoreSession(JSON.stringify(session))).toEqual(session);
});

it("blocked arrival retains one transit owner and resumes when home staff clear the pad", () => {
  let console = play(openConsole(), [
    "prepare blackwood alex",
    "step 12",
    "send blackwood alex",
    "step 8",
    "order casey move 2 7",
    "step 12",
    "site blackwood",
    "send home alex",
    "step 8",
  ]);
  expect(executeLine(console, "status").output).toContain(
    "BLOCKED: The destination is occupied.",
  );
  expect(
    console.session.state.transfers["transfer-2"]!.entities["site-1:alex"],
  ).toBeDefined();
  const restored = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(restored, 3)).toEqual(stepSession(console.session, 3));
  console = play(console, ["site home", "order casey move 4 7", "step 4"]);
  expect(console.session.state.transfers).toEqual({});
  expect(staff(console, "site-1", "alex")).toBeDefined();
});

it("recovers SCP-1370 through shared transit into the home display without deploying another identity", () => {
  const console = play(openConsole(), [
    "prepare gallery alex",
    "step 12",
    "send gallery alex",
    "step 6",
    "site gallery",
    "order alex take exhibit",
    "step 12",
    "prepare home alex",
    "step 12",
    "send home alex",
    "step 6",
    "site home",
    "order alex deliver exhibit 13 3",
    "step 24",
    "order alex study display safe-exhibit",
    "step 8",
    "order alex move 8 6",
    "step 16",
  ]);
  const home = console.session.state.sites["site-1"]!;
  expect(home.entities["site-3:exhibit"]).toMatchObject({
    kind: "pawn",
    definitionId: "scp-1370",
    integrity: 100,
    location: { kind: "ground", position: { x: 13, y: 3 } },
  });
  expect(home.entities["site-1:display-door"]).toMatchObject({ open: false });
  expect(home.entities["site-1:display"]).toMatchObject({
    study: {
      findings: [{ planId: "safe-exhibit", sourceIds: ["site-3:exhibit"] }],
    },
  });
  expect(
    console.session.state.sites["site-3"]!.entities["site-3:exhibit"],
  ).toBeUndefined();
  expect(console.session.campaign!.staffIds).toHaveLength(3);
});
