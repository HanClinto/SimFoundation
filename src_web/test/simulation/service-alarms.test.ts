import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import {
  restoreSession,
  stepSession,
} from "../../src/application/ScenarioSession";
import type { Facility } from "../../src/simulation/core/entity/Facility";
import { serviceDeadline } from "../../src/simulation/core/entity/Service";

function provisioned() {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/quests/scp1295/tests/staffed-service.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = openConsole();
  for (const line of lines.slice(0, lines.indexOf("assign alex counter")))
    c = executeLine(c, line).console;
  for (const line of [
    "order alex service counter",
    "finish alex",
    "site home",
    "step 30",
  ])
    c = executeLine(c, line).console;
  return c;
}

it("remote unattended service warns once before its deadline and once on lapse", () => {
  let c = provisioned();
  const counter = c.session.state.sites["site-9"]!.entities[
    "site-9:counter"
  ] as Facility;
  const deadline = serviceDeadline(counter.service!)!;
  const warned = executeLine(c, "run 300");
  expect(warned.alarm).toMatchObject({ kind: "warning", entityId: counter.id });
  expect(warned.console.session.state.tick).toBe(
    deadline - counter.service!.leadTime,
  );
  c = executeLine(warned.console, "run 300").console;
  expect(c.session.state.tick).toBe(deadline + 1);
  expect(
    c.session.events.filter(
      (event) => event.entityId === counter.id && event.kind === "warning",
    ),
  ).toHaveLength(2);
  expect(executeLine(c, "run 3").console.session.state.tick).toBe(deadline + 4);
});

it("service alarm replay retains source quantities and does not schedule hidden work", () => {
  const c = provisioned();
  const before =
    c.session.state.sites["site-9"]!.entities["site-1:meals:portion-action-1"]!
      .amount;
  const restored = restoreSession(JSON.stringify(c.session))!;
  const expected = stepSession(c.session, 100);
  expect(stepSession(restored, 100)).toEqual(expected);
  expect(
    expected.state.sites["site-9"]!.entities["site-1:meals:portion-action-1"]!
      .amount,
  ).toBe(before);
});

it("an actual breach outranks the same tick's service lapse while both remain in events", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/containment-cycle.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = openConsole();
  for (const line of lines.slice(0, lines.indexOf("inspect holding")))
    c = executeLine(c, line).console;
  const cell = c.session.state.sites["site-1"]!.entities[
    "site-1:holding"
  ] as Facility;
  const deadline = serviceDeadline(cell.service!)!;
  c = executeLine(c, `step ${deadline - c.session.state.tick}`).console;
  const result = executeLine(c, "run 2");
  expect(result.alarm?.kind).toBe("breached");
  expect(result.console.session.events).toContainEqual(
    expect.objectContaining({
      entityId: cell.id,
      kind: "warning",
      reason: expect.stringContaining("has lapsed"),
    }),
  );
});
