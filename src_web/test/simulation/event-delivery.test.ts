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
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import type { TickEvent } from "../../src/simulation/core/Simulation";

function busy(): ConsoleState {
  const c = openConsole();
  const home = c.session.state.sites["site-1"]!;
  const template = home.entities["site-1:alex"] as Pawn;
  for (let index = 0; index < 150; index++) {
    const id = `site-1:z-noise-${index}`;
    home.entities[id] = {
      ...structuredClone(template),
      id,
      name: `noise-${index}`,
      queue: [
        {
          id: `noise-${index}`,
          source: "script",
          elapsed: 0,
          blockedReason: null,
          action: { kind: "wait", ticks: 1 },
        },
      ],
    };
  }
  return c;
}

it("run reports a current death that later independent events push out of the bounded saved history", () => {
  const c = busy();
  const actor = c.session.state.sites["site-1"]!.entities[
    "site-1:alex"
  ] as Pawn;
  actor.health = {
    wounds: [{ id: "fatal", severity: 150, bleeding: 0 }],
    bloodLoss: 0,
    mortality: { criticalTicks: 0, fatalAfterTicks: 1 },
  };
  const result = executeLine(c, "run 10");
  expect(result.alarm).toMatchObject({ kind: "died", entityId: actor.id });
  expect(result.console.session.state.tick).toBe(1);
  expect(result.console.session.events).toHaveLength(100);
  expect(
    result.console.session.events.some((event) => event.kind === "died"),
  ).toBe(false);
});

it("finish reports an early watched failure rather than false successful completion under event volume", () => {
  let c = executeLine(busy(), "order alex take meals").console;
  delete c.session.state.sites["site-1"]!.entities["site-1:meals"];
  const result = executeLine(c, "finish alex");
  expect(result.output).toContain(
    "alex failed: The target is no longer present.",
  );
  expect(result.output).not.toContain("Watched commitments finished");
  expect(result.console.session.state.tick).toBe(1);
});

it("delivers complete batches to runtime callers while keeping unchanged deterministic save state", () => {
  const c = busy();
  const batches: (readonly Readonly<TickEvent>[])[] = [];
  const result = stepSession(c.session, 2, (events) => batches.push(events));
  expect(batches).toHaveLength(2);
  expect(batches[0]!.length).toBeGreaterThan(100);
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 2)).toEqual(result);
  expect(result.events).toHaveLength(100);
  expect(JSON.stringify(result)).not.toContain("onTick");
});
