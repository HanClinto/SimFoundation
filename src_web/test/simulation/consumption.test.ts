import { expect, it } from "vitest";
import {
  consumeMaterial,
  damageIntegrity,
} from "../../src/simulation/core/entity/Consumption";
import { instantiateEntity } from "../../src/simulation/core/site/EntityPlacement";
import { entities, materials } from "../../src/simulation/catalog";
import {
  createSimulation,
  advanceSimulation,
} from "../../src/simulation/core/Simulation";
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import { traversalAt } from "../../src/simulation/core/site/TileMap";
import { canSee } from "../../src/simulation/core/site/Visibility";
import { nourishmentFor } from "../../src/simulation/core/material/Material";
import { Read } from "../../src/simulation/core/entity/pawn/actions/Read";

function scenario(definitionId: string, tag: string, hunger = 100) {
  const pawn = instantiateEntity(
    {
      id: "consumer",
      definitionId: "field-agent",
      location: { kind: "ground", position: { x: 0, y: 1 } },
      overrides: {
        autonomy: false,
        eatingRate: 0.1,
        diet: [{ accepts: tag, efficiency: 1 }],
        needs: { hunger: { value: hunger, increasePerTick: 0 } },
      },
    },
    entities,
  ) as Pawn;
  const object = instantiateEntity(
    {
      id: "object",
      definitionId,
      location: { kind: "ground", position: { x: 1, y: 1 } },
    },
    entities,
  );
  return {
    pawn,
    object,
    state: {
      ...createSimulation(),
      sites: {
        site: {
          id: "site",
          name: "Test",
          terrain: ["...", "...", "..."],
          entities: { consumer: pawn, object },
        },
      },
    },
  };
}

it("material consumption reduces remaining integrity, but damage does not remove edible material", () => {
  const object = { amount: 4, integrity: 100 };
  damageIntegrity(object, 20);
  expect(object).toEqual({ amount: 4, integrity: 80 });
  expect(consumeMaterial(object, 1)).toBe(1);
  expect(object).toEqual({ amount: 3, integrity: 60 });
  expect(consumeMaterial(object, 10)).toBe(3);
  expect(object).toEqual({ amount: 0, integrity: 0 });
});

it("object nutrition overrides material density while the diet controls conversion and compatibility", () => {
  expect(
    nourishmentFor(materials["plant-food"]!, [
      { accepts: "edible-plant", efficiency: 0.5 },
    ]),
  ).toBe(15);
  expect(
    nourishmentFor(
      materials["plant-food"]!,
      [{ accepts: "edible-plant", efficiency: 0.5 }],
      60,
    ),
  ).toBe(30);
  expect(
    nourishmentFor(
      materials.steel!,
      [{ accepts: "edible-plant", efficiency: 1 }],
      60,
    ),
  ).toBe(0);
  expect(
    nourishmentFor(
      materials["plant-food"]!,
      [{ accepts: "edible-plant", efficiency: 1 }],
      0,
    ),
  ).toBe(0);
});

it.each([
  ["automatic-steel-door", "metal"],
  ["bookshelf", "wood"],
])(
  "gradually consumes a %s, reducing integrity and removing its obstruction only on depletion",
  (definitionId, tag) => {
    const { pawn, object, state } = scenario(definitionId, tag);
    damageIntegrity(object, 20);
    const behind = instantiateEntity(
      {
        id: "behind",
        definitionId: "field-agent",
        location: { kind: "ground", position: { x: 2, y: 1 } },
        overrides: { autonomy: false },
      },
      entities,
    );
    const initial = {
      ...state,
      sites: {
        site: {
          ...state.sites.site,
          entities: { consumer: pawn, object, behind },
        },
      },
    };
    const ordered = executeCommand(
      initial,
      {
        kind: "enqueue",
        siteId: "site",
        entityId: pawn.id,
        action: { kind: "eat", targetId: object.id },
      },
      materials,
    );
    expect(ordered.code).toBe("accepted");
    let result = advanceSimulation(ordered.state, materials);
    expect(result.state.sites.site!.entities.object!.amount).toBeCloseTo(0.9);
    expect(result.state.sites.site!.entities.object!.integrity).toBeCloseTo(72);
    expect(
      canSee(
        result.state.sites.site!,
        result.state.sites.site!.entities.consumer as Pawn,
        "behind",
      ),
    ).toBe(false);
    expect(result.events.some((event) => event.kind === "opened")).toBe(false);
    for (let tick = 0; tick < 9; tick++)
      result = advanceSimulation(result.state, materials);
    expect(result.state.sites.site!.entities.object).toBeUndefined();
    expect(
      traversalAt(result.state.sites.site!, { x: 1, y: 1 }, pawn.id).kind,
    ).toBe("clear");
    expect(
      canSee(
        result.state.sites.site!,
        result.state.sites.site!.entities.consumer as Pawn,
        "behind",
      ),
    ).toBe(true);
    expect(
      (result.state.sites.site!.entities.consumer as Pawn).needs.hunger!.value,
    ).toBeCloseTo(99);
  },
);

it("a different pawn can finish a partially consumed carried meal without replacing its identity", () => {
  const { pawn, object, state } = scenario("packaged-meal", "edible-plant", 6);
  object.location = { kind: "carried", carrierId: pawn.id };
  let current = executeCommand(
    state,
    {
      kind: "enqueue",
      siteId: "site",
      entityId: pawn.id,
      action: { kind: "eat", targetId: object.id },
    },
    materials,
  ).state;
  for (let tick = 0; tick < 2; tick++)
    current = advanceSimulation(current, materials).state;
  expect(current.sites.site!.entities.object!.amount).toBeCloseTo(0.8);
  expect(current.sites.site!.entities.object!.location).toEqual({
    kind: "carried",
    carrierId: pawn.id,
  });
  current = executeCommand(
    current,
    {
      kind: "enqueue",
      siteId: "site",
      entityId: pawn.id,
      action: { kind: "drop", targetId: object.id },
    },
    materials,
  ).state;
  current = advanceSimulation(current, materials).state;
  const other = instantiateEntity(
    {
      id: "other",
      definitionId: "field-agent",
      location: { kind: "ground", position: { x: 1, y: 1 } },
      overrides: {
        autonomy: false,
        needs: { hunger: { value: 24, increasePerTick: 0 } },
      },
    },
    entities,
  );
  current.sites.site!.entities.other = other;
  current = executeCommand(
    current,
    {
      kind: "enqueue",
      siteId: "site",
      entityId: other.id,
      action: { kind: "eat", targetId: object.id },
    },
    materials,
  ).state;
  for (let tick = 0; tick < 8; tick++)
    current = advanceSimulation(current, materials).state;
  expect(current.sites.site!.entities.object).toBeUndefined();
  expect(
    (current.sites.site!.entities.other as Pawn).needs.hunger!.value,
  ).toBeCloseTo(0);
});

it("occupied furniture and living pawns are not consumable targets", () => {
  const { pawn, object, state } = scenario("bookshelf", "wood");
  const reader = instantiateEntity(
    {
      id: "reader",
      definitionId: "field-agent",
      location: { kind: "ground", position: { x: 1, y: 2 } },
      overrides: {
        queue: [
          {
            id: "reading",
            source: "player",
            elapsed: 1,
            blockedReason: null,
            action: { kind: "read", targetId: "object", workTicks: 1 },
          },
        ],
      },
    },
    entities,
  );
  const initial = {
    ...state,
    sites: {
      site: {
        ...state.sites.site,
        entities: { consumer: pawn, object, reader },
      },
    },
  };
  expect(
    executeCommand(
      initial,
      {
        kind: "enqueue",
        siteId: "site",
        entityId: pawn.id,
        action: { kind: "eat", targetId: object.id },
      },
      materials,
    ).reason,
  ).toContain("occupied");
  pawn.diet = [{ accepts: "animal-tissue", efficiency: 1 }];
  expect(
    executeCommand(
      initial,
      {
        kind: "enqueue",
        siteId: "site",
        entityId: pawn.id,
        action: { kind: "eat", targetId: reader.id },
      },
      materials,
    ).code,
  ).toBe("rejected");
});

it("broken structural remnants remain edible material but no longer work or obstruct", () => {
  const { pawn, object, state } = scenario("bookshelf", "wood");
  damageIntegrity(object, 100);
  expect(object.amount).toBe(1);
  expect(traversalAt(state.sites.site, { x: 1, y: 1 }, pawn.id).kind).toBe(
    "clear",
  );
  const context = {
    site: state.sites.site,
    pawn,
    materials,
    tick: 0,
    events: [],
  };
  expect(
    new Read({ kind: "read", targetId: object.id, workTicks: 0 }).canStart(
      context,
    ),
  ).toBe("The facility is broken.");
  const eating = executeCommand(
    state,
    {
      kind: "enqueue",
      siteId: "site",
      entityId: pawn.id,
      action: { kind: "eat", targetId: object.id },
    },
    materials,
  );
  expect(eating.code).toBe("accepted");
  const next = advanceSimulation(eating.state, materials).state;
  expect(next.sites.site!.entities.object).toMatchObject({ integrity: 0 });
  expect(next.sites.site!.entities.object!.amount).toBeCloseTo(0.9);
});

it("cannot consume a carrier and strand its contents", () => {
  const { pawn, object, state } = scenario("bookshelf", "wood");
  const contents = instantiateEntity(
    {
      id: "contents",
      definitionId: "packaged-meal",
      location: { kind: "carried", carrierId: object.id },
    },
    entities,
  );
  const initial = {
    ...state,
    sites: {
      site: {
        ...state.sites.site,
        entities: { consumer: pawn, object, contents },
      },
    },
  };
  const result = executeCommand(
    initial,
    {
      kind: "enqueue",
      siteId: "site",
      entityId: pawn.id,
      action: { kind: "eat", targetId: object.id },
    },
    materials,
  );
  expect(result.code).toBe("rejected");
  expect(result.reason).toContain("Unload");
  expect(object.amount).toBe(1);
});
