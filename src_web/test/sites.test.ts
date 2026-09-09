import { expect, it } from "vitest";
import {
  advanceSites,
  createSimulation,
  createSite,
  disposeSite,
  siteContext,
  updateSite,
} from "../src/simulation/sites";
import {
  orderSurfaceWork,
  setExposureSource,
} from "../src/simulation/environment";
import { createInitialState } from "../src/simulation/state";
import { availableMaterials } from "../src/simulation/material-stock";
import { surfaceAt } from "../src/simulation/materials";
import { advancePersonnel } from "../src/simulation/personnel";
import { reserveStack } from "../src/simulation/objects";
import { createScp999State } from "../src/simulation/scp-999";

it("ticks and observes multiple same-type residents independently in a site", () => {
  const created = createSite(createSimulation(), {
    name: "Resident test",
    width: 20,
    height: 20,
  });
  const siteId = created.siteId!;
  const people = createInitialState().personnel.slice(0, 2);
  const first = createScp999State("resident-a");
  const second = createScp999State("resident-b");
  const installed = updateSite(created.state, siteId, (site) => ({
    ...site,
    personnel: people,
    entities: [second, first],
    world: {
      ...site.world,
      positions: {
        [people[0]!.id]: { x: 3, y: 3 },
        [people[1]!.id]: { x: 13, y: 13 },
        [first.id]: { x: 1, y: 3 },
        [second.id]: { x: 11, y: 13 },
      },
    },
  }));
  expect(installed.reason).toBeNull();
  let state = installed.state;
  let reordered = {
    ...state,
    sites: {
      ...state.sites,
      [siteId]: { ...state.sites[siteId]!, entities: [first, second] },
    },
  };
  for (let step = 0; step < 6; step += 1) {
    state = advanceSites(state);
    reordered = advanceSites(reordered);
    expect(state.sites[siteId]!.world).toEqual(reordered.sites[siteId]!.world);
    expect(state.sites[siteId]!.personnel).toEqual(
      reordered.sites[siteId]!.personnel,
    );
    expect(advanceSites(JSON.parse(JSON.stringify(state)))).toEqual(
      advanceSites(state),
    );
  }
  const site = state.sites[siteId]!;
  expect(site.entities.find((entity) => entity.id === first.id)).toMatchObject({
    status: "resting",
    lastInteraction: { personId: people[0]!.id },
  });
  expect(site.entities.find((entity) => entity.id === second.id)).toMatchObject(
    { status: "resting", lastInteraction: { personId: people[1]!.id } },
  );
  expect(site.observations.entityStates[first.id]!.state.id).toBe(first.id);
  expect(site.observations.entityStates[second.id]!.state.id).toBe(second.id);
  expect(site.world.positions["SCP-999"]).toBeUndefined();
  expect(site).not.toHaveProperty("scp999");
  expect(
    updateSite(state, siteId, (local) => ({
      ...local,
      entities: [...local.entities, first],
    })).reason,
  ).toContain("more than one owner");
});

it("retains site identity across repeated stack splits", () => {
  const material = createInitialState().objects.items.find(
    (item) => item.kind === "materials",
  )!;
  const first = reserveStack(
    { nextId: 1, idPrefix: "site-1:", items: [material] },
    material.id,
    4,
    "first",
  );
  const second = reserveStack(first.store, material.id, 4, "second");
  const other = reserveStack(
    { nextId: 1, idPrefix: "site-2:", items: [material] },
    material.id,
    4,
    "first",
  );
  expect(first.objectId).toBe("site-1:object-1");
  expect(second.objectId).toBe("site-1:object-2");
  expect(other.objectId).toBe("site-2:object-1");
  expect(second.store.idPrefix).toBe("site-1:");
  expect(second.store.items.reduce((sum, item) => sum + item.quantity, 0)).toBe(
    material.quantity,
  );
});

it("creates equal, persistent sites without startup entities, stock or clocks", () => {
  let state = createSimulation();
  const first = createSite(state, { name: "First", width: 8, height: 8 });
  const second = createSite(first.state, {
    name: "Second",
    width: 8,
    height: 8,
  });
  state = second.state;
  expect(first.siteId).not.toBe(second.siteId);
  for (const site of Object.values(state.sites)) {
    expect(site.personnel).toEqual([]);
    expect(site.entities).toEqual([]);
    expect(site.objects.items).toEqual([]);
    expect(site.jobs).toEqual([]);
    expect(site.actionQueues).toEqual({});
    expect(site.observations.cameras).toEqual([]);
    expect(site).not.toHaveProperty("tick");
    expect(site).not.toHaveProperty("expeditions");
  }
  for (let step = 0; step < 5; step += 1) state = advanceSites(state);
  expect(state.tick).toBe(5);
  expect(state.gameMinute).toBe(485);
  expect(Object.keys(state.sites)).toHaveLength(2);
  expect(advanceSites(JSON.parse(JSON.stringify(state)))).toEqual(
    advanceSites(state),
  );
});

it("scopes ordinary commands without a fallback and preserves the campaign clock", () => {
  const first = createSite(createSimulation(), {
    name: "First",
    width: 8,
    height: 8,
  });
  const second = createSite(first.state, {
    name: "Second",
    width: 8,
    height: 8,
  });
  const before = second.state;
  const result = updateSite(
    before,
    second.siteId!,
    (site) =>
      setExposureSource(site, {
        name: "Local source",
        kind: "corrosion",
        dose: 2,
        radius: 1,
        position: { x: 3, y: 3 },
        enabled: true,
      }).state,
  );
  expect(result.reason).toBeNull();
  expect(result.state.sites[first.siteId!]).toBe(before.sites[first.siteId!]);
  expect(result.state.sites[second.siteId!]!.environment.sources).toHaveLength(
    1,
  );
  expect(
    updateSite(before, "missing", () => {
      throw new Error("must not run");
    }).state,
  ).toBe(before);
  expect(
    updateSite(before, first.siteId!, (site) => ({ ...site, tick: 20 })).state,
  ).toBe(before);
  expect(siteContext(before, "missing")).toBeNull();
  expect(disposeSite(result.state, second.siteId!).reason).toContain("hazards");
});

it("allows disposal of any empty site, including the last, without reusing its ID", () => {
  const created = createSite(createSimulation(), {
    name: "Former headquarters",
    width: 4,
    height: 4,
  });
  const disposed = disposeSite(created.state, created.siteId!);
  expect(disposed.reason).toBeNull();
  expect(disposed.state.sites).toEqual({});
  expect(disposeSite(disposed.state, created.siteId!).reason).toContain(
    "no longer exists",
  );
  const next = createSite(disposed.state, { name: "New", width: 4, height: 4 });
  expect(next.siteId).not.toBe(created.siteId);
  expect(
    createSite(next.state, { name: "Invalid", width: 0, height: 4 }).state,
  ).toBe(next.state);
});

it("runs the same physical construction at two staffed sites with overlapping coordinates", () => {
  const initial = createInitialState();
  let state = createSimulation();
  const siteIds: string[] = [];
  for (const [index, personId] of [
    "person-emil-novak",
    "person-jon-bell",
  ].entries()) {
    const created = createSite(state, {
      name: `Workshop ${index}`,
      width: 12,
      height: 12,
    });
    state = created.state;
    const siteId = created.siteId!;
    siteIds.push(siteId);
    const person = initial.personnel.find((entry) => entry.id === personId)!;
    expect(person).toBeDefined();
    state = updateSite(state, siteId, (site) => ({
      ...site,
      personnel: [{ ...person, currentJobId: null }],
      world: { ...site.world, positions: { [person.id]: { x: 2, y: 2 } } },
      routines: {
        ...site.routines,
        schedules: {
          [person.id]: Array.from({ length: 24 }, () => "work" as const),
        },
      },
      objects: {
        ...site.objects,
        items: [
          {
            ...initial.objects.items.find((item) => item.kind === "materials")!,
            id: `${siteId}:materials`,
            quantity: 20,
            location: { kind: "ground", position: { x: 3, y: 2 } },
          },
        ],
      },
    })).state;
    const ordered = updateSite(state, siteId, (site) => {
      const result = orderSurfaceWork(
        site,
        { x: 5, y: 5 },
        "structure",
        "steel",
        "wall",
      );
      expect(result.code).toBe("accepted");
      return result.state;
    });
    expect(ordered.reason).toBeNull();
    state = ordered.state;
    expect(availableMaterials(state.sites[siteId]!.objects)).toBe(16);
  }
  const first = state.sites[siteIds[0]!]!.personnel[0]!;
  const stepped = advanceSites(state);
  expect(stepped.sites[siteIds[0]!]!.personnel[0]!.needs.rest).toBe(
    advancePersonnel(first, stepped.tick).needs.rest,
  );
  expect(
    advanceSites({
      ...state,
      sites: Object.fromEntries(Object.entries(state.sites).reverse()),
    }),
  ).toEqual(stepped);
  const replay = JSON.parse(JSON.stringify(state));
  expect(advanceSites(replay)).toEqual(stepped);
  for (
    let tick = 0;
    tick < 240 &&
    siteIds.some(
      (id) => state.sites[id]!.environment.orders[0]!.phase !== "completed",
    );
    tick += 1
  )
    state = advanceSites(state);
  for (const siteId of siteIds) {
    const site = state.sites[siteId]!;
    expect(site.environment.orders[0]!.phase).toBe("completed");
    expect(
      surfaceAt(site.world.map, { x: 5, y: 5 }, "structure")?.material,
    ).toBe("steel");
    expect(availableMaterials(site.objects)).toBe(16);
    expect(disposeSite(state, siteId).reason).toContain("people");
  }
});

it("continues unstaffed hazards and rejects cross-site ownership without partial updates", () => {
  const initial = createInitialState();
  const first = createSite(createSimulation(), {
    name: "Hazard",
    width: 8,
    height: 8,
  });
  const second = createSite(first.state, {
    name: "Other",
    width: 8,
    height: 8,
  });
  const generator = {
    ...initial.objects.items.find((item) => item.kind === "generator")!,
    id: "unique-generator",
    location: { kind: "ground" as const, position: { x: 3, y: 3 } },
  };
  let state = updateSite(
    second.state,
    first.siteId!,
    (site) =>
      setExposureSource(
        { ...site, objects: { ...site.objects, items: [generator] } },
        {
          name: "Wear",
          kind: "corrosion",
          dose: 2,
          radius: 1,
          position: { x: 3, y: 3 },
          enabled: true,
        },
      ).state,
  ).state;
  const before = state;
  const duplicate = updateSite(state, second.siteId!, (site) => ({
    ...site,
    objects: { ...site.objects, items: [generator] },
  }));
  expect(duplicate.reason).toContain("more than one owner");
  expect(duplicate.state).toBe(before);
  const carried = updateSite(state, second.siteId!, (site) => ({
    ...site,
    objects: {
      ...site.objects,
      items: [
        {
          ...generator,
          id: "other",
          location: { kind: "carried", personId: "absent" },
        },
      ],
    },
  }));
  expect(carried.reason).toContain("owner is not at this site");
  expect(carried.state).toBe(before);
  state = advanceSites(state);
  expect(state.sites[first.siteId!]!.personnel).toEqual([]);
  expect(state.sites[first.siteId!]!.objects.items[0]!.condition).toBe(
    generator.condition - 1,
  );
  expect(state.sites[second.siteId!]!.objects.items).toEqual([]);
});
