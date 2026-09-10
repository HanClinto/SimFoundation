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
import { wornEquipment } from "../../src/simulation/core/entity/Equipment";

const home = (c: ConsoleState) => c.session.state.sites["site-1"]!;
function owned(c: ConsoleState, id: string) {
  const item = [
    ...Object.values(c.session.state.sites),
    ...Object.values(c.session.state.transfers),
  ]
    .map((owner) => owner.entities[id])
    .find(Boolean);
  if (!item) throw new Error(`Missing ${id}`);
  return item;
}
const actor = (c: ConsoleState) => owned(c, "site-1:alex") as Pawn;
const specimen = (c: ConsoleState) => owned(c, "site-13:specimen") as Pawn;
const tool = (c: ConsoleState) => owned(c, "site-1:suppressor") as Item;
function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
  }
  return c;
}
function equipped() {
  return play(openConsole(), [
    "order alex equip suppressor",
    "order alex equip vest",
    "finish alex",
  ]);
}
function field() {
  return play(equipped(), [
    "prepare intervention alex",
    "finish alex",
    "send intervention alex",
    "step 8",
    "site intervention",
  ]);
}

it("plays equipment-backed subdual and withdrawal with persistent charges, equipment and risk", () => {
  const transcript = fs.readFileSync(
    new URL(
      "../../src/simulation/catalog/campaign/tests/intervention.txt",
      import.meta.url,
    ),
    "utf8",
  );
  let c = play(openConsole(), transcript.split(/\r?\n/));
  expect(tool(c).equipment!.subdual!.charges).toBe(1);
  expect(tool(c).location).toEqual({
    kind: "carried",
    carrierId: "site-1:alex",
  });
  expect(actor(c).health!.mortality!.fatalAfterTicks).toBe(12);
  expect(specimen(c).acceptsEscort).toBe(false);
  expect(specimen(c).canAct).toBe(false);
  expect(specimen(c).health!.subdual).toBeDefined();
  c = play(c, ["step 90"]);
  expect(specimen(c).canAct).toBe(true);
  expect(specimen(c).health!.subdual).toBeUndefined();
});

it("slots use actual worn objects and leave a cargo slot, with physical unequipping", () => {
  let c = equipped();
  expect(wornEquipment(home(c), "site-1:alex", "tool")!.id).toBe(
    "site-1:suppressor",
  );
  expect(executeLine(c, "order alex drop suppressor").output).toContain(
    "unequip",
  );
  expect(executeLine(c, "order ben equip suppressor").output).toContain(
    "living person",
  );
  c = play(c, [
    "order alex take meals 2",
    "finish alex",
    "order alex drop @held",
    "finish alex",
    "order alex unequip vest",
    "finish alex",
  ]);
  expect((home(c).entities["site-1:vest"] as Item).equipment!.worn).toBe(false);
  expect(home(c).entities["site-1:vest"]!.location.kind).toBe("ground");
  expect(tool(c).equipment!.worn).toBe(true);
});

it("bare gear ownership does not enable intervention and spent charges cannot be reused", () => {
  let c = play(openConsole(), [
    "order alex take suppressor",
    "finish alex",
    "prepare intervention alex",
    "finish alex",
    "send intervention alex",
    "step 8",
    "site intervention",
  ]);
  expect(executeLine(c, "order alex subdue specimen").output).toContain(
    "Wear a serviceable",
  );
  c = play(c, [
    "order alex equip suppressor",
    "finish alex",
    "order alex subdue specimen",
    "finish alex",
  ]);
  tool(c).equipment!.subdual!.charges = 0;
  expect(executeLine(c, "order alex subdue specimen").output).toContain(
    "remaining charge",
  );
});

it("armor mitigates actual impacts, wears out and does not reset injury or prevent mortality", () => {
  let c = field();
  c = play(c, ["order alex move 7 3", "finish alex", "step 24"]);
  const vest = owned(c, "site-1:vest") as Item;
  expect(vest.integrity).toBeLessThan(100);
  expect(actor(c).health!.wounds[0]!.severity).toBe(20);
  c = play(c, ["step 140"]);
  expect(actor(c).health!.death).toBeDefined();
  expect(tool(c).location).toEqual({ kind: "carried", carrierId: actor(c).id });
  expect(actor(c).queue).toEqual([]);
});

it("an arriving reserve can recover worn equipment from a body and retain its depleted state", () => {
  let c = equipped();
  actor(c).health = {
    wounds: [{ id: "fatal", severity: 150, bleeding: 0 }],
    bloodLoss: 0,
    mortality: { criticalTicks: 0, fatalAfterTicks: 1 },
  };
  tool(c).equipment!.subdual!.charges = 1;
  c = play(c, [
    "step",
    "reserve home devon",
    "step 12",
    "order devon equip suppressor",
    "finish devon",
  ]);
  const reserveId = c.session.campaign!.siteIds.reserve!;
  expect(tool(c).location).toEqual({
    kind: "carried",
    carrierId: `${reserveId}:devon`,
  });
  expect(tool(c).equipment!.subdual!.charges).toBe(1);
  expect(actor(c).health!.death).toBeDefined();
});

it("replays subdual expiry and worn equipment in transit without doubling charges or restoring injury", () => {
  let c = field();
  c = play(c, ["order alex subdue specimen", "finish alex"]);
  specimen(c).health!.wounds.push({ id: "retained", severity: 7, bleeding: 0 });
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 90)).toEqual(stepSession(c.session, 90));
  c = play(c, ["prepare home alex", "finish alex", "send home alex"]);
  const transfer = Object.values(c.session.state.transfers)[0]!;
  expect(Object.keys(transfer.entities).sort()).toEqual([
    "site-1:alex",
    "site-1:suppressor",
    "site-1:vest",
  ]);
  expect(tool(c).equipment!.subdual!.charges).toBe(1);
});
