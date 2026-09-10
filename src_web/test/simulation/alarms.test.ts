import fs from "node:fs";
import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";
import { serviceDeadline } from "../../src/simulation/core/entity/Service";
import type { Facility } from "../../src/simulation/core/entity/Facility";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";

function held() {
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
  return c;
}
const cell = (c: ConsoleState) =>
  c.session.state.sites["site-1"]!.entities["site-1:holding"] as Facility;

it("stops automatic campaign run on a new warning with a complete tick and actual response opportunity", () => {
  let c = held();
  // The original accident independently ends at tick99; explicitly advance past it.
  c = executeLine(c, "step 2").console;
  const deadline = serviceDeadline(cell(c).service!)!;
  const result = executeLine(c, "run 200");
  expect(result.alarm).toMatchObject({
    kind: "warning",
    entityId: "site-1:holding",
  });
  expect(result.console.session.state.tick).toBe(deadline - 40);
  expect(result.output).toContain("Run stopped after the complete tick");
  const patient = result.console.session.state.sites["site-5"]!.entities[
    "site-5:mira"
  ] as Pawn;
  expect(patient.health!.bloodLoss).toBeCloseTo(
    result.console.session.state.tick * 0.1,
  );
  c = executeLine(result.console, "order ben lockdown holding").console;
  c = executeLine(c, "finish ben").console;
  expect(cell(c).containment!.lockdown.untilTick).toBeGreaterThan(
    c.session.state.tick,
  );
});

it("does not stop on a stale event after reload and stops on the next actual breach", () => {
  let c = held();
  c = executeLine(c, "step 2").console;
  c = executeLine(c, "run 200").console;
  const restored = {
    ...c,
    session: restoreSession(JSON.stringify(c.session))!,
  };
  const result = executeLine(c, "run 200");
  expect(result.alarm).toMatchObject({
    kind: "breached",
    targetId: "site-13:specimen",
  });
  expect(executeLine(restored, "run 200")).toEqual(result);
  expect(result.console.session.state.tick).toBe(
    serviceDeadline(cell(c).service!)! + 1,
  );
});

it("warning then death halt run but explicit step remains a deliberate fixed-duration command", () => {
  const initial = openConsole();
  const warned = executeLine(initial, "run 400");
  expect(warned.alarm).toMatchObject({
    kind: "warning",
    entityId: "site-12:rowan",
  });
  expect(warned.console.session.state.tick).toBe(60);
  const critical = executeLine(warned.console, "run 400");
  expect(critical.alarm?.kind).toBe("warning");
  expect(critical.console.session.state.tick).toBe(80);
  const result = executeLine(critical.console, "run 400");
  expect(result.alarm).toMatchObject({
    kind: "died",
    entityId: "site-12:rowan",
  });
  expect(result.console.session.state.tick).toBe(99);
  expect(executeLine(initial, "step 400").console.session.state.tick).toBe(400);
  expect(executeLine(initial, "step 400").alarm).toBeUndefined();
});

it("quiet campaign run and isolated quest behavior retain their normal advancement", () => {
  expect(executeLine(openConsole(), "run 5").console.session.state.tick).toBe(
    5,
  );
  expect(executeLine(openConsole(), "run 5").alarm).toBeUndefined();
  expect(
    executeLine(openConsole("sight"), "run 10").console.session.state.tick,
  ).toBe(10);
});
