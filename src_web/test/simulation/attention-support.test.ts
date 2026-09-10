import { expect, it } from "vitest";
import { entities, materials } from "../../src/simulation/catalog";
import { scp173Site } from "../../src/simulation/catalog/quests/scp173/setup";
import {
  createSimulation,
  advanceSimulation,
} from "../../src/simulation/core/Simulation";
import { instantiateSite } from "../../src/simulation/core/site/Site";
import {
  directWatchers,
  supervisionBlocker,
} from "../../src/simulation/core/entity/pawn/Attention";
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import { canSee } from "../../src/simulation/core/site/Sight";

function fixture() {
  const created = instantiateSite(
    createSimulation(),
    {
      ...scp173Site,
      entities: [
        ...scp173Site.entities,
        {
          id: "human",
          definitionId: "field-agent",
          location: { kind: "ground", position: { x: 6, y: 1 } },
          overrides: { autonomy: false },
        },
        {
          id: "pod",
          definitionId: "scp-131",
          location: { kind: "ground", position: { x: 4, y: 1 } },
        },
        {
          id: "bed",
          definitionId: "bed",
          location: { kind: "ground", position: { x: 2, y: 4 } },
        },
      ],
    },
    entities,
  );
  return { state: created.state, siteId: created.siteId };
}
type Fixture = ReturnType<typeof fixture>;
const id = (f: Fixture, name: string) => `${f.siteId}:${name}`;
const site = (f: Fixture) => f.state.sites[f.siteId]!;
function pawn(f: Fixture, name: string) {
  const entity = site(f).entities[id(f, name)];
  if (entity?.kind !== "pawn") throw new Error("Expected pawn.");
  return entity;
}

it("a real local companion holds the source but cannot replace the required human work team", () => {
  const f = fixture();
  expect(
    directWatchers(site(f), id(f, "subject")).map((observer) => observer.id),
  ).toEqual([id(f, "pod")]);
  const station = site(f).entities[id(f, "station")];
  if (station?.kind !== "facility") throw new Error("Expected station.");
  expect(supervisionBlocker(site(f), station, id(f, "human"))).toContain(
    "2 active",
  );
  const position = pawn(f, "subject").location;
  for (let i = 0; i < 10; i++)
    f.state = advanceSimulation(f.state, materials).state;
  expect(pawn(f, "subject").location).toEqual(position);
  expect(pawn(f, "human").health!.wounds).toEqual([]);
  expect(pawn(f, "pod").needs).toEqual({});
  expect(pawn(f, "pod").queue).toEqual([]);
  pawn(f, "pod").canAct = false;
  expect(canSee(site(f), pawn(f, "subject"), id(f, "human"))).toBe(true);
  const next = advanceSimulation(f.state, materials);
  expect(
    next.state.sites[f.siteId]!.entities[id(f, "subject")]!.location,
  ).not.toEqual(position);
});

it.each([
  "carried",
  "incapable",
  "no-human",
  "unseen-source",
  "unseen-human",
  "wrong-source",
] as const)("provides no supplemental coverage when %s", (kind) => {
  const f = fixture();
  const pod = pawn(f, "pod");
  const human = pawn(f, "human");
  if (kind === "carried")
    pod.location = { kind: "carried", carrierId: human.id };
  if (kind === "incapable") pod.canAct = false;
  if (kind === "no-human") human.canAct = false;
  if (kind === "unseen-source")
    site(f).tiles = { g: { blocksMovement: true, blocksSight: true } };
  if (kind === "unseen-human") {
    human.location = { kind: "ground", position: { x: 1, y: 1 } };
    f.state.sites[f.siteId] = {
      ...site(f),
      terrain: site(f).terrain.map((row, index) =>
        index === 1 ? "#..#.g.....#" : row,
      ),
    };
    expect(canSee(site(f), pod, id(f, "subject"))).toBe(true);
    expect(canSee(site(f), pod, human.id)).toBe(false);
  }
  if (kind === "wrong-source")
    pawn(f, "subject").definitionId = "kinetic-specimen";
  expect(directWatchers(site(f), id(f, "subject"))).toEqual([]);
});

it("a sleeping nearby person is not a conscious host and the visitor cannot be programmed as a human watcher", () => {
  const f = fixture();
  site(f).entities[id(f, "bed")]!.location = {
    kind: "ground",
    position: { x: 7, y: 1 },
  };
  expect(directWatchers(site(f), id(f, "subject"))).toHaveLength(1);
  const result = executeCommand(
    f.state,
    {
      kind: "enqueue",
      siteId: f.siteId,
      entityId: id(f, "human"),
      action: { kind: "sleep", targetId: id(f, "bed"), workTicks: 0 },
    },
    materials,
  );
  expect(result.code).toBe("accepted");
  f.state = advanceSimulation(result.state, materials).state;
  expect(pawn(f, "human").queue[0]!.action).toMatchObject({
    kind: "sleep",
    workTicks: 1,
  });
  expect(directWatchers(site(f), id(f, "subject"))).toEqual([]);
  const blocked = executeCommand(
    f.state,
    {
      kind: "enqueue",
      siteId: f.siteId,
      entityId: id(f, "pod"),
      action: {
        kind: "watch",
        targetId: id(f, "subject"),
        ticks: 100,
        workTicks: 0,
      },
    },
    materials,
  );
  expect(blocked.reason).toContain("Player control");
});
