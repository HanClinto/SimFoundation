import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation_legacy/state";
import { workSiteVisuals } from "../src/adapters/browser/work-art";
import type { SiteJob } from "../src/simulation_legacy/jobs";
import type { SurfaceOrder } from "../src/simulation_legacy/environment";
import { drawSurfaceDamage } from "../src/adapters/browser/material-art";

const initial = createInitialState();
const position = { x: 60, y: 54 };
const id = initial.personnel[0]!.id;
const job: SiteJob = {
  id: "work",
  title: "Fit wall",
  description: "",
  skillId: "engineering",
  priority: 50,
  xpPerTick: 1,
  preferredBiases: { mindMight: 0, receptiveResolute: 0 },
  status: "in-progress",
  progress: 16,
  requiredProgress: 32,
  assignedPersonId: id,
  assignmentReason: null,
  authorizedTick: 0,
  completedTick: null,
  workSite: position,
  requiredWorkerId: null,
};
const order: SurfaceOrder = {
  id: "wall",
  position,
  layer: "structure",
  material: "steel",
  operation: "wall",
  jobId: job.id,
  phase: "fitting",
  blockedReason: null,
};
const state = {
  ...initial,
  jobs: [job],
  world: { ...initial.world, positions: { [id]: position } },
  environment: { ...initial.environment, orders: [order] },
  observations: { ...initial.observations, visibleTiles: [] },
};

it("shows plans, real fitting progress and active workers without changing physical state", () => {
  const before = structuredClone(state);
  const sites = workSiteVisuals(state, "world");
  expect(sites[0]).toMatchObject({
    kind: "wall",
    stage: "fitting",
    progress: 0.5,
    active: true,
  });
  expect(workSiteVisuals(state, "world")).toBe(sites);
  const planned = {
    ...state,
    environment: {
      ...state.environment,
      orders: [{ ...order, phase: "delivering" as const }],
    },
  };
  expect(workSiteVisuals(planned, "world")[0]).toMatchObject({
    stage: "planned",
    progress: 0,
    active: false,
  });
  expect(state).toEqual(before);
  for (const phase of ["completed", "cancelled"] as const)
    expect(
      workSiteVisuals(
        {
          ...state,
          environment: { ...state.environment, orders: [{ ...order, phase }] },
        },
        "world",
      ),
    ).toEqual([]);
});

it("keeps unobserved progress and active work out of Recorded plans", () => {
  expect(workSiteVisuals(state, "recorded")[0]).toMatchObject({
    stage: "planned",
    progress: 0,
    active: false,
  });
  const changed = {
    ...state,
    jobs: [{ ...job, progress: 30 }],
    environment: {
      ...state.environment,
      orders: [{ ...order, blockedReason: "No route" }],
    },
  };
  expect(workSiteVisuals(changed, "recorded")).toEqual(
    workSiteVisuals(state, "recorded"),
  );
  expect(
    workSiteVisuals(
      {
        ...state,
        observations: {
          ...state.observations,
          visibleTiles: [position.y * state.world.map.width + position.x],
        },
      },
      "recorded",
    )[0]!.progress,
  ).toBe(0.5);
});

it("draws material-specific deterioration and debris, but nothing for an intact surface", () => {
  const commands: unknown[][] = [];
  const context = new Proxy(
    {},
    {
      get:
        (_, name) =>
        (...args: unknown[]) =>
          commands.push([name, ...args]),
      set: (_, name, value) => {
        commands.push([name, value]);
        return true;
      },
    },
  ) as CanvasRenderingContext2D;
  drawSurfaceDamage(
    context,
    { kind: "wall", material: "steel", integrity: 100 },
    true,
  );
  expect(commands).toEqual([]);
  const signatures = [];
  for (const material of [
    "concrete",
    "steel",
    "ceramic",
    "composite",
  ] as const) {
    commands.length = 0;
    drawSurfaceDamage(context, { kind: "wall", material, integrity: 40 }, true);
    signatures.push(JSON.stringify(commands));
  }
  expect(new Set(signatures).size).toBe(4);
  commands.length = 0;
  drawSurfaceDamage(
    context,
    { kind: "wall", material: "steel", integrity: 0 },
    false,
  );
  expect(commands.filter(([name]) => name === "fillRect")).toHaveLength(4);
});
