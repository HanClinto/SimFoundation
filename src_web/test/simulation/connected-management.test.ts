import fs from "node:fs";
import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";
import { opportunityBlocker } from "../../src/simulation/catalog/campaign/Campaign";

const lines = fs
  .readFileSync(
    new URL(
      "../../src/simulation/catalog/campaign/tests/connected-management.txt",
      import.meta.url,
    ),
    "utf8",
  )
  .split(/\r?\n/);

function command(console: ConsoleState, line: string) {
  const result = executeLine(console, line);
  expect(result.output, line).not.toMatch(
    /^rejected|Advanced.*(?:[Bb]locked|failed|interrupted|1000-tick limit)/,
  );
  return result.console;
}

it("manages care, evidence, resupply and group evacuation in one saved ongoing campaign", () => {
  let console = openConsole();
  let replay = openConsole();
  for (const line of lines) {
    console = command(console, line);
    replay = command(replay, line);
    expect(replay, line).toEqual(console);
    if (line.startsWith("send ") || line.startsWith("admit "))
      replay = {
        ...replay,
        session: restoreSession(JSON.stringify(replay.session))!,
      };
    const owners = [
      ...Object.values(console.session.state.sites),
      ...Object.values(console.session.state.transfers),
    ];
    const ids = owners.flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size, line).toBe(ids.length);
  }
  const { state, campaign } = console.session;
  expect(state.transfers).toEqual({});
  expect(opportunityBlocker(state, campaign!, "kestrel")).toBeNull();
  expect(Object.keys(campaign!.admissions).sort()).toEqual([
    "site-11:eli",
    "site-11:nora",
    "site-5:mira",
  ]);
  expect(state.sites["site-1"]!.entities["site-4:spares"]!.amount).toBe(3);
  expect(state.sites["site-1"]!.entities["site-1:clinical-packs"]!.amount).toBe(
    3,
  );
  expect(state.sites["site-1"]!.entities["site-2:journal"]).toBeDefined();
  expect(state.sites["site-1"]!.entities["site-2:specimen"]).toBeDefined();
  expect(state.sites["site-4"]!.entities["site-1:kit"]).toBeDefined();
  expect(
    state.sites["site-11"]!.entities["site-11:clinical-pack"]!.amount,
  ).toBe(1);
  expect(state.sites["site-11"]!.entities["site-11:shelter"]!.integrity).toBe(
    40,
  );
  expect(state.tick).toBeGreaterThan(200);
});
