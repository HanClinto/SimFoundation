import fs from "node:fs";
import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../../src/adapters/cli/Console";
import {
  restoreSession,
  stepSession,
} from "../../../src/application/ScenarioSession";
import { instantiateEntity } from "../../../src/simulation/core/site/EntityPlacement";
import { entities } from "../../../src/simulation/catalog";
import type { Pawn } from "../../../src/simulation/core/entity/pawn/Pawn";

const pawn = (console: ConsoleState, id: string) =>
  console.session.state.sites["site-1"]!.entities[id] as Pawn;
const textiles = (console: ConsoleState) =>
  console.session.state.sites["site-1"]!.entities["site-1:textiles"]!;
const bear = (console: ConsoleState) => pawn(console, "site-1:bear");

function play(console: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(console, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    console = result.console;
    const ids = [
      ...Object.values(console.session.state.sites),
      ...Object.values(console.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size, line).toBe(ids.length);
  }
  return console;
}

function nearby() {
  const console = openConsole();
  const home = console.session.state.sites["site-1"]!;
  for (const [id, ageYears, position] of [
    ["older", 54, { x: 5, y: 7 }],
    ["younger", 29, { x: 6, y: 6 }],
  ] as const)
    home.entities[id] = instantiateEntity(
      {
        id,
        definitionId: "organ-trauma-patient",
        location: { kind: "ground", position },
        overrides: { ageYears },
      },
      entities,
    );
  return console;
}

it("plays two actual adult transfers, specific replacements and finite postoperative courses", () => {
  const transcript = fs.readFileSync(
    new URL(
      "../../../src/simulation/catalog/quests/scp2295/tests/supported-transfer.txt",
      import.meta.url,
    ),
    "utf8",
  );
  const console = play(openConsole(), transcript.split(/\r?\n/));
  for (const id of ["site-8:iris", "site-8:owen"]) {
    const patient = pawn(console, id);
    expect(patient.canAct).toBe(true);
    expect(patient.health!.organs!.lung).toMatchObject({
      trauma: 0,
      replacement: {
        actorId: "site-1:bear",
        materialSourceId: "site-1:textiles",
        amount: 1,
      },
    });
    expect(patient.health!.wounds[0]!.severity).toBe(8);
    expect(patient.health!.bloodLoss).toBe(15);
    expect(console.session.campaign!.admissions[id]).toBeDefined();
  }
  expect(textiles(console).amount).toBe(0);
  expect(bear(console).amount).toBe(3);
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:clinical-packs"]!
      .amount,
  ).toBe(2);
  expect(console.session.state.sites["site-8"]!.entities).toEqual({});
});

it("chooses the youngest nearby eligible adult independently of IDs and replays paid treatment", () => {
  let console = play(nearby(), ["step"]);
  expect(bear(console).queue[0]!.action).toMatchObject({
    kind: "mend",
    targetId: "younger",
    workTicks: 1,
    material: { sourceId: "site-1:textiles", amount: 1 },
  });
  const restored = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(restored, 20)).toEqual(stepSession(console.session, 20));
  console = play(console, ["step 7"]);
  expect(pawn(console, "younger").health!.organs!.lung!.trauma).toBe(0);
  expect(pawn(console, "older").health!.organs!.lung!.trauma).toBe(100);
  expect(pawn(console, "younger").health!.incapacity).toBe("postoperative");
  expect(pawn(console, "younger").canAct).toBe(false);
});

it("spends finite self-fabric when external textiles are absent without regenerating it", () => {
  let console = nearby();
  textiles(console).location = { kind: "ground", position: { x: 1, y: 1 } };
  console = play(console, ["step 20"]);
  expect(bear(console).amount).toBe(1);
  expect(bear(console).integrity).toBeCloseTo(100 / 3);
  expect(
    pawn(console, "younger").health!.organs!.lung!.replacement!
      .materialSourceId,
  ).toBe("site-1:bear");
  pawn(console, "younger").health!.organs!.lung!.trauma = 100;
  console = play(console, ["step 10"]);
  expect(executeLine(console, "queue bear").output).toContain(
    "self-fabric reserve",
  );
  expect(bear(console).amount).toBe(1);
  expect(textiles(console).amount).toBe(2);
});

it("does not repair the youngest brain-trauma patient or skip them for an older lung patient", () => {
  let console = nearby();
  pawn(console, "younger").health!.organs = { brain: { trauma: 100 } };
  console = play(console, ["step 20"]);
  expect(pawn(console, "younger").health!.organs!.brain!.trauma).toBe(100);
  expect(pawn(console, "older").health!.organs!.lung!.trauma).toBe(100);
  expect(textiles(console).amount).toBe(2);
  expect(executeLine(console, "queue bear").output).toContain("not supported");
  pawn(console, "younger").location = {
    kind: "ground",
    position: { x: 9, y: 1 },
  };
  console = play(console, ["step 20"]);
  expect(pawn(console, "older").health!.organs!.lung!.trauma).toBe(0);
});

it("physical interruption retains spent material but does not grant an unfinished replacement", () => {
  let console = nearby();
  pawn(console, "site-1:alex").location = {
    kind: "ground",
    position: { x: 7, y: 7 },
  };
  console = play(console, ["step", "order alex take bear", "step"]);
  expect(bear(console).location.kind).toBe("carried");
  expect(bear(console).queue).toHaveLength(0);
  expect(textiles(console).amount).toBe(1);
  expect(
    pawn(console, "younger").health!.organs!.lung!.replacement,
  ).toBeUndefined();
  console = play(console, ["order alex drop bear", "step", "step 8"]);
  expect(pawn(console, "younger").health!.organs!.lung!.trauma).toBe(0);
  expect(textiles(console).amount).toBe(0);
});

it("a younger arrival interrupts paid older treatment and postoperative care still costs a pack with no blood loss", () => {
  let console = nearby();
  pawn(console, "younger").location = {
    kind: "ground",
    position: { x: 9, y: 1 },
  };
  console = play(console, ["step"]);
  expect(bear(console).queue[0]!.action).toMatchObject({ targetId: "older" });
  pawn(console, "younger").location = {
    kind: "ground",
    position: { x: 6, y: 6 },
  };
  console = play(console, ["step"]);
  expect(console.session.events).toContainEqual(
    expect.objectContaining({
      kind: "interrupted",
      actionKind: "mend",
    }),
  );
  expect(pawn(console, "older").health!.organs!.lung!.trauma).toBe(100);
  console = play(console, ["step 8"]);
  const patient = pawn(console, "younger");
  patient.health!.bloodLoss = 0;
  patient.location = { kind: "ground", position: { x: 3, y: 1 } };
  console = play(console, ["order casey nurse younger clinic", "step 24"]);
  expect(pawn(console, "younger").canAct).toBe(true);
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:clinical-packs"]!
      .amount,
  ).toBe(3);
});
