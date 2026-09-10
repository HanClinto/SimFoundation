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
import type { Facility } from "../../src/simulation/core/entity/Facility";
import type { Item } from "../../src/simulation/core/entity/Item";
import { serviceDeadline } from "../../src/simulation/core/entity/Service";
import { secureContainment } from "../../src/simulation/core/entity/Containment";

const subject = (c: ConsoleState) =>
  c.session.state.sites["site-1"]!.entities["site-13:specimen"] as Pawn;
const cell = (c: ConsoleState) =>
  c.session.state.sites["site-1"]!.entities["site-1:holding"] as Facility;
const band = (c: ConsoleState) =>
  c.session.state.sites["site-1"]!.entities["site-1:restraint"] as Item;
const script = fs
  .readFileSync(
    new URL(
      "../../src/simulation/catalog/campaign/tests/containment-cycle.txt",
      import.meta.url,
    ),
    "utf8",
  )
  .split(/\r?\n/);
function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
    const ids = [
      ...Object.values(c.session.state.sites),
      ...Object.values(c.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size).toBe(ids.length);
  }
  return c;
}
function contained() {
  return play(
    openConsole(),
    script.slice(0, script.indexOf("inspect holding")),
  );
}

it("plays prepared living containment, real fallback, breach and equipment-backed recontainment", () => {
  const c = play(openConsole(), script);
  expect(subject(c).location).toEqual({
    kind: "carried",
    carrierId: "site-1:holding",
  });
  expect(subject(c).health!.death).toBeUndefined();
  expect(subject(c).acceptsEscort).toBe(false);
  expect(cell(c).study!.findings[0]!.sourceIds).toEqual(["site-13:specimen"]);
  expect(c.session.events).toContainEqual(
    expect.objectContaining({ kind: "breached", targetId: "site-13:specimen" }),
  );
  expect(
    (c.session.state.sites["site-1"]!.entities["site-1:suppressor"] as Item)
      .equipment!.subdual!.charges,
  ).toBe(0);
  expect(
    c.session.state.sites["site-1"]!.entities["site-1:power-units"]!.amount,
  ).toBe(1);
});

it("safe containment holds an awake unrestrained subject and preserves transport gear", () => {
  let c = contained();
  expect(band(c).restraint!.attached).toBe(false);
  const integrity = band(c).integrity;
  const remaining =
    subject(c).health!.subdual!.untilTick - c.session.state.tick;
  c = play(c, [`step ${Math.max(0, remaining + 1)}`]);
  expect(subject(c).canAct).toBe(true);
  expect(subject(c).queue).toEqual([]);
  expect(subject(c).location).toEqual({
    kind: "carried",
    carrierId: cell(c).id,
  });
  expect(band(c).integrity).toBe(integrity);
});

it("warns before expiry and physical lockdown retains the same subject until the fallback expires", () => {
  let c = contained();
  const deadline = serviceDeadline(cell(c).service!)!;
  c = play(c, [`step ${Math.max(0, deadline - 40 - c.session.state.tick)}`]);
  expect(c.session.events).toContainEqual(
    expect.objectContaining({ kind: "warning", targetId: subject(c).id }),
  );
  c = play(c, ["order ben lockdown holding", "finish ben"]);
  const expires = cell(c).containment!.lockdown.untilTick!;
  expect(secureContainment(cell(c), expires - 1)).toBe(true);
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, expires - c.session.state.tick)).toEqual(
    stepSession(c.session, expires - c.session.state.tick),
  );
  c = play(c, [`step ${expires - c.session.state.tick}`]);
  expect(subject(c).location.kind).toBe("ground");
  expect(cell(c).containment!.lockdown.untilTick).toBe(expires);
});

it("spent parts and depleted power remain finite, with no cost refund on interrupted fallback", () => {
  let c = contained();
  c = play(c, ["order ben lockdown holding", "step", "cancel ben"]);
  expect(cell(c).containment!.lockdown.untilTick).toBeNull();
  const parts = Object.values(c.session.state.sites["site-1"]!.entities).find(
    (entity) => entity.id.startsWith("site-1:parts:portion"),
  )!;
  expect(parts.amount).toBe(0);
  c = play(c, ["order ben lockdown holding", "finish ben"]);
  expect(executeLine(c, "queue ben").output).toContain(
    "Bring maintenance-parts",
  );
  c = play(c, ["cancel ben"]);
  c.session.state.sites["site-1"]!.entities["site-1:power-units"]!.amount = 0;
  const deadline = serviceDeadline(cell(c).service!)!;
  c = play(c, [`step ${deadline - c.session.state.tick + 1}`]);
  expect(subject(c).location.kind).toBe("ground");
  c = play(c, ["order ben service holding", "finish ben"]);
  expect(executeLine(c, "queue ben").output).toContain("containment-charge");
});

it("requires effective custody and preparation rather than treating a cell tile as intake", () => {
  const c = contained();
  expect(
    executeLine(c, "order alex contain specimen holding").output,
  ).toContain("restraint");
  expect(executeLine(c, "order alex take specimen").output).toContain(
    "cannot be picked up",
  );
  expect(executeLine(c, "order ben unequip suppressor").output).toContain(
    "not wearing",
  );
});

it("does not claim controlled intake from a nearby carrier or a cell that loses coverage mid-study", () => {
  let c = play(
    openConsole(),
    script.slice(0, script.indexOf("order alex contain @held holding")),
  );
  c = play(c, [
    "order alex move 14 8",
    "finish alex",
    "order alex study holding kinetic-intake",
    "finish alex",
  ]);
  expect(executeLine(c, "queue alex").output).toContain(
    "Admit the actual living",
  );
  expect(cell(c).study!.findings).toEqual([]);
  c = play(c, [
    "cancel alex",
    "order alex contain @held holding",
    "finish alex",
  ]);
  c = play(c, ["order ben study holding kinetic-intake", "step"]);
  cell(c).service!.history = [];
  c = play(c, ["step"]);
  expect(cell(c).study!.findings).toEqual([]);
  expect(executeLine(c, "queue ben").output).toContain("effective containment");
});

it("warns on late intake even when the empty cell's initial warning tick has passed", () => {
  let c = play(
    openConsole(),
    script.slice(0, script.indexOf("order alex contain @held holding")),
  );
  c = play(c, ["order alex move 14 8", "finish alex"]);
  const deadline = serviceDeadline(cell(c).service!)!;
  c = play(c, [
    `step ${deadline - 20 - c.session.state.tick}`,
    "order alex contain @held holding",
    "finish alex",
  ]);
  expect(c.session.events).toContainEqual(
    expect.objectContaining({
      kind: "warning",
      targetId: subject(c).id,
      reason:
        "Intake completed with containment coverage already near expiry; service or lockdown is required.",
    }),
  );
});
