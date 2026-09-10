import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import {
  advanceSimulation,
  createSimulation,
  type Simulation,
} from "../../src/simulation/core/Simulation";
import { materials } from "../../src/simulation/catalog";
import { restraintFor } from "../../src/simulation/core/entity/pawn/Custody";

it("the actually crafted band doubles the awake custody window without preventing eventual escape", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/research-engineering.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = openConsole();
  for (const line of lines.slice(
    0,
    lines.indexOf("order alex deliver specimen 3 1"),
  )) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    c = result.console;
  }
  const home = c.session.state.sites[c.session.campaign!.homeId]!;
  const subject = home.entities["site-13:specimen"];
  if (subject?.kind !== "pawn") throw new Error("Expected actual subject.");
  expect(subject.health!.subdual).toBeUndefined();
  for (const [bandId, lifetime] of [
    ["site-1:restraint", 200],
    ["site-1:workshop:crafted-1", 400],
  ] as const) {
    const band = home.entities[bandId];
    if (band?.kind !== "item" || !band.restraint)
      throw new Error("Expected actual band.");
    expect(band.integrity).toBe(200);
    // Isolate conscious wear outside holding, using the two real bands from play.
    let state: Simulation = {
      ...createSimulation(),
      sites: {
        [home.id]: {
          ...home,
          entities: {
            [subject.id]: {
              ...structuredClone(subject),
              location: { kind: "ground", position: { x: 3, y: 1 } },
            },
            [band.id]: {
              ...structuredClone(band),
              restraint: { ...band.restraint, attached: true },
              location: { kind: "carried", carrierId: subject.id },
            },
          },
        },
      },
    };
    let warnings = 0;
    for (let elapsed = 1; elapsed <= lifetime; elapsed++) {
      const next = advanceSimulation(state, materials);
      state = next.state;
      warnings += next.events.filter(
        (event) => event.kind === "warning" && event.targetId === band.id,
      ).length;
      expect(!!restraintFor(state.sites[home.id]!.entities, subject.id)).toBe(
        elapsed < lifetime,
      );
      expect(next.events.some((event) => event.kind === "escaped")).toBe(
        elapsed === lifetime,
      );
      if (lifetime === 400 && elapsed === 200)
        expect(state.sites[home.id]!.entities[band.id]!.integrity).toBe(100);
    }
    expect(warnings).toBe(1);
    expect(state.sites[home.id]!.entities[subject.id]).toMatchObject({
      acceptsEscort: false,
    });
    expect(state.sites[home.id]!.entities[band.id]).toMatchObject({
      integrity: 0,
      location: { kind: "ground" },
    });
    if (band.crafted)
      expect(state.sites[home.id]!.entities[band.id]).toMatchObject({
        crafted: band.crafted,
      });
  }
});
