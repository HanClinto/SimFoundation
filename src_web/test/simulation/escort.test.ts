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
import { positionOf, distance } from "../../src/simulation/core/site/TileMap";

function person(
  console: ConsoleState,
  siteId = console.siteId,
  id = "site-5:mira",
): Pawn {
  const entity = console.session.state.sites[siteId]!.entities[id];
  if (entity?.kind !== "pawn") throw new Error(`Missing pawn ${id}`);
  return entity;
}

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

function visit() {
  return play(openConsole(), [
    "prepare care casey",
    "step 12",
    "send care casey",
    "step 8",
    "site care",
    "order casey treat mira",
    "step 16",
  ]);
}

it("plays living transfer and home bed admission without cloning or erasing injury", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/care-transfer.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  const console = play(openConsole(), lines);
  expect(person(console)).toMatchObject({
    acceptsEscort: true,
    playerControllable: false,
    autonomy: true,
    health: {
      wounds: [
        {
          severity: 10,
          bleeding: 0,
          stabilization: { actorId: "site-1:casey", sourceId: "site-1:casey" },
        },
      ],
    },
  });
  expect(person(console).health!.bloodLoss).toBeGreaterThan(0);
  expect(person(console).needs.fatigue!.value).toBeLessThan(70);
  expect(
    person(console, "site-1", "site-1:casey").response!.medicine!.supplies,
  ).toBe(1);
  expect(
    console.session.state.sites["site-5"]!.entities["site-5:mira"],
  ).toBeUndefined();
  expect(console.session.campaign!.admissions["site-5:mira"]).toMatchObject({
    bedId: "site-1:bed",
  });
  expect(console.session.campaign!.staffIds).toHaveLength(3);
  expect(() => executeLine(console, "admit mira bed")).toThrow();
});

it("leader and follower move only on their own turn and replay mid-escort deterministically", () => {
  let console = play(visit(), ["order casey escort mira 2 3"]);
  let observedFollowing = false;
  for (let tick = 0; tick < 24; tick++) {
    const before = console.session.state.sites[console.siteId]!;
    const positions = ["site-1:casey", "site-5:mira"].map(
      (id) => positionOf(before, id)!,
    );
    const restored = restoreSession(JSON.stringify(console.session))!;
    const next = stepSession(console.session, 1);
    expect(next).toEqual(stepSession(restored, 1));
    console = { ...console, session: next };
    const after = next.state.sites[console.siteId]!;
    for (const [index, id] of ["site-1:casey", "site-5:mira"].entries())
      expect(
        distance(positions[index]!, positionOf(after, id)!),
      ).toBeLessThanOrEqual(1);
    observedFollowing ||= person(console).queue[0]?.action.kind === "follow";
  }
  expect(observedFollowing).toBe(true);
  expect(person(console).queue).toHaveLength(0);
  expect(person(console, console.siteId, "site-1:casey").queue).toHaveLength(0);
  expect(person(console).location).toEqual({
    kind: "ground",
    position: { x: 2, y: 3 },
  });
});

it("yields the destination to the passenger in a one-tile corridor", () => {
  let console = visit();
  const field = console.session.state.sites[console.siteId]!;
  field.terrain = [
    "############",
    "############",
    "############",
    "#..........#",
    "############",
    "############",
    "############",
  ];
  delete field.entities["site-5:field-bed"];
  person(console).location = { kind: "ground", position: { x: 9, y: 3 } };
  person(console, console.siteId, "site-1:casey").location = {
    kind: "ground",
    position: { x: 8, y: 3 },
  };
  console = play(console, ["order casey escort mira 2 3", "step 30"]);
  expect(person(console).location).toEqual({
    kind: "ground",
    position: { x: 2, y: 3 },
  });
  expect(person(console).queue).toHaveLength(0);
});

it("withdrawn consent interrupts following and blocks the escort without moving the person", () => {
  let console = play(visit(), ["order casey escort mira 2 3", "step 2"]);
  const location = structuredClone(person(console).location);
  person(console).acceptsEscort = false;
  console = play(console, ["step 4"]);
  expect(person(console).queue).toHaveLength(0);
  expect(person(console).location).toEqual(location);
  expect(executeLine(console, "queue casey").output).toContain(
    "explicitly accepts cooperative escort",
  );
});

it("cancelling the leader releases follow on the next tick and permits a new escort", () => {
  let console = play(visit(), ["order casey escort mira 2 3", "step 2"]);
  expect(person(console).queue[0]?.action.kind).toBe("follow");
  console = play(console, ["cancel casey", "step"]);
  expect(person(console).queue).toHaveLength(0);
  console = play(console, ["order casey escort mira 2 3", "step 24"]);
  expect(person(console).queue).toHaveLength(0);
});

it("refuses nonconsenting people and explains a blocked route until it is cleared", () => {
  const initial = openConsole();
  expect(executeLine(initial, "order alex escort ben 2 7").output).toContain(
    "explicitly accepts",
  );
  let console = visit();
  const field = console.session.state.sites[console.siteId]!;
  field.terrain = [
    "############",
    "#....#.....#",
    "#....#.....#",
    "#....#.....#",
    "#....#.....#",
    "#....#.....#",
    "############",
  ];
  console = play(console, ["order casey escort mira 2 3", "step 10"]);
  expect(executeLine(console, "queue casey").output).toMatch(
    /No route|no reachable location/,
  );
  console.session.state.sites[console.siteId]!.terrain = [
    "############",
    "#..........#",
    "#..........#",
    "#....#.....#",
    "#..........#",
    "#..........#",
    "############",
  ];
  console = play(console, ["step 24"]);
  expect(person(console).queue).toHaveLength(0);
});

it("incapacitated passengers use physical carry and retain their own injury through prepaid return", () => {
  let console = visit();
  person(console).canAct = false;
  const order = executeLine(console, "order casey escort mira 2 3");
  expect(order.output).toContain("stabilize and carry");
  console = play(console, [
    "order casey take mira",
    "step 4",
    "prepare home casey",
    "step 20",
    "send home casey",
    "step 8",
    "site home",
  ]);
  expect(person(console)).toMatchObject({
    canAct: false,
    location: { kind: "carried", carrierId: "site-1:casey" },
    health: { wounds: [{ severity: 10, bleeding: 0 }] },
  });
  expect(() => executeLine(console, "admit mira bed")).toThrow(
    "available cooperative person",
  );
});

it("partial withdrawal keeps the patient at the retained aid station and refuses patient-only departure", () => {
  let console = visit();
  expect(() => executeLine(console, "send home mira")).toThrow(
    "existing staff",
  );
  console = play(console, [
    "prepare home casey",
    "step 20",
    "send home casey",
    "step 8",
    "site home",
  ]);
  expect(person(console, "site-5")).toMatchObject({
    health: { wounds: [{ bleeding: 0 }] },
  });
  expect(console.session.campaign!.admissions).toEqual({});
});
