import { expect, it } from "vitest";
import {
  observeFacilityIncidents,
  recordedVesselIncident,
} from "../src/simulation/facility-incidents";
import { createInitialState } from "../src/simulation/state";
import type { PhysicalObject } from "../src/simulation/objects";
import { vesselTransitForecast } from "../src/simulation/vessels";
import { incidentResponse } from "../src/adapters/browser/incident-response";
import { advanceSimulation } from "../src/simulation/tick";

function fixture(condition: number) {
  const initial = createInitialState();
  const vessel: PhysicalObject = {
    id: "test-case",
    kind: "vessel",
    quantity: 1,
    condition,
    installed: false,
    orientation: "north",
    reservedBy: null,
    location: { kind: "ground", position: { x: 54, y: 55 } },
    vessel: { material: "steel", sealed: true },
  };
  return {
    ...initial,
    objects: { ...initial.objects, items: [...initial.objects.items, vessel] },
    observations: {
      ...initial.observations,
      objects: {
        ...initial.observations.objects,
        [vessel.id]: { object: vessel, observedTick: 0 },
      },
    },
  };
}

it("warns at the recorded integrity threshold and escalates a breached case", () => {
  expect(recordedVesselIncident(fixture(25.01))).toBeNull();
  expect(observeFacilityIncidents(fixture(25)).incident.level).toBe("yellow");
  expect(
    incidentResponse(
      "green",
      observeFacilityIncidents(fixture(25)).incident.level,
    ),
  ).toBe("slow");
  const breached = observeFacilityIncidents(fixture(0));
  expect(breached.incident.level).toBe("orange");
  expect(incidentResponse("yellow", breached.incident.level)).toBe("pause");
  expect(breached.incident.summary).toContain("test-case");
  const fixed = fixture(100);
  expect(
    observeFacilityIncidents({ ...fixed, incident: breached.incident }).incident
      .level,
  ).toBe("green");
});

it("forecasts constant-emission transit risk without changing the object or forcing dispatch policy", () => {
  const initial = fixture(10);
  const state = {
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.map((item) =>
        item.id === "spare-break-seat"
          ? {
              ...item,
              location: { kind: "contained" as const, vesselId: "test-case" },
            }
          : item,
      ),
    },
    environment: {
      ...initial.environment,
      sources: [
        {
          id: "source",
          name: "Source",
          position: { x: 54, y: 55 },
          objectId: "spare-break-seat",
          dose: 4,
          radius: 1,
          kind: "corrosion" as const,
        },
      ],
    },
  };
  const vessel = state.objects.items.at(-1)!;
  expect(vesselTransitForecast(state, vessel, 30)).toContain("4.00%");
  expect(vesselTransitForecast(state, vessel, 50)).toContain("Breach risk");
  expect(vesselTransitForecast(state, vessel, 120)).toContain(
    "Pickup and deposit delays",
  );
  expect(vesselTransitForecast(state, vessel, NaN)).toContain("Choose 30");
  expect(
    vesselTransitForecast(state, { ...vessel, condition: 0 }, 120),
  ).toContain("Case breached");
  expect(
    vesselTransitForecast(
      state,
      { ...vessel, vessel: { ...vessel.vessel!, sealed: false } },
      120,
    ),
  ).toContain("Seal the case");
  expect(vessel.condition).toBe(10);
});

it("escalates observed wear through the simulation tick without exposing contained-source details in alerts", () => {
  const initial = fixture(25.1);
  let state = {
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.map((item) =>
        item.id === "spare-break-seat"
          ? {
              ...item,
              location: { kind: "contained" as const, vesselId: "test-case" },
            }
          : item,
      ),
    },
    environment: {
      ...initial.environment,
      sources: [
        {
          id: "hidden-source",
          name: "Hidden property",
          position: { x: 54, y: 55 },
          objectId: "spare-break-seat",
          dose: 4,
          radius: 0,
          kind: "corrosion" as const,
        },
      ],
    },
  };
  state = advanceSimulation(state) as typeof state;
  expect(state.incident.level).toBe("yellow");
  expect(state.incident.summary).not.toContain("Hidden property");
  state = {
    ...state,
    objects: {
      ...state.objects,
      items: state.objects.items.map((item) =>
        item.kind === "vessel" ? { ...item, condition: 0.1 } : item,
      ),
    },
  };
  const breached = advanceSimulation(state);
  expect(breached.incident.level).toBe("orange");
  expect(breached.observations.objects["test-case"]!.object.condition).toBe(0);
});

it("does not reveal unseen vessel wear or claim that dispatch repaired a case", () => {
  const state = fixture(100);
  const unseen = {
    ...state,
    objects: {
      ...state.objects,
      items: state.objects.items.map((item) =>
        item.kind === "vessel" ? { ...item, condition: 0 } : item,
      ),
    },
  };
  expect(observeFacilityIncidents(unseen).incident.level).toBe("green");
  const recorded = fixture(0);
  expect(
    observeFacilityIncidents({ ...recorded, objects: state.objects }).incident
      .level,
  ).toBe("orange");
  expect(
    observeFacilityIncidents({
      ...unseen,
      observations: { ...unseen.observations, objects: {} },
    }).incident.level,
  ).toBe("green");
});

it("combines structural and vessel conditions and preserves independent emergencies", () => {
  const state = fixture(25);
  const index = 54 * 128 + 61;
  const cell = state.observations.knownSurfaces[index]!;
  const damaged = {
    ...state,
    observations: {
      ...state.observations,
      knownSurfaces: {
        ...state.observations.knownSurfaces,
        [index]: { ...cell, structure: { ...cell.structure!, integrity: 0 } },
      },
    },
  };
  const combined = observeFacilityIncidents(damaged);
  expect(combined.incident.level).toBe("orange");
  expect(combined.incident.summary).toContain("Structural damage:");
  expect(combined.incident.summary).toContain("Vessel condition:");
  expect(
    observeFacilityIncidents({ ...state, incident: combined.incident }).incident
      .level,
  ).toBe("yellow");
  for (const level of ["orange", "red"] as const) {
    const emergency = {
      ...damaged,
      incident: { level, summary: "Independent emergency" },
    };
    expect(observeFacilityIncidents(emergency)).toBe(emergency);
  }
});
