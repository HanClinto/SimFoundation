import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import { pawnCues } from "../src/adapters/browser/pawn-cues";
import { orderSurfaceWork } from "../src/simulation/environment";
import {
  layoutPawnBubbles,
  bubbleAt,
  drawPawnBubbles,
} from "../src/adapters/browser/pawn-bubbles";

describe("pawn map cues", () => {
  it("lays out fixed-size readable bubbles without overlapping or leaving the viewport", () => {
    const state = createInitialState();
    const bubbles = layoutPawnBubbles(state, "world", 0.57, 400, 300, () => ({
      x: 200,
      y: 200,
    }));
    expect(bubbles.length).toBeGreaterThan(1);
    for (const bubble of bubbles) {
      expect(bubble.x).toBeGreaterThanOrEqual(0);
      expect(bubble.y).toBeGreaterThanOrEqual(0);
      expect(bubble.x + bubble.width).toBeLessThanOrEqual(400);
      expect(bubble.y + bubble.height).toBeLessThanOrEqual(300);
      expect(bubbleAt(bubbles, { x: bubble.x + 2, y: bubble.y + 2 })).toBe(
        bubble,
      );
      for (const other of bubbles)
        if (bubble !== other)
          expect(
            bubble.x < other.x + other.width &&
              bubble.x + bubble.width > other.x &&
              bubble.y < other.y + other.height &&
              bubble.y + bubble.height > other.y,
          ).toBe(false);
    }
    expect(
      layoutPawnBubbles(state, "world", 0.3, 400, 300, () => ({
        x: 200,
        y: 200,
      })),
    ).toEqual([]);
  });
  it("shows routine intent while travelling and action on arrival, without mood while asleep", () => {
    const initial = createInitialState();
    const person = initial.personnel[0]!;
    const station = initial.routines.stations.find(
      (station) => station.kind === "sleep",
    )!;
    const state = {
      ...initial,
      routines: {
        ...initial.routines,
        activities: {
          [person.id]: {
            kind: "sleep" as const,
            stationId: station.id,
            progress: 0,
            startedTick: 0,
            mealConsumed: false,
          },
        },
      },
    };
    expect(pawnCues(state, person.id, "world")[0]).toMatchObject({
      icon: "sleep",
      kind: "thought",
      label: "Going to bed",
    });
    const arrived = {
      ...state,
      world: {
        ...state.world,
        positions: { ...state.world.positions, [person.id]: station.position },
      },
    };
    expect(pawnCues(arrived, person.id, "world")).toEqual([
      { icon: "sleep", kind: "action", label: "Sleeping" },
    ]);
  });
  it("draws action and mood glyphs without changing state and excludes unseen recorded pawns", () => {
    const state = createInitialState();
    const before = structuredClone(state);
    const bubbles = layoutPawnBubbles(
      state,
      "world",
      0.57,
      500,
      400,
      (position) => ({ x: (position.x - 45) * 13, y: (position.y - 40) * 10 }),
    );
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
    drawPawnBubbles(context, bubbles);
    expect(
      commands.filter((command) => command[0] === "fillRect").length,
    ).toBeGreaterThan(50);
    expect(state).toEqual(before);
    const hidden = {
      ...state,
      observations: { ...state.observations, visibleEntityIds: [] },
    };
    expect(
      layoutPawnBubbles(hidden, "recorded", 0.57, 500, 400, () => ({
        x: 200,
        y: 200,
      })),
    ).toEqual([]);
  });
  it("distinguishes physical work, travel, cargo and clinical attendance", () => {
    const initial = createInitialState();
    const person = initial.personnel[0]!;
    const ordered = orderSurfaceWork(
      initial,
      { x: 61, y: 54 },
      "structure",
      "steel",
    ).state;
    const job = {
      ...ordered.jobs[0]!,
      status: "in-progress" as const,
      assignedPersonId: person.id,
    };
    const state = { ...ordered, jobs: [job] };
    expect(pawnCues(state, person.id, "world")[0]?.icon).toBe("walk");
    expect(
      pawnCues(
        { ...state, jobs: [{ ...job, requiredWorkerId: person.id }] },
        person.id,
        "world",
      )[0]?.icon,
    ).toBe("box");
    const arrived = {
      ...state,
      world: {
        ...state.world,
        positions: { ...state.world.positions, [person.id]: job.workSite },
      },
    };
    expect(
      pawnCues(
        { ...arrived, jobs: [{ ...job, skillId: "engineering" }] },
        person.id,
        "world",
      )[0]?.icon,
    ).toBe("tools");
    expect(
      pawnCues(
        {
          ...arrived,
          jobs: [
            {
              ...job,
              skillId: "medical",
              assignedPersonId: initial.personnel[1]!.id,
              assessment: { kind: "physical", patientId: person.id },
            },
          ],
        },
        person.id,
        "world",
      )[0]?.label,
    ).toBe("Attending clinical appointment");
  });
  it("never exposes unseen cues, hidden needs, or masked distress in Recorded perspective", () => {
    const initial = createInitialState();
    const person = initial.personnel.find(
      (person) => person.id === "person-jon-bell",
    )!;
    const state = {
      ...initial,
      personnel: initial.personnel.map((candidate) =>
        candidate.id === person.id
          ? {
              ...candidate,
              stress: 100,
              needs: { ...candidate.needs, satiety: 0, rest: 0 },
            }
          : candidate,
      ),
    };
    expect(pawnCues(state, person.id, "world").at(-1)).toMatchObject({
      icon: "happy",
      label: "Smiles during conversation",
    });
    expect(pawnCues(state, person.id, "recorded")[0]?.icon).toBe("wait");
    expect(
      pawnCues(
        {
          ...state,
          observations: { ...state.observations, visibleEntityIds: [] },
        },
        person.id,
        "recorded",
      ),
    ).toEqual([]);
  });
  it("reports blocked routines and active social contact without inventing conversation", () => {
    const initial = createInitialState();
    const person = initial.personnel[0]!;
    const blocked = {
      ...initial,
      routines: {
        ...initial.routines,
        blockedReasons: { [person.id]: "No meal seat available" },
      },
    };
    expect(pawnCues(blocked, person.id, "world")[0]).toMatchObject({
      icon: "alert",
      label: "No meal seat available",
    });
    const social = {
      ...initial,
      scp999: {
        ...initial.scp999,
        status: "comforting" as const,
        targetPersonId: person.id,
      },
    };
    expect(pawnCues(social, person.id, "world")[0]).toMatchObject({
      kind: "speech",
      label: "Social contact with SCP-999",
    });
  });
});
