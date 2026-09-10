import { expect, it } from "vitest";
import { Study } from "../../src/simulation/core/entity/pawn/actions/Study";
import { instantiateEntity } from "../../src/simulation/core/site/EntityPlacement";
import { entities, materials } from "../../src/simulation/catalog";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import type { Facility } from "../../src/simulation/core/entity/Facility";

it("study requires the right physical sources and records one finding without consuming them", () => {
  const pawn = instantiateEntity(
    {
      id: "actor",
      definitionId: "field-agent",
      location: { kind: "ground", position: { x: 0, y: 1 } },
    },
    entities,
  ) as Pawn;
  const station = instantiateEntity(
    {
      id: "station",
      definitionId: "research-desk",
      location: { kind: "ground", position: { x: 1, y: 1 } },
    },
    entities,
  ) as Facility;
  station.study = {
    plans: [
      {
        id: "comparison",
        title: "Comparison",
        ticks: 2,
        requires: ["packaged-meal"],
        finding: "A specific comparison.",
      },
    ],
    findings: [],
  };
  const sample = instantiateEntity(
    {
      id: "sample",
      definitionId: "packaged-meal",
      location: { kind: "ground", position: { x: 4, y: 1 } },
    },
    entities,
  );
  const context = {
    site: {
      id: "site",
      name: "Site",
      terrain: [".....", ".....", "....."],
      entities: { actor: pawn, station, sample },
    },
    pawn,
    materials,
    tick: 1,
    events: [],
  };
  const action = new Study({
    kind: "study",
    targetId: "station",
    planId: "comparison",
    workTicks: 0,
  });
  expect(action.tick(context).status).toBe("blocked");
  expect(station.study.findings).toEqual([]);
  sample.location = { kind: "carried", carrierId: pawn.id };
  expect(action.tick(context).status).toBe("running");
  sample.location = { kind: "ground", position: { x: 4, y: 1 } };
  expect(action.tick(context).status).toBe("blocked");
  expect(action.state.workTicks).toBe(0);
  sample.location = { kind: "carried", carrierId: pawn.id };
  expect(action.tick(context).status).toBe("running");
  expect(action.tick({ ...context, tick: 2 }).status).toBe("completed");
  expect(action.tick({ ...context, tick: 3 }).status).toBe("completed");
  expect(station.study.findings).toEqual([
    {
      planId: "comparison",
      title: "Comparison",
      text: "A specific comparison.",
      actorId: "actor",
      tick: 2,
      sourceIds: ["sample"],
    },
  ]);
  expect(sample.amount).toBe(1);
});
