import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../../src/adapters/cli/Console";
import {
  restoreSession,
  stepSession,
} from "../../../src/application/ScenarioSession";
import type { ProcessingRun } from "../../../src/simulation/core/entity/Processor";

it("commits actual gear, completes the machine cycle while its operator receives home care, and uses the irreversible output", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../../src/simulation/catalog/quests/scp914/tests/independent-cycle.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = openConsole();
  expect(() => executeLine(c, "prepare clockwork alex")).toThrow(
    "Home study required",
  );
  let run: ProcessingRun | undefined;
  let replayed = false;
  let completedWhileAway = false;
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    expect(result.output, line).not.toMatch(
      /Advanced.*(?:blocked|failed|interrupted|1000-tick limit)/i,
    );
    c = result.console;
    const { state, campaign } = c.session;
    const lab = state.sites[campaign!.siteIds.clockwork!]!;
    const machine = lab.entities[`${lab.id}:machine`];
    if (machine?.kind !== "facility")
      throw new Error("Expected actual machine.");
    if (!run && machine.processor!.current)
      run = structuredClone(machine.processor!.current);
    if (
      run &&
      !replayed &&
      line === "send home alex" &&
      machine.processor!.current
    ) {
      const transfer = Object.values(state.transfers).find(
        (entry) => entry.entities["site-1:alex"],
      )!;
      expect(transfer.entities["site-1:vest"]).toBeUndefined();
      expect(lab.entities["site-1:vest"]).toMatchObject({
        amount: 1,
        location: { kind: "carried", carrierId: machine.id },
      });
      const restored = restoreSession(JSON.stringify(c.session))!;
      expect(stepSession(restored, 10)).toEqual(stepSession(c.session, 10));
      c = { ...c, session: restored };
      replayed = true;
    }
    if (
      run &&
      state.sites[campaign!.homeId]!.entities["site-1:alex"] &&
      lab.entities[`${run.id}:output`]
    )
      completedWhileAway = true;
    const ids = [
      ...Object.values(state.sites),
      ...Object.values(state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size).toBe(ids.length);
  }
  expect(replayed && completedWhileAway).toBe(true);
  expect(run).toMatchObject({
    inputId: "site-1:vest",
    inputCondition: 80,
    actorId: "site-1:alex",
    recipeId: "very-fine",
  });
  const { state, campaign } = c.session;
  const lab = state.sites[campaign!.siteIds.clockwork!]!;
  const home = state.sites[campaign!.homeId]!;
  expect(lab.entities["site-1:vest"]).toMatchObject({
    amount: 0,
    integrity: 80,
    location: { kind: "carried", carrierId: `${lab.id}:machine` },
  });
  expect(home.entities[`${run!.id}:output`]).toMatchObject({
    definitionId: "clockwork-lattice-shell",
    integrity: 0,
    location: { kind: "carried", carrierId: "site-1:alex" },
    equipment: { worn: true, armor: { reduction: 30, wear: 100 } },
    processed: {
      actorId: "site-1:alex",
      inputId: "site-1:vest",
      inputCondition: 80,
      startedTick: run!.startedTick,
      tick: run!.completesAt,
    },
  });
  const alex = home.entities["site-1:alex"];
  if (alex?.kind !== "pawn") throw new Error("Expected returned operator.");
  expect(alex.health!.death).toBeUndefined();
  expect(alex.health!.wounds).toHaveLength(1);
  expect(alex.health!.wounds[0]).toMatchObject({
    severity: 0,
    bleeding: 0,
    recovery: [{ actorId: "site-1:casey" }],
  });
  expect(alex.health!.bloodLoss).toBe(0);
  expect(home.entities["site-13:specimen"]).toMatchObject({
    location: { kind: "carried", carrierId: "site-1:holding" },
  });
  expect(home.entities["site-1:suppressor"]).toMatchObject({
    equipment: { subdual: { charges: 0 } },
  });
  expect(state.transfers).toEqual({});
});
