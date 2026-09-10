import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import { instantiateEntity } from "../../src/simulation/core/site/EntityPlacement";
import { entities } from "../../src/simulation/catalog";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import {
  restoreSession,
  stepSession,
} from "../../src/application/ScenarioSession";

function homeThreat() {
  const c = openConsole();
  const home = c.session.state.sites["site-1"]!;
  home.entities["home-threat"] = instantiateEntity(
    {
      id: "home-threat",
      definitionId: "kinetic-specimen",
      location: { kind: "ground", position: { x: 2, y: 3 } },
    },
    entities,
  );
  return c;
}

it("an actual dangerous home impact exposes a previously peaceful worker and warns immediately", () => {
  let c = homeThreat();
  const initial = c.session.state.sites["site-1"]!.entities[
    "site-1:alex"
  ] as Pawn;
  expect(initial.health!.mortality).toBeUndefined();
  const result = executeLine(c, "run 20");
  expect(result.alarm).toMatchObject({
    kind: "warning",
    entityId: initial.id,
    targetId: "home-threat",
  });
  c = result.console;
  const victim = c.session.state.sites["site-1"]!.entities[initial.id] as Pawn;
  expect(victim.health!.wounds.length).toBeGreaterThan(0);
  expect(victim.health!.mortality!.fatalAfterTicks).toBe(12);
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 100)).toEqual(stepSession(c.session, 100));
  c = executeLine(c, "step 100").console;
  expect(
    (c.session.state.sites["site-1"]!.entities[initial.id] as Pawn).health!
      .death,
  ).toBeDefined();
});

it("further impacts never reset a previously established fatal interval", () => {
  let c = homeThreat();
  const actor = c.session.state.sites["site-1"]!.entities[
    "site-1:alex"
  ] as Pawn;
  actor.health!.mortality = { criticalTicks: 0, fatalAfterTicks: 3 };
  c = executeLine(c, "step 50").console;
  const after = c.session.state.sites["site-1"]!.entities[actor.id] as Pawn;
  expect(after.health!.mortality!.fatalAfterTicks).toBe(3);
  expect(after.health!.death).toBeDefined();
});

it("ordinary uncapped peaceful-trial attacks do not silently acquire fatal exposure", () => {
  const c = openConsole("response");
  const result = stepSession(c.session, 30);
  for (const site of Object.values(result.state.sites))
    for (const entity of Object.values(site.entities))
      if (entity.kind === "pawn")
        expect(entity.health?.mortality).toBeUndefined();
});
