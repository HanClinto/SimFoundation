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
import type { Item } from "../../src/simulation/core/entity/Item";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";

function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
  }
  return c;
}
it("a last subdual charge produces one physical-item warning without changing the intervention result", () => {
  let c = play(openConsole(), [
    "order alex equip suppressor",
    "finish alex",
    "prepare intervention alex",
    "finish alex",
    "send intervention alex",
    "step 8",
    "site intervention",
  ]);
  const tool = c.session.state.sites["site-13"]!.entities[
    "site-1:suppressor"
  ] as Item;
  tool.equipment!.subdual!.charges = 1;
  c = play(c, ["order alex subdue specimen"]);
  const result = executeLine(c, "run 30");
  expect(result.alarm).toMatchObject({
    kind: "warning",
    entityId: tool.id,
    targetId: "site-1:alex",
  });
  const subject = result.console.session.state.sites["site-13"]!.entities[
    "site-13:specimen"
  ] as Pawn;
  expect(subject.canAct).toBe(false);
  expect(
    (result.console.session.state.sites["site-13"]!.entities[tool.id] as Item)
      .equipment!.subdual!.charges,
  ).toBe(0);
  expect(
    result.console.session.events.filter(
      (event) => event.kind === "warning" && event.entityId === tool.id,
    ),
  ).toHaveLength(1);
});
it("actual armor impacts warn on low condition then breakage, without warning again for broken armor", () => {
  let c = play(openConsole(), [
    "order alex equip vest",
    "finish alex",
    "prepare intervention alex",
    "finish alex",
    "send intervention alex",
    "step 8",
    "site intervention",
    "order alex move 4 3",
    "finish alex",
  ]);
  const vest = c.session.state.sites["site-13"]!.entities[
    "site-1:vest"
  ] as Item;
  vest.integrity = 40;
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 60)).toEqual(stepSession(c.session, 60));
  c = play(c, ["step 60"]);
  const warnings = c.session.events.filter(
    (event) => event.kind === "warning" && event.entityId === vest.id,
  );
  expect(warnings).toHaveLength(2);
  expect(warnings[0]!.reason).toContain("nearly exhausted");
  expect(warnings[1]!.reason).toContain("broken");
  expect(c.session.state.sites["site-13"]!.entities[vest.id]!.integrity).toBe(
    0,
  );
});
it("only a worn kit spending its final real supply emits the medical equipment warning", () => {
  let c = play(openConsole(), [
    "order casey equip medical-kit",
    "finish casey",
  ]);
  const home = c.session.state.sites["site-1"]!;
  const kit = home.entities["site-1:medical-kit"] as Item;
  kit.equipment!.medicine!.supplies = 1;
  (home.entities["site-1:alex"] as Pawn).health!.wounds = [
    { id: "bleed", severity: 5, bleeding: 0.1 },
  ];
  c = play(c, ["order casey treat alex", "finish casey"]);
  expect(c.session.events).toContainEqual(
    expect.objectContaining({
      kind: "warning",
      entityId: kit.id,
      targetId: "site-1:casey",
    }),
  );
  expect(
    (c.session.state.sites["site-1"]!.entities["site-1:casey"] as Pawn)
      .response!.medicine!.supplies,
  ).toBe(2);
});
