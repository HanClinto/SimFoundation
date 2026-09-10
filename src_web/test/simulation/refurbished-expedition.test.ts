import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import {
  restoreSession,
  stepSession,
} from "../../src/application/ScenarioSession";
import { secureContainment } from "../../src/simulation/core/entity/Containment";

it("continues after irreversible processing with actual repair/ammunition deliveries, power retrieval and a prepared next expedition", () => {
  const scripts = [
    "../../src/simulation/catalog/quests/scp914/tests/independent-cycle.txt",
    "../../src/simulation/catalog/campaign/tests/refurbished-expedition.txt",
  ];
  let c = openConsole();
  const blockers: string[] = [];
  let alarmed = false;
  let replayed = false;
  let preview:
    | {
        manifest: {
          id: string;
          equipment?: { subdual?: { charges: number } };
        }[];
      }
    | undefined;
  for (const [index, script] of scripts.entries()) {
    const lines = fs
      .readFileSync(new URL(script, import.meta.url), "utf8")
      .split(/\r?\n/);
    for (const line of lines) {
      const result = executeLine(c, line);
      expect(result.rejected, line).not.toBe(true);
      expect(result.output, line).not.toMatch(
        /Advanced.*(?:failed|interrupted|1000-tick limit)/i,
      );
      if (/^Advanced.*blocked/i.test(result.output)) {
        expect(index).toBe(1);
        blockers.push(result.output);
      }
      c = result.console;
      if (index === 1 && result.alarm) {
        expect(result.alarm).toMatchObject({
          entityId: "site-1:holding",
          kind: "warning",
        });
        const restored = restoreSession(JSON.stringify(c.session))!;
        expect(stepSession(restored, 8)).toEqual(stepSession(c.session, 8));
        c = { ...c, session: restored };
        alarmed = replayed = true;
      }
      if (line === "preview-send blackwood alex")
        preview = JSON.parse(result.output);
      const ids = [
        ...Object.values(c.session.state.sites),
        ...Object.values(c.session.state.transfers),
      ].flatMap((owner) => Object.keys(owner.entities));
      expect(new Set(ids).size).toBe(ids.length);
    }
  }
  expect(blockers).toHaveLength(2);
  expect(blockers[0]).toContain("maintenance-parts");
  expect(blockers[1]).toContain("suppression-unit");
  expect(alarmed && replayed).toBe(true);
  const { state, campaign } = c.session;
  const home = state.sites[campaign!.homeId]!;
  const clockwork = state.sites[campaign!.siteIds.clockwork!]!;
  const shellId = `${clockwork.id}:machine:process-1:output`;
  expect(home.entities[shellId]).toMatchObject({
    integrity: 40,
    location: { kind: "carried", carrierId: "site-1:alex" },
    processed: { inputId: "site-1:vest", inputCondition: 80 },
  });
  expect(home.entities["site-1:suppressor"]).toMatchObject({
    equipment: { subdual: { charges: 1 } },
  });
  expect(clockwork.entities["site-1:vest"]!.amount).toBe(0);
  const holding = home.entities["site-1:holding"];
  if (holding?.kind !== "facility") throw new Error("Expected holding.");
  expect(secureContainment(holding, state.tick)).toBe(true);
  expect(
    holding.service!.history.filter((record) => record.kind === "service"),
  ).toHaveLength(2);
  expect(holding.service!.history.every((record) => record.lateBy === 0)).toBe(
    true,
  );
  expect(home.entities["site-13:specimen"]).toMatchObject({
    location: { kind: "carried", carrierId: holding.id },
  });
  expect(home.entities["site-1:ben"]).toMatchObject({
    serviceDuty: holding.id,
  });
  expect(home.entities["site-14:power"]!.amount).toBe(3);
  expect(
    state.sites[campaign!.siteIds.support!]!.entities["site-14:power"],
  ).toBeUndefined();
  expect(home.entities["site-1:parts"]!.amount).toBe(2);
  expect(home.entities["site-1:suppression-units"]!.amount).toBe(2);
  expect(preview!.manifest.map((entity) => entity.id).sort()).toEqual(
    ["site-1:alex", "site-1:suppressor", shellId].sort(),
  );
  expect(state.transfers).toEqual({});
  expect(campaign!.staffIds).toHaveLength(3);
});
