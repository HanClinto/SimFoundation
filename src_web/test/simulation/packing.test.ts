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

const get = (console: ConsoleState, id: string) =>
  console.session.state.sites[console.siteId]!.entities[id]!;
const box = (console: ConsoleState) => get(console, "site-1:case") as Item;
const actor = (console: ConsoleState) => get(console, "site-1:alex") as Pawn;

function play(console: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(console, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    console = result.console;
    const owners = [
      ...Object.values(console.session.state.sites),
      ...Object.values(console.session.state.transfers),
    ];
    const ids = owners.flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size, line).toBe(ids.length);
  }
  return console;
}

function visit(withCase = true) {
  return play(openConsole(), [
    ...(withCase ? ["order alex take case", "step 12"] : []),
    "prepare courier alex",
    "step 12",
    "send courier alex",
    "step 7",
    "site courier",
  ]);
}

it("plays sealing, nested transport, unpacking and physical inspection with retained case wear", () => {
  const transcript = fs.readFileSync(
    new URL(
      "../../src/simulation/catalog/campaign/tests/courier.txt",
      import.meta.url,
    ),
    "utf8",
  );
  const console = play(openConsole(), transcript.split(/\r?\n/));
  expect(box(console)).toMatchObject({
    integrity: 35,
    case: { sealed: false },
    location: { kind: "carried", carrierId: "site-1:alex" },
  });
  expect(get(console, "site-6:vial")).toMatchObject({
    integrity: 100,
    location: { kind: "ground", position: { x: 3, y: 5 } },
  });
  expect(get(console, "site-1:bench")).toMatchObject({
    study: {
      findings: [
        {
          planId: "courier-inspection",
          sourceIds: ["site-6:vial", "site-1:case"],
        },
      ],
    },
  });
  expect(
    console.session.state.sites["site-6"]!.entities["site-6:vial"],
  ).toBeUndefined();
});

it("refuses bare pickup, missing equipment, worn seals and incompatible specimens", () => {
  let console = visit(false);
  expect(executeLine(console, "order alex take vial").output).toContain(
    "compatible carried case",
  );
  console = play(console, ["order alex take damaged-case", "step 12"]);
  expect(
    executeLine(console, "order alex pack vial damaged-case").output,
  ).toContain("too worn");
  console = play(console, ["order alex drop damaged-case", "step"]);
  expect(
    executeLine(console, "order alex pack vial damaged-case").output,
  ).toContain("Carry an actual protective case");
  const home = play(openConsole(), ["order alex take case", "step 12"]);
  expect(executeLine(home, "order alex pack kit case").output).toContain(
    "incompatible",
  );
});

it("cancelled partial sealing changes neither ownership nor case condition; reload completes once", () => {
  let console = play(visit(), ["order alex pack vial case"]);
  for (let tick = 0; tick < 30; tick++) {
    console = executeLine(console, "step").console;
    const action = actor(console).queue[0]?.action;
    if (action?.kind === "pack" && action.workTicks === 1) break;
  }
  expect(actor(console).queue[0]!.action).toMatchObject({ workTicks: 1 });
  expect(box(console).integrity).toBe(45);
  const restored = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(restored, 8)).toEqual(stepSession(console.session, 8));
  console = play(console, ["cancel alex", "step"]);
  expect(box(console).integrity).toBe(45);
  expect(get(console, "site-6:vial").location.kind).toBe("ground");
  console = play(console, ["order alex pack vial case", "step 8"]);
  expect(box(console).integrity).toBe(35);
  expect(get(console, "site-6:vial").location).toEqual({
    kind: "carried",
    carrierId: "site-1:case",
  });
  expect(executeLine(console, "inspect case").output).toContain(
    '"id": "site-6:vial"',
  );
});

it("transit reload keeps actor, case and specimen in one ownership tree", () => {
  let console = play(visit(), [
    "order alex pack vial case",
    "step 16",
    "prepare home alex",
    "step 16",
    "send home alex",
  ]);
  const transfer = Object.values(console.session.state.transfers)[0]!;
  expect(Object.keys(transfer.entities).sort()).toEqual([
    "site-1:alex",
    "site-1:case",
    "site-6:vial",
  ]);
  const restored = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(restored, 7)).toEqual(stepSession(console.session, 7));
  console = play(console, ["step 7", "site home"]);
  expect(box(console).case!.sealed).toBe(true);
  expect(get(console, "site-6:vial").location).toEqual({
    kind: "carried",
    carrierId: "site-1:case",
  });
  expect(console.session.state.transfers).toEqual({});
});

it("sealed specimens cannot satisfy physical study until unpacked beside the bench", () => {
  const console = play(visit(), [
    "order alex pack vial case",
    "step 16",
    "prepare home alex",
    "step 16",
    "send home alex",
    "step 7",
    "site home",
    "order alex move 3 5",
    "step 12",
    "order alex study bench courier-inspection",
    "step 8",
  ]);
  expect(executeLine(console, "queue alex").output).toContain(
    "Bring courier-specimen",
  );
  expect(box(console).integrity).toBe(35);
});

it("repeated completed seals exhaust case condition without duplicating or damaging the specimen", () => {
  let console = visit();
  for (let seal = 0; seal < 4; seal++) {
    console = play(console, [
      "order alex pack vial case",
      "step 16",
      "order alex unpack case",
      "step 2",
    ]);
  }
  expect(box(console).integrity).toBe(5);
  expect(get(console, "site-6:vial")).toMatchObject({
    amount: 1,
    integrity: 100,
    location: { kind: "ground" },
  });
  expect(executeLine(console, "order alex pack vial case").output).toContain(
    "too worn",
  );
});

it("incapacity interrupts sealing before closure and a missing source fails explicitly", () => {
  let console = play(visit(), ["order alex pack vial case"]);
  actor(console).canAct = false;
  console = executeLine(console, "step").console;
  expect(actor(console).queue).toHaveLength(0);
  expect(box(console).integrity).toBe(45);
  expect(get(console, "site-6:vial").location.kind).toBe("ground");
  console = play(visit(), ["order alex pack vial case"]);
  const actionId = actor(console).queue[0]!.id;
  delete console.session.state.sites[console.siteId]!.entities["site-6:vial"];
  console = executeLine(console, "step").console;
  expect(console.session.events).toContainEqual(
    expect.objectContaining({
      kind: "failed",
      actionId,
      entityId: "site-1:alex",
      reason: "The target is no longer present.",
    }),
  );
  expect(box(console).integrity).toBe(45);
});
