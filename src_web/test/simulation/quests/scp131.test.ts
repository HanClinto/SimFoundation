import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../../src/adapters/cli/Console";
import {
  restoreSession,
  stepSession,
} from "../../../src/application/ScenarioSession";
import { directWatchers } from "../../../src/simulation/core/entity/pawn/Attention";
import { secureContainment } from "../../../src/simulation/core/entity/Containment";

it("earns the visit through real annex research, transports the same pair, observes supplemental gaze and returns without inventing care or staff", () => {
  const prefix = fs
    .readFileSync(
      new URL(
        "../../../src/simulation/catalog/quests/scp173/tests/watch-maintenance.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  const visit = fs
    .readFileSync(
      new URL(
        "../../../src/simulation/catalog/quests/scp131/tests/visit.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = openConsole();
  expect(() => executeLine(c, "prepare companions casey")).toThrow(
    "statue study required",
  );
  const originalStaff = [...c.session.campaign!.staffIds];
  const pairSite = c.session.campaign!.siteIds.companions!;
  const pairIds = [`${pairSite}:pod-a`, `${pairSite}:pod-b`];
  let replayed = false;
  let supported = false;
  for (const line of [...prefix, ...visit]) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    expect(result.output, line).not.toMatch(
      /Advanced.*(?:blocked|failed|interrupted|1000-tick limit)/i,
    );
    c = result.console;
    if (!replayed && line === "send home casey pod-a pod-b") {
      const restored = restoreSession(JSON.stringify(c.session))!;
      expect(stepSession(restored, 8)).toEqual(stepSession(c.session, 8));
      c = { ...c, session: restored };
      replayed = true;
    }
    if (line === "order casey wait 12") {
      const annex = c.session.state.sites[c.siteId]!;
      const watching = directWatchers(annex, `${annex.id}:subject`);
      expect(watching.map((observer) => observer.id)).toEqual(pairIds);
      expect(watching.every((observer) => observer.human === false)).toBe(true);
      const queued = executeLine(c, "order casey service station");
      expect(queued.rejected).not.toBe(true);
      // The pending service is checked at execution because Casey is deliberately waiting.
      const probe = executeLine(queued.console, "finish casey");
      expect(probe.output).toContain("2 active direct observers");
      const withoutWait = executeLine(c, "cancel casey").console;
      const humanWatch = executeLine(
        withoutWait,
        "order casey watch subject 100",
      ).console;
      const active = executeLine(humanWatch, "step 1").console;
      expect(executeLine(active, "relieve casey pod-a").rejected).toBe(true);
      supported = true;
    }
    const ids = [
      ...Object.values(c.session.state.sites),
      ...Object.values(c.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size).toBe(ids.length);
  }
  expect(replayed && supported).toBe(true);
  const { state, campaign } = c.session;
  const home = state.sites[campaign!.homeId]!;
  for (const id of pairIds) {
    expect(home.entities[id]).toMatchObject({
      definitionId: "scp-131",
      playerControllable: false,
      human: false,
      needs: {},
      location: { kind: "ground" },
    });
    expect(campaign!.staffIds).not.toContain(id);
  }
  expect(state.sites[pairSite]!.entities).toEqual({});
  const reserveId = campaign!.siteIds.reserve!;
  expect(campaign!.staffIds).toEqual([...originalStaff, `${reserveId}:riley`]);
  expect(() => executeLine(c, "admit pod-a bed")).toThrow(
    "no ordinary rest need",
  );
  expect(executeLine(c, "order pod-a wait 1").rejected).toBe(true);
  const holding = home.entities["site-1:holding"];
  if (holding?.kind !== "facility") throw new Error("Expected holding.");
  expect(secureContainment(holding, state.tick)).toBe(true);
  expect(home.entities["site-13:specimen"]).toMatchObject({
    location: { kind: "carried", carrierId: holding.id },
  });
  expect(home.entities["site-14:power"]!.amount).toBeLessThan(3);
  expect(state.transfers).toEqual({});
});
