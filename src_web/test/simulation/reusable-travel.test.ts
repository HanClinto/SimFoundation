import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import {
  restoreSession,
  stepSession,
} from "../../src/application/ScenarioSession";

it("plays eight real round trips with unchanged supply stocks and exact mid-transit replay", () => {
  let c = openConsole();
  const initial = c.session.state;
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/reusable-travel.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let replayed = false;
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    c = result.console;
    const ids = [
      ...Object.values(c.session.state.sites),
      ...Object.values(c.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size, line).toBe(ids.length);
    if (!replayed && c.session.state.transfers["transfer-9"]) {
      const restored = restoreSession(JSON.stringify(c.session))!;
      expect(stepSession(restored, 6)).toEqual(stepSession(c.session, 6));
      c = { ...c, session: restored };
      replayed = true;
    }
  }
  expect(replayed).toBe(true);
  expect(c.session.state.nextTransferId).toBe(17);
  expect(c.session.state.transfers).toEqual({});
  const home = c.session.state.sites[c.session.campaign!.homeId]!;
  expect(home.entities["site-1:alex"]).toMatchObject({
    kind: "pawn",
    canAct: true,
  });
  expect(home.entities["site-1:vest"]).toMatchObject({
    integrity: 100,
    equipment: { worn: true },
    location: { kind: "carried", carrierId: "site-1:alex" },
  });
  expect(home.entities["site-1:kit"]).toMatchObject({
    location: { kind: "carried", carrierId: "site-1:alex" },
  });
  for (const item of Object.values(initial.sites[home.id]!.entities).filter(
    (e) => e.kind === "item",
  ))
    expect(home.entities[item.id]!.amount, item.id).toBe(item.amount);
  expect(executeLine(c, "status").output).toContain("reusable transport");
  expect(c.session.state.tick).toBeGreaterThanOrEqual(16 * 6);
});
