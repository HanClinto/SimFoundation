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
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import { materials } from "../../src/simulation/catalog";
import { facilityInUse } from "../../src/simulation/core/entity/Facility";

const lines = fs
  .readFileSync(
    new URL(
      "../../src/simulation/catalog/campaign/tests/research-engineering.txt",
      import.meta.url,
    ),
    "utf8",
  )
  .split(/\r?\n/);
const craftOrder = "order casey craft workshop damped-restraint";
const home = (c: ConsoleState) =>
  c.session.state.sites[c.session.campaign!.homeId]!;
const outputId = "site-1:workshop:crafted-1";

function worker(c: ConsoleState, name: string) {
  const entity = home(c).entities[`site-1:${name}`];
  if (entity?.kind !== "pawn") throw new Error("Expected worker.");
  return entity;
}
function bench(c: ConsoleState) {
  const entity = home(c).entities["site-1:workshop"];
  if (entity?.kind !== "facility") throw new Error("Expected workshop.");
  return entity;
}
function play(c: ConsoleState, commands: readonly string[]) {
  for (const line of commands) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    c = result.console;
  }
  return c;
}
function prepared() {
  return play(openConsole(), lines.slice(0, lines.indexOf(craftOrder)));
}
function funded() {
  return play(prepared(), [craftOrder, "step"]);
}
function payment(c: ConsoleState) {
  const action = worker(c, "casey").queue[0]?.action;
  if (action?.kind !== "craft" || !action.funding)
    throw new Error("Expected funded craft.");
  return action;
}

it("plays controlled observation, supply-backed crafting and awake care using the same subject", () => {
  let c = openConsole();
  let replayed = false;
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    expect(result.output, line).not.toMatch(
      /Advanced.*(?:blocked|failed|interrupted|1000-tick limit)/i,
    );
    c = result.console;
    if (line === craftOrder) {
      c = play(c, ["step"]);
      const paid = payment(c);
      expect(home(c).entities[paid.funding!.inputs[0]!.sourceId]!.amount).toBe(
        0,
      );
      expect(home(c).entities[outputId]).toBeUndefined();
      const restored = restoreSession(JSON.stringify(c.session))!;
      expect(stepSession(restored, 20)).toEqual(stepSession(c.session, 20));
      c = { ...c, session: restored };
      replayed = true;
    }
    if (line === "order alex restrain specimen @held") {
      const subject = home(c).entities["site-13:specimen"];
      expect(subject).toMatchObject({ canAct: true, acceptsEscort: false });
      if (subject?.kind !== "pawn") throw new Error("Expected actual subject.");
      expect(subject.health!.subdual).toBeUndefined();
    }
    const ids = [
      ...Object.values(c.session.state.sites),
      ...Object.values(c.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size, line).toBe(ids.length);
  }
  expect(replayed).toBe(true);
  const output = home(c).entities[outputId];
  expect(output).toMatchObject({
    definitionId: "damped-kinetic-restraint",
    restraint: { attached: false, wearPerTick: 0.5 },
    crafted: {
      actorId: "site-1:casey",
      stationId: "site-1:workshop",
      inputs: [{ amount: 2 }],
      recipeId: "damped-restraint",
      research: {
        stationId: "site-1:holding",
        finding: {
          planId: "kinetic-damping",
          actorId: "site-1:alex",
          sourceIds: ["site-13:specimen"],
        },
      },
    },
  });
  expect(output!.integrity).toBeGreaterThan(100);
  expect(output!.integrity).toBeLessThan(200);
  if (output?.kind !== "item" || !output.crafted)
    throw new Error("Expected crafted band.");
  expect(output.crafted.tick - output.crafted.startedTick).toBe(15);
  expect(output.crafted.research.finding.tick).toBeLessThan(
    output.crafted.startedTick,
  );
  expect(home(c).entities[output.crafted.inputs[0]!.sourceId]!.amount).toBe(0);
  expect(home(c).entities["site-1:parts"]!.amount).toBe(1);
  expect(home(c).entities["site-1:suppressor"]).toMatchObject({
    equipment: { subdual: { charges: 1 } },
  });
  expect(home(c).entities["site-13:specimen"]).toMatchObject({
    playerControllable: false,
    acceptsEscort: false,
    canAct: true,
    location: { kind: "carried", carrierId: "site-1:holding" },
    health: { bloodLoss: 0, wounds: [{ id: "prior-lesion", severity: 0 }] },
  });
  expect(bench(c).crafting!.nextItemId).toBe(2);
});

it("rejects unknown or undiscovered designs without spending, even with supplied paid-state markers", () => {
  const c = openConsole();
  const before = JSON.stringify(c);
  expect(executeLine(c, craftOrder).output).toContain(
    "Research required: kinetic-damping",
  );
  expect(
    executeLine(c, "order casey craft workshop imaginary").output,
  ).toContain("Unknown or invalid design");
  const paid = payment(funded());
  const result = executeCommand(
    c.session.state,
    {
      kind: "enqueue",
      siteId: c.siteId,
      entityId: "site-1:casey",
      action: paid,
    },
    materials,
  );
  expect(result.code).toBe("rejected");
  expect(result.reason).toContain("Research required");
  expect(JSON.stringify(c)).toBe(before);
});

it("blocks missing physical inputs without spending or producing an item", () => {
  let c = prepared();
  const source = Object.values(home(c).entities).find(
    (e) => e.id.startsWith("site-1:parts:portion") && e.amount === 2,
  )!;
  c = play(c, [
    `order casey deliver ${source.id} 1 1`,
    "finish casey",
    craftOrder,
    "finish casey",
  ]);
  expect(executeLine(c, "queue casey").output).toContain(
    "Bring 2 maintenance-parts",
  );
  expect(home(c).entities[source.id]!.amount).toBe(2);
  expect(home(c).entities[outputId]).toBeUndefined();
});

it("cancellation retains spent materials and reissuing cannot reuse caller-supplied progress or payment", () => {
  let c = funded();
  const previous = structuredClone(payment(c));
  const sourceId = previous.funding!.inputs[0]!.sourceId;
  c = play(c, ["cancel casey"]);
  expect(home(c).entities[sourceId]!.amount).toBe(0);
  expect(home(c).entities[outputId]).toBeUndefined();
  const result = executeCommand(
    c.session.state,
    {
      kind: "enqueue",
      siteId: c.siteId,
      entityId: "site-1:casey",
      action: { ...previous, workTicks: 15 },
    },
    materials,
  );
  expect(result.code).toBe("accepted");
  c = { ...c, session: { ...c.session, state: result.state } };
  expect(worker(c, "casey").queue[0]!.action).toEqual({
    kind: "craft",
    targetId: "site-1:workshop",
    recipeId: "damped-restraint",
    workTicks: 0,
  });
  c = play(c, ["finish casey"]);
  expect(executeLine(c, "queue casey").output).toContain(
    "Bring 2 maintenance-parts",
  );
  expect(home(c).entities[outputId]).toBeUndefined();
  expect(bench(c).crafting!.nextItemId).toBe(1);
});

it("resolves competing workers in actor order and holds a paid bench across progress resets until resolution", () => {
  let c = play(prepared(), [
    "order alex move 6 1",
    "finish alex",
    craftOrder,
    "order alex craft workshop damped-restraint",
    "step",
  ]);
  expect(worker(c, "alex").queue[0]!.action).toMatchObject({
    kind: "craft",
    workTicks: 1,
    funding: { inputs: [{ amount: 2 }] },
  });
  expect(worker(c, "casey").queue[0]!.blockedReason).toContain("occupied");
  expect(home(c).entities[outputId]).toBeUndefined();
  c = funded();
  worker(c, "casey").canAct = false;
  payment(c).workTicks = 0;
  expect(facilityInUse(home(c), bench(c).id)).toBe(true);
  expect(
    executeLine(c, "order alex craft workshop damped-restraint").output,
  ).toContain("occupied");
  home(c).entities["site-1:vest"]!.integrity = 50;
  expect(
    executeLine(c, "order alex repair-equipment vest workshop").output,
  ).toContain("occupied");
  c = play(c, ["step"]);
  expect(worker(c, "casey").queue).toEqual([]);
  expect(facilityInUse(home(c), bench(c).id)).toBe(false);
  expect(home(c).entities[outputId]).toBeUndefined();
});

it("requires clearing the previous output before starting another item", () => {
  let c = play(prepared(), [
    craftOrder,
    "finish casey",
    craftOrder,
    "finish casey",
  ]);
  expect(executeLine(c, "queue casey").output).toContain(
    "Clear the previous crafted item",
  );
  const original = structuredClone(home(c).entities[outputId]);
  expect(bench(c).crafting!.nextItemId).toBe(2);
  c = play(c, ["cancel casey"]);
  expect(home(c).entities[outputId]).toEqual(original);
});

it("reports a conflicting output identity without overwriting it or charging twice", () => {
  let c = funded();
  const sourceId = payment(c).funding!.inputs[0]!.sourceId;
  const existing = {
    ...structuredClone(home(c).entities["site-1:restraint"]!),
    id: outputId,
  };
  home(c).entities[outputId] = existing;
  c = play(c, ["finish casey"]);
  expect(executeLine(c, "queue casey").output).toContain(
    "identity is already in use",
  );
  expect(home(c).entities[outputId]).toEqual(existing);
  expect(home(c).entities[sourceId]!.amount).toBe(0);
  expect(bench(c).crafting!.nextItemId).toBe(1);
});

it("funds from split accessible stacks atomically, without spending another worker's carried materials", () => {
  let c = prepared();
  const source = Object.values(home(c).entities).find(
    (e) => e.id.startsWith("site-1:parts:portion") && e.amount === 2,
  )!;
  c = play(c, [
    "order alex move 6 1",
    "finish alex",
    `order casey take ${source.id} 1`,
    "finish casey",
    "order casey give @held alex",
    "finish casey",
    craftOrder,
    "finish casey",
  ]);
  expect(executeLine(c, "queue casey").output).toContain(
    "Bring 2 maintenance-parts",
  );
  expect(home(c).entities[source.id]!.amount).toBe(1);
  expect(home(c).entities[outputId]).toBeUndefined();
  // A real handoff makes the second portion accessible to the waiting builder.
  c = play(c, ["order alex give @held casey", "finish alex", "finish casey"]);
  const output = home(c).entities[outputId];
  if (output?.kind !== "item" || !output.crafted)
    throw new Error("Expected crafted item.");
  expect(output.crafted.inputs).toHaveLength(2);
  for (const input of output.crafted.inputs) {
    expect(input.amount).toBe(1);
    expect(home(c).entities[input.sourceId]!.amount).toBe(0);
  }
  expect(output.crafted.inputs.map((input) => input.sourceId)).toEqual(
    output.crafted.inputs.map((input) => input.sourceId).sort(),
  );
});
