import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";

it("filters dated critical history by alarm, site and actor without advancing or changing state", () => {
  const c = executeLine(openConsole(), "run 100").console;
  const before = JSON.stringify(c);
  const alarm = executeLine(c, "events alarms").output;
  expect(alarm).toContain("Retained history only");
  expect(alarm).toContain('"entityId":"site-12:rowan"');
  expect(alarm).toContain('"tick":60');
  expect(alarm).not.toContain("employee-a");
  expect(executeLine(c, "events accident").output).toContain('"tick":60');
  expect(executeLine(c, "events site-12:rowan").output).toContain(
    '"kind":"warning"',
  );
  expect(executeLine(c, "events here").output).not.toContain(
    '"entityId":"site-12:rowan"',
  );
  expect(JSON.stringify(c)).toBe(before);
  const restored = {
    ...c,
    session: restoreSession(JSON.stringify(c.session))!,
  };
  expect(executeLine(restored, "events alarms").output).toBe(alarm);
});

it("entity filters include being an event target as well as being its actor", () => {
  let c = openConsole();
  for (const line of [
    "prepare care casey",
    "finish casey",
    "send care casey",
    "finish casey",
    "site care",
    "order casey treat mira",
    "finish casey",
  ])
    c = executeLine(c, line).console;
  const output = executeLine(c, "events site-5:mira").output;
  expect(output).toContain('"kind":"treated"');
  expect(output).toContain('"entityId":"site-1:casey"');
  expect(output).toContain('"targetId":"site-5:mira"');
  expect(
    executeLine(c, `events ${c.session.labels["site-5:mira"]}`).output,
  ).toContain('"kind":"treated"');
});

it("keeps unfiltered output unchanged and rejects invalid or ambiguous filters", () => {
  let c = openConsole();
  expect(executeLine(c, "events").output).toBe("No recent events.");
  expect(executeLine(c, "events alarms").output).toContain("No recent events.");
  expect(() => executeLine(c, "events missing-person")).toThrow(
    "Unknown entity",
  );
  expect(() => executeLine(c, "events alarms extra")).toThrow("Use events");
  c = executeLine(c, "site accident").console;
  expect(() => executeLine(c, "events bed")).toThrow("Ambiguous");
});
