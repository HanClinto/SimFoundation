import { expect, it, vi } from "vitest";
import { createSimulationController } from "../src/application/legacy/simulation-controller";
import {
  createSimulation,
  createSite,
  updateSite,
} from "../src/simulation_legacy/sites";
import { createInitialState } from "../src/simulation_legacy/state";
import type { PhysicalObject } from "../src/simulation_legacy/objects";

it("runs all retained sites on one pausable clock with detached snapshots", () => {
  const controller = createSimulationController(createSimulation());
  controller.dispatch({
    kind: "create-site",
    setup: { name: "One", width: 8, height: 8 },
  });
  controller.dispatch({
    kind: "create-site",
    setup: { name: "Two", width: 8, height: 8 },
  });
  const listener = vi.fn();
  const unsubscribe = controller.subscribe(listener);
  const advanced = controller.advance(3);
  expect(advanced.simulation.tick).toBe(3);
  expect(Object.keys(advanced.simulation.sites)).toHaveLength(2);
  expect(listener).toHaveBeenCalledTimes(3);
  controller.setRunning(false);
  const paused = controller.getSnapshot();
  expect(controller.advance(10)).toEqual(paused);
  expect(controller.getSnapshot()).not.toBe(paused);
  unsubscribe();
  const calls = listener.mock.calls.length;
  controller.setRunning(true);
  controller.advance();
  expect(listener).toHaveBeenCalledTimes(calls);
  expect(advanced.simulation.tick).toBe(3);
  expect(() => controller.advance(0)).toThrow(RangeError);
});

it("routes serializable commands to the explicit site and rejects disposed sites", () => {
  const first = createSite(createSimulation(), {
    name: "One",
    width: 8,
    height: 8,
  });
  const second = createSite(first.state, { name: "Two", width: 8, height: 8 });
  const controller = createSimulationController(second.state);
  controller.setRunning(false);
  const created = controller.dispatch({
    kind: "exposure-source",
    siteId: second.siteId!,
    policy: {
      name: "Source",
      kind: "corrosion",
      dose: 2,
      radius: 1,
      enabled: true,
      position: { x: 3, y: 3 },
    },
  });
  expect(created.reason).toBeNull();
  expect(
    created.snapshot.simulation.sites[first.siteId!]!.environment.sources,
  ).toHaveLength(0);
  expect(
    created.snapshot.simulation.sites[second.siteId!]!.environment.sources,
  ).toHaveLength(1);
  expect(created.snapshot.simulation.tick).toBe(0);
  expect(
    controller.dispatch({ kind: "dispose-site", siteId: second.siteId! })
      .reason,
  ).toContain("hazards");
  expect(
    controller.dispatch({ kind: "dispose-site", siteId: first.siteId! }).reason,
  ).toBeNull();
  const before = controller.getSnapshot();
  expect(
    controller.dispatch({
      kind: "surface",
      siteId: first.siteId!,
      position: { x: 3, y: 3 },
      layer: "structure",
      material: "steel",
      operation: "wall",
    }).reason,
  ).toContain("no longer exists");
  expect(controller.getSnapshot()).toEqual(before);
  expect(second.state.sites[second.siteId!]!.environment.sources).toHaveLength(
    0,
  );
});

it("executes independent movement and personal-routine queues at ordinary sites", () => {
  const initial = createInitialState();
  let state = createSimulation();
  const assignments: { siteId: string; personId: string; chairId: string }[] =
    [];
  for (const person of initial.personnel.slice(0, 2)) {
    const created = createSite(state, {
      name: person.name,
      width: 12,
      height: 12,
    });
    const siteId = created.siteId!;
    const chairId = `${siteId}:chair`;
    state = updateSite(created.state, siteId, (site) => ({
      ...site,
      personnel: [{ ...person, currentJobId: null }],
      world: { ...site.world, positions: { [person.id]: { x: 2, y: 2 } } },
      routines: {
        ...site.routines,
        stations: [{ id: chairId, kind: "break", position: { x: 6, y: 6 } }],
        schedules: {
          [person.id]: Array.from({ length: 24 }, () => "work" as const),
        },
      },
      objects: {
        ...site.objects,
        items: [
          {
            id: chairId,
            kind: "break-seat",
            quantity: 1,
            condition: 100,
            orientation: "north",
            installed: true,
            reservedBy: null,
            location: { kind: "ground", position: { x: 6, y: 6 } },
          },
        ],
      },
    })).state;
    assignments.push({ siteId, personId: person.id, chairId });
  }
  const controller = createSimulationController(state);
  for (const { siteId, personId, chairId } of assignments) {
    expect(
      controller.dispatch({
        kind: "queue-action",
        siteId,
        intent: {
          mapId: siteId,
          actorId: personId,
          action: "move",
          destination: { x: 4, y: 4 },
        },
      }).reason,
    ).toBeNull();
    expect(
      controller.dispatch({
        kind: "queue-action",
        siteId,
        intent: {
          mapId: siteId,
          actorId: personId,
          action: "relax",
          targetId: `object:${chairId}`,
        },
      }).reason,
    ).toBeNull();
  }
  const queued = controller.getSnapshot();
  for (const { siteId, personId } of assignments)
    expect(
      queued.simulation.sites[siteId]!.actionQueues[personId]!.pending,
    ).toHaveLength(1);
  const replay = createSimulationController(
    JSON.parse(JSON.stringify(queued.simulation)),
  );
  const seen = new Set<string>();
  for (let tick = 0; tick < 100; tick += 1) {
    const current = controller.advance();
    expect(replay.advance()).toEqual(current);
    for (const { siteId, personId } of assignments) {
      const site = current.simulation.sites[siteId]!;
      if (
        site.routines.activities[personId]?.source === "player" &&
        site.routines.activities[personId]!.progress > 0
      )
        seen.add(personId);
    }
    if (
      assignments.every(
        ({ siteId, personId }) =>
          !current.simulation.sites[siteId]!.actionQueues[personId],
      )
    )
      break;
  }
  expect(seen.size).toBe(2);
  controller.advance();
  for (const { siteId, personId } of assignments) {
    const site = controller.getSnapshot().simulation.sites[siteId]!;
    expect(site.actionQueues[personId]).toBeUndefined();
    expect(site.combat.responders[personId]!.drafted).toBe(false);
    expect(site.world.positions[personId]).toEqual({ x: 6, y: 6 });
  }
  const before = controller.getSnapshot();
  expect(
    controller.dispatch({
      kind: "queue-action",
      siteId: assignments[0]!.siteId,
      intent: {
        mapId: assignments[1]!.siteId,
        actorId: assignments[1]!.personId,
        action: "hold",
      },
    }).reason,
  ).toContain("no longer on this map");
  expect(controller.getSnapshot()).toEqual(before);
});

it("reports and pauses for a new remote incident even while another site is already orange", () => {
  const first = createSite(createSimulation(), {
    name: "Existing incident",
    width: 8,
    height: 8,
  });
  const second = createSite(first.state, {
    name: "Remote incident",
    width: 8,
    height: 8,
  });
  const vessel: PhysicalObject = {
    id: "broken-case",
    kind: "vessel",
    quantity: 1,
    condition: 0,
    orientation: "north",
    installed: false,
    reservedBy: null,
    location: { kind: "ground", position: { x: 3, y: 3 } },
    vessel: { material: "steel", sealed: true },
  };
  let state = updateSite(second.state, first.siteId!, (site) => ({
    ...site,
    incident: { level: "orange", summary: "Independent incident" },
  })).state;
  state = updateSite(state, second.siteId!, (site) => ({
    ...site,
    objects: { ...site.objects, items: [vessel] },
    observations: {
      ...site.observations,
      objects: { [vessel.id]: { object: vessel, observedTick: 0 } },
    },
  })).state;
  const controller = createSimulationController(state);
  const result = controller.advance(10);
  expect(result.running).toBe(false);
  expect(result.simulation.tick).toBe(1);
  expect(result.incidentTransitions).toEqual([
    { siteId: second.siteId, previous: "green", current: "orange", tick: 1 },
  ]);
  controller.setRunning(true);
  expect(controller.advance().running).toBe(true);
  expect(controller.getSnapshot().incidentTransitions).toEqual([]);
});
