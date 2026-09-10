import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";

function transfer() {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/restrained-return.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = openConsole();
  for (const line of lines.slice(0, lines.indexOf("send home alex") + 1))
    c = executeLine(c, line).console;
  return c;
}
it("inspects real transfer-owned subject, band and worn equipment without pretending there is a site position", () => {
  const c = transfer();
  const before = JSON.stringify(c);
  const result = JSON.parse(executeLine(c, "inspect site-13:specimen").output);
  expect(result.owner).toMatchObject({
    kind: "transit",
    destinationId: "site-1",
    mapPosition: null,
  });
  expect(result.entity.requiresRestraint).toBe(true);
  expect(result.restraint.id).toBe("site-1:restraint");
  expect(result.contents).toContainEqual(
    expect.objectContaining({ id: "site-1:restraint" }),
  );
  const worker = JSON.parse(executeLine(c, "inspect @1").output);
  expect(worker.contents).toContainEqual(
    expect.objectContaining({ id: "site-1:suppressor" }),
  );
  expect(worker.needCandidate).toBeUndefined();
  expect(worker.concern).toBeUndefined();
  expect(JSON.stringify(c)).toBe(before);
});
it("global read-only inspection never grants gameplay control during transit or across selected sites", () => {
  const c = transfer();
  const before = JSON.stringify(c);
  expect(() => executeLine(c, "order alex wait 1")).toThrow("Unknown entity");
  expect(() => executeLine(c, "order ben take site-1:vest")).toThrow(
    "Unknown entity",
  );
  expect(() => executeLine(c, "inspect @held")).toThrow("order's worker");
  expect(JSON.stringify(c)).toBe(before);
});
it("shows blocked admission from the actual transfer and uses actual site context after arrival", () => {
  let c = transfer();
  const casey = c.session.state.sites["site-1"]!.entities["site-1:casey"]!;
  casey.location = { kind: "ground", position: { x: 2, y: 7 } };
  c = executeLine(c, "step 8").console;
  expect(
    JSON.parse(executeLine(c, "inspect @1").output).owner.blockedReason,
  ).toContain("occupied");
  c = executeLine(c, "site home").console;
  c = executeLine(c, "order casey move 4 3").console;
  c = executeLine(c, "finish casey").console;
  const result = JSON.parse(executeLine(c, "inspect site-13:specimen").output);
  expect(result.owner).toMatchObject({ kind: "site", id: "site-1" });
});
it("prefers local aliases and rejects ambiguous nonlocal ones", () => {
  let c = openConsole();
  c = executeLine(c, "site accident").console;
  expect(() => executeLine(c, "inspect bed")).toThrow("Ambiguous");
  const result = JSON.parse(executeLine(c, "inspect site-1:bed").output);
  expect(result.owner.id).toBe("site-1");
  c = executeLine(c, "site home").console;
  expect(JSON.parse(executeLine(c, "inspect bed").output).entity.id).toBe(
    "site-1:bed",
  );
});
