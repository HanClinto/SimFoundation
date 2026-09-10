import { expect, it } from "vitest";
import { createSimulationController } from "../src/application/legacy/simulation-controller";
import {
  createSimulation,
  createSite,
  updateSite,
  disposeSite,
  siteOwnershipIssue,
} from "../src/simulation_legacy/sites";
import { dispatchFreight } from "../src/simulation_legacy/site-transfers";
import type { PhysicalObject } from "../src/simulation_legacy/objects";
import { availableMaterials } from "../src/simulation_legacy/material-stock";
import { MATERIALS, setSurface } from "../src/simulation_legacy/materials";
import { createInitialState } from "../src/simulation_legacy/state";
import { advancePersonnel } from "../src/simulation_legacy/personnel";

const loading = { x: 2, y: 2 };
const arrival = { x: 5, y: 5 };
const wearPerTick = (4 * (10 - MATERIALS.steel.corrosionResistance)) / 100;
function fixture() {
  const first = createSite(createSimulation(), {
    name: "Origin",
    width: 10,
    height: 10,
  });
  const second = createSite(first.state, {
    name: "Destination",
    width: 10,
    height: 10,
  });
  const materials: PhysicalObject = {
    id: "materials",
    kind: "materials",
    quantity: 20,
    condition: 100,
    installed: false,
    reservedBy: null,
    orientation: "north",
    location: { kind: "ground", position: loading },
  };
  const vessel: PhysicalObject = {
    ...materials,
    id: "case",
    kind: "vessel",
    quantity: 1,
    vessel: { material: "steel", sealed: true },
  };
  const specimen: PhysicalObject = {
    ...materials,
    id: "specimen",
    kind: "anomaly-case",
    quantity: 1,
    location: { kind: "contained", vesselId: vessel.id },
  };
  const state = updateSite(second.state, first.siteId!, (site) => ({
    ...site,
    objects: { ...site.objects, items: [materials, vessel, specimen] },
    environment: {
      ...site.environment,
      sources: [
        {
          id: "specimen-source",
          name: "Specimen",
          kind: "corrosion",
          dose: 4,
          radius: 1,
          enabled: true,
          position: loading,
          objectId: specimen.id,
        },
      ],
    },
  })).state;
  return { state, originId: first.siteId!, destinationId: second.siteId! };
}

it("transfers a material batch and loaded vessel exactly once with wear and source identity", () => {
  const { state, originId, destinationId } = fixture();
  const controller = createSimulationController(state);
  const request = {
    originId,
    destinationId,
    loading,
    arrival,
    duration: 3,
    cargo: [
      { objectId: "materials", quantity: 7 },
      { objectId: "case", quantity: 1 },
    ],
  };
  const dispatched = controller.dispatch({ kind: "dispatch-freight", request });
  expect(dispatched.reason).toBeNull();
  const departed = dispatched.snapshot.simulation;
  expect(availableMaterials(departed.sites[originId]!.objects)).toBe(13);
  expect(departed.sites[destinationId]!.objects.items).toHaveLength(0);
  expect(departed.sites[originId]!.environment.sources).toHaveLength(0);
  expect(
    departed.transfers["transfer-1"]!.objects.items.map((item) => item.id),
  ).toEqual(
    expect.arrayContaining([`${originId}:object-1`, "case", "specimen"]),
  );
  expect(siteOwnershipIssue(departed)).toBeNull();
  expect(disposeSite(departed, destinationId).reason).toContain("transfers");
  const replay = createSimulationController(
    JSON.parse(JSON.stringify(departed)),
  );
  for (let step = 0; step < 3; step += 1)
    expect(controller.advance()).toEqual(replay.advance());
  const returned = controller.getSnapshot().simulation;
  expect(returned.transfers).toEqual({});
  expect(returned.transferHistory).toHaveLength(1);
  const target = returned.sites[destinationId]!;
  expect(
    target.objects.items.find((item) => item.id === "case")!.condition,
  ).toBeCloseTo(100 - wearPerTick * 3);
  expect(
    target.objects.items.find((item) => item.id === "specimen")!.location,
  ).toEqual({ kind: "contained", vesselId: "case" });
  expect(
    target.objects.items.find((item) => item.kind === "materials")!.location,
  ).toEqual({ kind: "ground", position: arrival });
  expect(availableMaterials(target.objects)).toBe(7);
  expect(target.environment.sources[0]!.id).toBe("specimen-source");
  controller.advance(2);
  expect(controller.getSnapshot().simulation.transferHistory).toHaveLength(1);
  expect(
    controller.getSnapshot().simulation.sites[destinationId]!.objects.items,
  ).toHaveLength(3);
  expect(
    controller.dispatch({ kind: "return-freight", transferId: "transfer-1" })
      .reason,
  ).toContain("no longer active");
});

it("retains blocked cargo in transit and returns to origin without teleporting", () => {
  const { state, originId, destinationId } = fixture();
  const dispatched = dispatchFreight(state, {
    originId,
    destinationId,
    loading,
    arrival,
    duration: 2,
    cargo: [{ objectId: "case", quantity: 1 }],
  });
  expect(dispatched.reason).toBeNull();
  const blocked = updateSite(dispatched.state, destinationId, (site) => ({
    ...site,
    world: {
      ...site.world,
      map: setSurface(site.world.map, arrival, "structure", {
        kind: "wall",
        material: "steel",
        integrity: 100,
      }),
    },
  }));
  const controller = createSimulationController(blocked.state);
  controller.advance(2);
  const waiting = controller.getSnapshot().simulation;
  expect(waiting.transfers["transfer-1"]!.blockedReason).toContain("blocked");
  expect(waiting.sites[destinationId]!.objects.items).toHaveLength(0);
  expect(
    controller.dispatch({ kind: "return-freight", transferId: "transfer-1" })
      .reason,
  ).toBeNull();
  expect(
    controller.getSnapshot().simulation.transfers["transfer-1"]!.arrivesAt,
  ).toBe(4);
  expect(
    controller.dispatch({ kind: "return-freight", transferId: "transfer-1" })
      .reason,
  ).toContain("already returning");
  controller.advance();
  expect(
    controller.getSnapshot().simulation.sites[originId]!.objects.items,
  ).toHaveLength(1);
  controller.advance();
  const returned = controller.getSnapshot().simulation;
  expect(returned.transfers).toEqual({});
  expect(returned.sites[originId]!.objects.items).toHaveLength(3);
  expect(
    returned.sites[originId]!.objects.items.find((item) => item.id === "case")!
      .condition,
  ).toBeCloseTo(100 - wearPerTick * 4);
  expect(returned.transferHistory[0]!.returned).toBe(true);
});

it("rejects unprepared, reserved and invalid cargo atomically", () => {
  const { state, originId, destinationId } = fixture();
  const request = {
    originId,
    destinationId,
    loading,
    arrival,
    duration: 2,
    cargo: [
      { objectId: "materials", quantity: 4 },
      { objectId: "specimen", quantity: 1 },
    ],
  };
  const invalid = dispatchFreight(state, request);
  expect(invalid.reason).toContain("loading tile");
  expect(invalid.state).toBe(state);
  expect(availableMaterials(state.sites[originId]!.objects)).toBe(20);
  expect(
    dispatchFreight(state, {
      ...request,
      cargo: [{ objectId: "materials", quantity: 21 }],
    }).state,
  ).toBe(state);
  expect(
    dispatchFreight(state, {
      ...request,
      loading: { x: 3, y: 3 },
      cargo: [{ objectId: "materials", quantity: 4 }],
    }).state,
  ).toBe(state);
  expect(
    dispatchFreight(state, {
      ...request,
      cargo: [
        { objectId: "materials", quantity: 4 },
        { objectId: "materials", quantity: 4 },
      ],
    }).state,
  ).toBe(state);
  const reserved = updateSite(state, originId, (site) => ({
    ...site,
    objects: {
      ...site.objects,
      items: site.objects.items.map((item) =>
        item.id === "materials" ? { ...item, reservedBy: "work" } : item,
      ),
    },
  })).state;
  expect(
    dispatchFreight(reserved, {
      ...request,
      cargo: [{ objectId: "materials", quantity: 4 }],
    }).state,
  ).toBe(reserved);
});

it("hauls freight to loading, builds with delivered materials and forwards the remainder to a third site", () => {
  const prepared = fixture();
  const third = createSite(prepared.state, {
    name: "Third site",
    width: 10,
    height: 10,
  });
  const initial = createInitialState();
  let state = third.state;
  for (const [siteId, personId] of [
    [prepared.originId, "person-emil-novak"],
    [prepared.destinationId, "person-jon-bell"],
  ]) {
    const person = initial.personnel.find((entry) => entry.id === personId)!;
    state = updateSite(state, siteId!, (site) => ({
      ...site,
      personnel: [{ ...person, currentJobId: null }],
      world: { ...site.world, positions: { [person.id]: { x: 1, y: 1 } } },
      routines: {
        ...site.routines,
        schedules: {
          [person.id]: Array.from({ length: 24 }, () => "work" as const),
        },
      },
    })).state;
  }
  const controller = createSimulationController(state);
  const staging = { x: 4, y: 2 };
  expect(
    controller.dispatch({
      kind: "move-object",
      siteId: prepared.originId,
      objectId: "materials",
      position: staging,
      orientation: "north",
      install: false,
      quantity: 7,
    }).reason,
  ).toBeNull();
  const movingId =
    controller.getSnapshot().simulation.sites[prepared.originId]!
      .objectOrders[0]!.objectId;
  const request = {
    originId: prepared.originId,
    destinationId: prepared.destinationId,
    loading: staging,
    arrival,
    duration: 2,
    cargo: [{ objectId: movingId, quantity: 7 }],
  };
  expect(
    controller.dispatch({ kind: "dispatch-freight", request }).reason,
  ).toContain("loading tile");
  for (
    let tick = 0;
    tick < 180 &&
    controller.getSnapshot().simulation.sites[prepared.originId]!
      .objectOrders[0]!.phase !== "completed";
    tick += 1
  )
    controller.advance();
  expect(
    controller.getSnapshot().simulation.sites[prepared.originId]!
      .objectOrders[0]!.phase,
  ).toBe("completed");
  expect(
    controller.dispatch({ kind: "dispatch-freight", request }).reason,
  ).toBeNull();
  controller.advance(2);
  expect(
    availableMaterials(
      controller.getSnapshot().simulation.sites[prepared.destinationId]!
        .objects,
    ),
  ).toBe(7);
  expect(
    controller.dispatch({
      kind: "surface",
      siteId: prepared.destinationId,
      position: { x: 7, y: 7 },
      layer: "structure",
      material: "steel",
      operation: "wall",
    }).reason,
  ).toBeNull();
  for (
    let tick = 0;
    tick < 180 &&
    controller.getSnapshot().simulation.sites[prepared.destinationId]!
      .environment.orders[0]!.phase !== "completed";
    tick += 1
  )
    controller.advance();
  const built = controller.getSnapshot().simulation;
  expect(
    built.sites[prepared.destinationId]!.environment.orders[0]!.phase,
  ).toBe("completed");
  expect(availableMaterials(built.sites[prepared.destinationId]!.objects)).toBe(
    3,
  );
  expect(
    controller.dispatch({
      kind: "dispatch-freight",
      request: {
        originId: prepared.destinationId,
        destinationId: third.siteId!,
        loading: arrival,
        arrival: loading,
        duration: 2,
        cargo: [{ objectId: movingId, quantity: 3 }],
      },
    }).reason,
  ).toBeNull();
  controller.advance(2);
  const result = controller.getSnapshot().simulation;
  expect(availableMaterials(result.sites[prepared.originId]!.objects)).toBe(13);
  expect(
    availableMaterials(result.sites[prepared.destinationId]!.objects),
  ).toBe(0);
  expect(availableMaterials(result.sites[third.siteId!]!.objects)).toBe(3);
  expect(result.sites[third.siteId!]!.objects.items[0]!.id).toBe(movingId);
  expect(result.transferHistory).toHaveLength(2);
  expect(siteOwnershipIssue(result)).toBeNull();
});

it("moves an agent and supplies with one owner and one needs update per transit tick", () => {
  const prepared = fixture();
  const person = createInitialState().personnel.find(
    (entry) => entry.id === "person-emil-novak",
  )!;
  const state = updateSite(prepared.state, prepared.originId, (site) => ({
    ...site,
    personnel: [{ ...person, currentJobId: null }],
    world: { ...site.world, positions: { [person.id]: { x: 1, y: 1 } } },
    routines: {
      ...site.routines,
      schedules: {
        [person.id]: Array.from({ length: 24 }, () => "work" as const),
      },
    },
  })).state;
  const controller = createSimulationController(state);
  const request = {
    originId: prepared.originId,
    destinationId: prepared.destinationId,
    loading,
    arrival,
    duration: 3,
    personnelIds: [person.id],
    cargo: [{ objectId: "materials", quantity: 7 }],
  };
  expect(
    controller.dispatch({ kind: "dispatch-freight", request }).reason,
  ).toContain("reach the loading tile");
  expect(
    controller.dispatch({
      kind: "queue-action",
      siteId: prepared.originId,
      intent: {
        mapId: prepared.originId,
        actorId: person.id,
        action: "move",
        destination: loading,
      },
    }).reason,
  ).toBeNull();
  for (
    let tick = 0;
    tick < 20 &&
    controller.getSnapshot().simulation.sites[prepared.originId]!.actionQueues[
      person.id
    ];
    tick += 1
  )
    controller.advance();
  controller.advance();
  const before = controller.getSnapshot().simulation;
  const departing = before.sites[prepared.originId]!.personnel[0]!;
  const responder =
    before.sites[prepared.originId]!.combat.responders[person.id]!;
  expect(
    controller.dispatch({ kind: "dispatch-freight", request }).reason,
  ).toBeNull();
  const transit = controller.getSnapshot().simulation;
  expect(transit.sites[prepared.originId]!.personnel).toEqual([]);
  expect(
    transit.sites[prepared.originId]!.world.positions[person.id],
  ).toBeUndefined();
  expect(
    transit.sites[prepared.originId]!.combat.responders[person.id],
  ).toBeUndefined();
  expect(transit.sites[prepared.destinationId]!.personnel).toEqual([]);
  expect(transit.transfers["transfer-1"]!.personnel[0]).toEqual(departing);
  let expected = departing;
  const replay = createSimulationController(
    JSON.parse(JSON.stringify(transit)),
  );
  for (let step = 1; step <= 3; step += 1) {
    expected = advancePersonnel(expected, before.tick + step);
    expect(controller.advance()).toEqual(replay.advance());
  }
  const arrived = controller.getSnapshot().simulation;
  const site = arrived.sites[prepared.destinationId]!;
  expect(site.personnel).toEqual([expected]);
  expect(site.personnel[0]!.equipment).toEqual(departing.equipment);
  expect(site.combat.responders[person.id]).toEqual(responder);
  expect(site.world.positions[person.id]).toEqual(arrival);
  expect(site.routines.schedules[person.id]).toEqual(
    before.sites[prepared.originId]!.routines.schedules[person.id],
  );
  expect(siteOwnershipIssue(arrived)).toBeNull();
  expect(
    controller.dispatch({
      kind: "surface",
      siteId: prepared.destinationId,
      position: { x: 7, y: 7 },
      layer: "structure",
      material: "steel",
      operation: "wall",
    }).reason,
  ).toBeNull();
  for (
    let tick = 0;
    tick < 180 &&
    controller.getSnapshot().simulation.sites[prepared.destinationId]!
      .environment.orders[0]!.phase !== "completed";
    tick += 1
  )
    controller.advance();
  expect(
    controller.getSnapshot().simulation.sites[prepared.destinationId]!
      .environment.orders[0]!.phase,
  ).toBe("completed");
});

it("keeps breached contents and an active source while a blocked arrival waits", () => {
  const prepared = fixture();
  const weak = updateSite(prepared.state, prepared.originId, (site) => ({
    ...site,
    objects: {
      ...site.objects,
      items: site.objects.items.map((item) =>
        item.id === "case" ? { ...item, condition: wearPerTick } : item,
      ),
    },
  })).state;
  const sent = dispatchFreight(weak, {
    originId: prepared.originId,
    destinationId: prepared.destinationId,
    loading,
    arrival,
    duration: 1,
    cargo: [{ objectId: "case", quantity: 1 }],
  });
  const blocked = updateSite(sent.state, prepared.destinationId, (site) => ({
    ...site,
    world: {
      ...site.world,
      map: setSurface(site.world.map, arrival, "structure", {
        kind: "closed-door",
        material: "steel",
        integrity: 100,
      }),
    },
  })).state;
  const controller = createSimulationController(blocked);
  controller.advance(2);
  const waiting = controller.getSnapshot().simulation;
  expect(
    waiting.transfers["transfer-1"]!.objects.items.find(
      (item) => item.id === "case",
    )!.condition,
  ).toBe(0);
  expect(waiting.transfers["transfer-1"]!.environment.sources[0]!.enabled).toBe(
    true,
  );
  expect(waiting.sites[prepared.destinationId]!.objects.items).toHaveLength(0);
  expect(
    controller.dispatch({
      kind: "door-policy",
      siteId: prepared.destinationId,
      position: arrival,
      policy: "held-open",
    }).reason,
  ).toBeNull();
  controller.advance();
  const delivered = controller.getSnapshot().simulation;
  expect(delivered.transfers).toEqual({});
  expect(delivered.sites[prepared.destinationId]!.objects.items).toHaveLength(
    2,
  );
  expect(
    delivered.sites[prepared.destinationId]!.objects.items.find(
      (item) => item.id === "case",
    )!.condition,
  ).toBe(0);
  expect(
    delivered.sites[prepared.destinationId]!.environment.sources[0]!.enabled,
  ).toBe(true);
  expect(delivered.transferHistory).toHaveLength(1);
});

it("rejects reused transfer identities and duplicated payload ownership", () => {
  const { state, originId, destinationId } = fixture();
  const request = {
    originId,
    destinationId,
    loading,
    arrival,
    duration: 2,
    cargo: [{ objectId: "materials", quantity: 4 }],
  };
  const sent = dispatchFreight(state, request).state;
  const reused = { ...sent, nextTransferId: 1 };
  expect(siteOwnershipIssue(reused)).toContain("reuse");
  expect(dispatchFreight(reused, request).state).toBe(reused);
  const transfer = sent.transfers["transfer-1"]!;
  const duplicated = {
    ...sent,
    sites: {
      ...sent.sites,
      [destinationId]: {
        ...sent.sites[destinationId]!,
        objects: {
          ...sent.sites[destinationId]!.objects,
          items: transfer.objects.items.map((item) => ({
            ...item,
            location: { kind: "ground" as const, position: arrival },
          })),
        },
      },
    },
  };
  expect(siteOwnershipIssue(duplicated)).toContain("more than one owner");
  expect(() => createSimulationController(duplicated)).toThrow(
    "more than one owner",
  );
});
