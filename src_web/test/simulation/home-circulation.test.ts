import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";

it("lets a relieved worker leave the guest-bed area while a neighboring rest commitment remains", () => {
  let c = openConsole();
  const home = c.session.state.sites["site-1"]!;
  const ben = home.entities["site-1:ben"] as Pawn;
  const casey = home.entities["site-1:casey"] as Pawn;
  ben.location = { kind: "ground", position: { x: 9, y: 2 } };
  casey.location = { kind: "ground", position: { x: 9, y: 3 } };
  c = executeLine(c, "order casey wait 100").console;
  c = executeLine(c, "prepare gallery ben").console;
  const result = executeLine(c, "finish ben");
  expect(result.output).toContain("Watched commitments finished.");
  const after = result.console.session.state.sites["site-1"]!;
  expect(after.entities[casey.id]!.location).toEqual(casey.location);
  expect(after.entities[ben.id]!.location).toEqual({
    kind: "ground",
    position: { x: 2, y: 7 },
  });
  expect(
    Object.values(after.entities).filter(
      (entity) => entity.definitionId === "armchair",
    ),
  ).toHaveLength(1);
  expect(after.entities["site-1:chair"]!.id).toBe("site-1:chair");
});
