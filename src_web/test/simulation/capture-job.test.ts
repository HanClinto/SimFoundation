import fs from "node:fs";
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
import type { Item } from "../../src/simulation/core/entity/Item";

function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
  }
  return c;
}
function field() {
  return play(openConsole(), [
    "order alex equip suppressor",
    "order alex equip vest",
    "order alex take restraint",
    "finish alex",
    "prepare intervention alex",
    "finish alex",
    "send intervention alex",
    "finish alex",
    "site intervention",
  ]);
}
const actor = (c: ConsoleState) =>
  c.session.state.sites["site-13"]!.entities["site-1:alex"] as Pawn;
const subject = (c: ConsoleState) =>
  c.session.state.sites["site-13"]!.entities["site-13:specimen"] as Pawn;
const tool = (c: ConsoleState) =>
  c.session.state.sites["site-13"]!.entities["site-1:suppressor"] as Item;
const band = (c: ConsoleState) =>
  c.session.state.sites["site-13"]!.entities["site-1:restraint"] as Item;

it("delegated capture has the same physical outcome and elapsed work as the existing primitives", () => {
  const initial = field();
  const delegated = play(initial, [
    "order alex capture specimen @held 2 3",
    "finish alex",
  ]);
  const manual = play(initial, [
    "order alex subdue specimen",
    "finish alex",
    "order alex restrain specimen @held",
    "finish alex",
    "order alex take specimen",
    "finish alex",
    "order alex move 2 3",
    "finish alex",
  ]);
  expect(delegated.session.state.tick).toBe(manual.session.state.tick);
  expect(delegated.session.state.sites).toEqual(manual.session.state.sites);
  expect(tool(delegated).equipment!.subdual!.charges).toBe(1);
  expect(subject(delegated).location).toEqual({
    kind: "carried",
    carrierId: actor(delegated).id,
  });
  expect(band(delegated).location).toEqual({
    kind: "carried",
    carrierId: subject(delegated).id,
  });
  expect(actor(delegated).location).toEqual({
    kind: "ground",
    position: { x: 2, y: 3 },
  });
});

it("cancelled and saved partial capture retains actual subdual and does not spend another charge on resumption", () => {
  let c = play(field(), ["order alex capture specimen @held 2 3"]);
  for (let tick = 0; tick < 40; tick++) {
    c = play(c, ["step"]);
    const action = actor(c).queue[0]?.action;
    if (
      action?.kind === "capture" &&
      action.phase === "restrain" &&
      action.workTicks === 1
    )
      break;
  }
  expect(actor(c).queue[0]!.action).toMatchObject({
    phase: "restrain",
    workTicks: 1,
  });
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 20)).toEqual(stepSession(c.session, 20));
  c = play(c, ["cancel alex"]);
  expect(subject(c).canAct).toBe(false);
  expect(band(c).restraint!.attached).toBe(false);
  expect(tool(c).equipment!.subdual!.charges).toBe(1);
  c = play(c, ["order alex capture specimen restraint 2 3", "finish alex"]);
  expect(tool(c).equipment!.subdual!.charges).toBe(1);
  expect(subject(c).location).toEqual({
    kind: "carried",
    carrierId: actor(c).id,
  });
});

it("validates real band and gear before spending on an impossible plan, while a blocked destination retains custody", () => {
  let c = field();
  band(c).integrity = 0;
  expect(
    executeLine(c, "order alex capture specimen @held 2 3").output,
  ).toContain("serviceable compatible restraint");
  expect(tool(c).equipment!.subdual!.charges).toBe(2);
  c = field();
  const site = c.session.state.sites["site-13"]!;
  site.entities["blocker"] = {
    ...structuredClone(
      c.session.state.sites["site-1"]!.entities["site-1:bed"]!,
    ),
    id: "blocker",
    location: { kind: "ground", position: { x: 2, y: 3 } },
  };
  c = play(c, ["order alex capture specimen @held 2 3", "finish alex"]);
  expect(executeLine(c, "queue alex").output).toContain("blocked");
  expect(subject(c).location).toEqual({
    kind: "carried",
    carrierId: actor(c).id,
  });
  expect(band(c).restraint!.attached).toBe(true);
  expect(tool(c).equipment!.subdual!.charges).toBe(1);
});

it("normal strict walkthrough delegates capture but still requires explicit transport and prepared intake", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/delegated-capture.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  const c = play(openConsole(), lines);
  expect(
    c.session.state.sites["site-1"]!.entities["site-13:specimen"]!.location,
  ).toEqual({ kind: "carried", carrierId: "site-1:holding" });
  expect(
    (c.session.state.sites["site-1"]!.entities["site-13:specimen"] as Pawn)
      .acceptsEscort,
  ).toBe(false);
  expect(c.session.state.transfers).toEqual({});
});

it("finishes the remaining physical phases after spending its final charge, without requiring a fictitious extra one", () => {
  let c = field();
  tool(c).equipment!.subdual!.charges = 1;
  c = play(c, ["order alex capture specimen @held 2 3", "finish alex"]);
  expect(actor(c).queue).toEqual([]);
  expect(tool(c).equipment!.subdual!.charges).toBe(0);
  expect(band(c).restraint!.attached).toBe(true);
  expect(subject(c).location).toEqual({
    kind: "carried",
    carrierId: actor(c).id,
  });
});

it("worker incapacity or a missing subject interrupts/fails the one commitment without moving its supplies", () => {
  let c = play(field(), ["order alex capture specimen @held 2 3", "step"]);
  actor(c).canAct = false;
  c = play(c, ["step"]);
  expect(actor(c).queue).toEqual([]);
  expect(tool(c).equipment!.subdual!.charges).toBe(2);
  expect(band(c).location).toEqual({ kind: "carried", carrierId: actor(c).id });
  c = play(field(), ["order alex capture specimen @held 2 3"]);
  delete c.session.state.sites["site-13"]!.entities["site-13:specimen"];
  c = play(c, ["step"]);
  expect(c.session.events).toContainEqual(
    expect.objectContaining({ kind: "failed", actionKind: "capture" }),
  );
  expect(tool(c).equipment!.subdual!.charges).toBe(2);
});
