import fs from "node:fs";
import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";
import { directWatchers } from "../../src/simulation/core/entity/pawn/Attention";

const lines = fs
  .readFileSync(
    new URL(
      "../../src/simulation/catalog/quests/scp173/tests/watch-maintenance.txt",
      import.meta.url,
    ),
    "utf8",
  )
  .split(/\r?\n/);
function prepared() {
  let c = openConsole();
  for (const line of lines.slice(
    0,
    lines.indexOf("order ben service station"),
  )) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    c = result.console;
  }
  return c;
}
const site = (c: ConsoleState) => c.session.state.sites[c.siteId]!;
function pawn(c: ConsoleState, name: string) {
  const entity = Object.values(site(c).entities).find(
    (entity) => entity.name === name,
  );
  if (entity?.kind !== "pawn") throw new Error("Expected named worker.");
  return entity;
}
function play(c: ConsoleState, commands: string[]) {
  for (const line of commands) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    c = result.console;
  }
  return c;
}

it("refuses pending coverage, then releases only the outgoing Watch after actual activation without time/resource/ID changes", () => {
  let c = play(prepared(), [
    "order ben watch subject 120",
    "order alex wait 10",
  ]);
  const before = JSON.stringify(c);
  const pending = executeLine(c, "relieve alex ben");
  expect(pending.rejected).toBe(true);
  expect(pending.output).toContain("already be actively watching");
  expect(JSON.stringify(c)).toBe(before);
  c = play(c, ["step"]);
  const stateBefore = c.session.state;
  const laterAction = pawn(c, "alex").queue[1]!;
  const replacement = structuredClone(pawn(c, "ben"));
  const restored = restoreSession(JSON.stringify(c.session))!;
  const handoff = executeLine(c, "relieve alex ben");
  expect(handoff.rejected).not.toBe(true);
  expect(executeLine({ ...c, session: restored }, "relieve alex ben")).toEqual(
    handoff,
  );
  c = handoff.console;
  expect(c.session.state.tick).toBe(stateBefore.tick);
  expect(c.session.state.nextActionId).toBe(stateBefore.nextActionId);
  expect(pawn(c, "alex").queue).toEqual([laterAction]);
  expect(pawn(c, "ben")).toEqual(replacement);
  expect(directWatchers(site(c), `${c.siteId}:subject`)).toHaveLength(2);
  expect(site(c).entities[`${c.siteId}:cleaning`]!.amount).toBe(3);
  expect(stateBefore.sites[c.siteId]!.entities["site-1:alex"]).toMatchObject({
    queue: [{ action: { kind: "watch" } }, { action: { kind: "wait" } }],
  });
});

it("does not reduce two-observer coverage protecting a third worker's productive service", () => {
  let c = play(prepared(), ["order ben service station"]);
  for (let tick = 0; tick < 20; tick++) {
    const action = pawn(c, "ben").queue[0]?.action;
    if (action?.kind === "service" && action.workTicks > 0) break;
    c = play(c, ["step"]);
  }
  expect(pawn(c, "ben").queue[0]!.action).toMatchObject({
    kind: "service",
    workTicks: 1,
  });
  const before = JSON.stringify(c);
  const result = executeLine(c, "relieve alex casey");
  expect(result.rejected).toBe(true);
  expect(result.output).toContain("productive supervised work");
  expect(JSON.stringify(c)).toBe(before);
  c = play(c, [
    "finish ben",
    "order ben watch subject 120",
    "step",
    "relieve alex ben",
  ]);
  expect(directWatchers(site(c), `${c.siteId}:subject`)).toHaveLength(2);
});

it.each(["self", "uncontrolled", "different-subject", "incapable"] as const)(
  "rejects %s replacements without changing existing work",
  (kind) => {
    let c = prepared();
    if (kind === "different-subject") {
      const source = site(c).entities[`${c.siteId}:subject`]!;
      site(c).entities["other-subject"] = {
        ...structuredClone(source),
        id: "other-subject",
        name: "Other subject",
        location: { kind: "ground", position: { x: 8, y: 1 } },
      };
      c = play(c, ["order ben watch other-subject 120", "step"]);
    } else {
      c = play(c, ["order ben watch subject 120", "step"]);
    }
    if (kind === "uncontrolled") pawn(c, "ben").playerControllable = false;
    if (kind === "incapable") pawn(c, "ben").canAct = false;
    const before = JSON.stringify(c);
    expect(
      executeLine(c, `relieve alex ${kind === "self" ? "alex" : "ben"}`)
        .rejected,
    ).toBe(true);
    expect(JSON.stringify(c)).toBe(before);
  },
);
