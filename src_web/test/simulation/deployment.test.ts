import { expect, it } from "vitest";
import {
  deployPawn,
  type Deployment,
} from "../../src/simulation/core/site/Deployment";
import { createSimulation } from "../../src/simulation/core/Simulation";
import { entities } from "../../src/simulation/catalog";
import {
  deployAgent,
  loadScenario,
  restoreSession,
  startSession,
  stepSession,
} from "../../src/application/ScenarioSession";
import {
  executeLine,
  openConsole,
  renderMap,
  questStatus,
} from "../../src/adapters/cli/Console";
import {
  conditionMet,
  evaluateQuest,
} from "../../src/simulation/core/quest/Quest";
import { quest } from "../../src/simulation/catalog/quests/scp1370/quest";
import fs from "node:fs";

const deployment: Deployment = {
  entries: { entry: [{ x: 1, y: 0 }] },
  templates: ["field-agent"],
  roles: ["handler"],
  maximumTeam: 2,
};

it("deploys a detached named pawn at an authored entry and rejects collisions", () => {
  const initial = {
    ...createSimulation(),
    sites: {
      site: { id: "site", name: "Site", terrain: ["..."], entities: {} },
    },
  };
  const state = deployPawn(
    initial,
    "site",
    deployment,
    entities,
    "field-agent",
    "alex",
    "entry",
  );
  expect(initial.sites.site.entities).toEqual({});
  expect(state.tick).toBe(0);
  expect(state.sites.site!.entities["site:alex"]).toMatchObject({
    id: "site:alex",
    name: "alex",
    autonomy: false,
    kind: "pawn",
    location: { kind: "ground", position: { x: 1, y: 0 } },
  });
  expect(() =>
    deployPawn(
      state,
      "site",
      deployment,
      entities,
      "field-agent",
      "alex",
      "entry",
    ),
  ).toThrow("already in use");
  expect(() =>
    deployPawn(
      state,
      "site",
      deployment,
      entities,
      "field-agent",
      "other",
      "entry",
    ),
  ).toThrow("occupied");
  expect(() =>
    deployPawn(
      initial,
      "site",
      deployment,
      entities,
      "scp-1370",
      "other",
      "entry",
    ),
  ).toThrow("not available");
  expect(() =>
    deployPawn(
      initial,
      "site",
      deployment,
      entities,
      "field-agent",
      "@2",
      "entry",
    ),
  ).toThrow("alias");
});

it("setup has no predeployed handler or ticking deadline, and start requires a filled role", () => {
  const session = loadScenario("scp1370");
  expect(session.phase).toBe("setup");
  expect(session.quest).toBeNull();
  expect(
    session.state.sites["site-1"]!.entities["site-1:handler"],
  ).toBeUndefined();
  expect(() => stepSession(session, 10)).toThrow("setup");
  expect(() => startSession(session)).toThrow("handler");
  const deployed = deployAgent(session, "medic", "alex");
  expect(deployed.state.tick).toBe(0);
  expect(deployed.labels["site-1:alex"]).toBe("@2");
  expect(session.teamIds).toEqual([]);
  const resumed = restoreSession(JSON.stringify(deployed))!;
  const started = startSession(resumed);
  expect(started.quest).toMatchObject({
    startedTick: 0,
    evaluatedTick: -1,
    bindings: { handler: "site-1:alex" },
  });
  expect(
    conditionMet(
      { kind: "acting", actor: "handler", value: true },
      started.quest!,
      started.state,
      "alive",
    ),
  ).toBe(true);
  const counted = evaluateQuest(
    {
      ...quest,
      failures: [],
      objectives: [
        {
          id: "worked",
          description: "Actor worked",
          condition: {
            kind: "event",
            event: "completed",
            actor: "handler",
            count: 1,
          },
        },
      ],
    },
    started.quest!,
    started.state,
    [{ siteId: "site-1", entityId: "site-1:alex", kind: "completed" }],
  );
  expect(counted.status).toBe("succeeded");
  expect(() => startSession(started)).toThrow("already started");
  expect(() => deployAgent(started, "field-agent", "daniel")).toThrow(
    "before mission start",
  );
});

it("rejects invalid aliases, roles, templates and excess team members without spending a label", () => {
  const session = loadScenario("scp1370");
  const before = JSON.stringify(session);
  expect(() => deployAgent(session, "scp-1370", "alex")).toThrow(
    "not available",
  );
  expect(() => deployAgent(session, "field-agent", "door")).toThrow(
    "already in use",
  );
  expect(() => deployAgent(session, "field-agent", "o1")).toThrow("reserved");
  expect(() => deployAgent(session, "field-agent", "alex", "unknown")).toThrow(
    "role",
  );
  expect(JSON.stringify(session)).toBe(before);
  const first = deployAgent(session, "field-agent", "alex");
  expect(() => deployAgent(first, "field-agent", "ben", "handler")).toThrow(
    "already assigned",
  );
  const second = deployAgent(first, "medic", "ben");
  expect(second.bindings).toEqual(first.bindings);
  expect(second.labels["site-1:ben"]).toBe("@3");
  expect(
    second.state.sites["site-1"]!.entities["site-1:ben"]!.location,
  ).toEqual({ kind: "ground", position: { x: 2, y: 4 } });
  expect(() => deployAgent(second, "soldier", "clint")).toThrow("full");
});

it("pawn labels remain stable after object removal and save/restore, and commands accept them", () => {
  let console = openConsole("scp1370");
  expect(renderMap(console)).toContain("@1 SCP-1370");
  const deployed = executeLine(console, "deploy field-agent alex");
  expect(deployed.output).toContain("Deployed @2 alex");
  console = deployed.console;
  expect(questStatus(console)).toContain("SETUP");
  expect(() => executeLine(console, "move @2 3 3")).toThrow("Start");
  delete console.session.state.sites["site-1"]!.entities["site-1:station"];
  console = {
    ...console,
    session: restoreSession(JSON.stringify(console.session))!,
  };
  expect(executeLine(console, "inspect @2").output).toContain('"name": "alex"');
  expect(renderMap(console)).toContain(".@2");
  console = executeLine(console, "start").console;
  console = executeLine(console, "move @2 3 3").console;
  console = executeLine(console, "step 1").console;
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:alex"]!.location,
  ).toEqual({ kind: "ground", position: { x: 3, y: 3 } });
  expect(() => executeLine(console, "deploy medic daniel")).toThrow(
    "before mission start",
  );
});

it("multi-digit @ labels fit fixed-width map cells and refer to the correct pawn", () => {
  const console = openConsole("colony");
  const map = renderMap(console);
  expect(map).toContain("@10");
  expect(map).toContain("@12");
  const rows = map.split("\n").filter((line) => /^\s*\d+\s+[.#]/.test(line));
  expect(new Set(rows.map((row) => row.length)).size).toBe(1);
  expect(executeLine(console, "inspect @10").output).toContain(
    '"label": "@10"',
  );
});

it("the SCP-1370 quest can be solved by an alternate deployed identity bound to its handler role", () => {
  const transcript = fs.readFileSync(
    new URL(
      "../../src/simulation/catalog/quests/scp1370/tests/pass.txt",
      import.meta.url,
    ),
    "utf8",
  );
  let console = openConsole();
  for (const line of transcript.split(/\r?\n/)) {
    const command = line.startsWith("deploy ")
      ? "deploy medic clint"
      : line.replace(/\balex\b/g, "clint");
    const result = executeLine(console, command);
    expect(result.output).not.toMatch(/^rejected/);
    console = result.console;
  }
  expect(console.session.quest?.status).toBe("succeeded");
  expect(console.session.quest?.bindings.handler).toBe("site-1:clint");
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:handler"],
  ).toBeUndefined();
});
