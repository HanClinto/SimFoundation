import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../src/adapters/cli/Console";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";

function prepared() {
  let c = openConsole();
  for (const line of [
    "order alex equip suppressor",
    "order alex equip vest",
    "order alex take restraint",
    "finish alex",
    "prepare intervention alex",
    "finish alex",
  ])
    c = executeLine(c, line).console;
  return c;
}
it("previews the exact prepared equipment/cargo departure without cost, risk mutation or ID consumption", () => {
  const c = prepared();
  const before = JSON.stringify(c);
  const preview = executeLine(c, "preview-send intervention alex");
  expect(preview.console).toBe(c);
  expect(JSON.stringify(c)).toBe(before);
  const data = JSON.parse(preview.output);
  expect(data.preview).toBe(true);
  expect(data.duration).toBe(8);
  expect(
    data.manifest.map((entity: { id: string }) => entity.id).sort(),
  ).toEqual([
    "site-1:alex",
    "site-1:restraint",
    "site-1:suppressor",
    "site-1:vest",
  ]);
  expect(
    data.manifest.find(
      (entity: { id: string }) => entity.id === "site-1:suppressor",
    ).equipment.subdual.charges,
  ).toBe(2);
  expect(
    (c.session.state.sites["site-1"]!.entities["site-1:alex"] as Pawn).health!
      .mortality,
  ).toBeUndefined();
  const sent = executeLine(c, "send intervention alex").console;
  expect(
    Object.keys(sent.session.state.transfers["transfer-1"]!.entities).sort(),
  ).toEqual(data.manifest.map((entity: { id: string }) => entity.id).sort());
  expect(
    c.session.state.sites["site-1"]!.entities["site-1:transport"]!.amount,
  ).toBe(4);
  expect(
    sent.session.state.sites["site-1"]!.entities["site-1:transport"]!.amount,
  ).toBe(3);
});
it("uses the same preparation and research blockers instead of a success-shaped manifest", () => {
  let c: ConsoleState = openConsole();
  const before = JSON.stringify(c);
  expect(() => executeLine(c, "preview-send intervention alex")).toThrow(
    "loading area",
  );
  expect(() => executeLine(c, "preview-send kestrel alex")).toThrow(
    "Home study required",
  );
  expect(JSON.stringify(c)).toBe(before);
  c = executeLine(c, "prepare gallery alex").console;
  expect(() => executeLine(c, "preview-send gallery alex")).toThrow(
    "queued work",
  );
});
