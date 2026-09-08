import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation/state";
import { goHere } from "../src/simulation/direct-control";
import { advanceSimulation } from "../src/simulation/tick";
import { draftResponder } from "../src/simulation/combat";
import { loadGameState } from "../src/adapters/browser/game-persistence";
import { createController } from "../src/application/controller";
import { requestAssessment } from "../src/simulation/clinical";
import { orderSurfaceWork } from "../src/simulation/environment";

it("moves physically with temporary manual control then resumes autonomy", () => {
  const initial = createInitialState();
  const id = initial.personnel[0]!.id;
  const origin = initial.world.positions[id]!;
  const destination = { x: origin.x + 1, y: origin.y };
  const issued = goHere(initial, initial.world.map.id, id, destination);
  expect(issued.code).toBe("accepted");
  expect(issued.state.world.positions[id]).toEqual(origin);
  expect(issued.state.combat.responders[id]).toMatchObject({
    drafted: true,
    returnToAutonomy: true,
  });
  expect(
    loadGameState({
      getItem: () => JSON.stringify(issued.state),
      setItem: () => {},
    }).status,
  ).toBe("loaded");
  const arrived = advanceSimulation(issued.state);
  expect(arrived.world.positions[id]).toEqual(destination);
  expect(advanceSimulation(arrived).combat.responders[id]).toMatchObject({
    drafted: false,
    returnToAutonomy: false,
  });
});

it("keeps drafted staff drafted and rejects invalid commands atomically", () => {
  const initial = createInitialState();
  const id = initial.personnel[0]!.id;
  const drafted = draftResponder(initial, id, true).state;
  const destination = drafted.world.positions[id]!;
  const next = advanceSimulation(
    advanceSimulation(
      goHere(drafted, drafted.world.map.id, id, destination).state,
    ),
  );
  expect(next.combat.responders[id]!.drafted).toBe(true);
  expect(goHere(initial, "missing-map", id, destination).state).toBe(initial);
  expect(goHere(initial, initial.world.map.id, id, { x: -1, y: 0 }).state).toBe(
    initial,
  );
  const carried = {
    ...initial,
    objects: {
      ...initial.objects,
      items: initial.objects.items.map((item) =>
        item.id === "stock-meals"
          ? { ...item, location: { kind: "carried" as const, personId: id } }
          : item,
      ),
    },
  };
  expect(goHere(carried, initial.world.map.id, id, destination)).toEqual({
    state: carried,
    code: "busy",
  });
});

it("preserves protected appointments, ordinary work progress, and action recovery", () => {
  let state = requestAssessment(
    createInitialState(),
    "person-caleb-ward",
    "mood",
  );
  state = advanceSimulation(state);
  expect(
    goHere(state, state.world.map.id, "person-caleb-ward", { x: 60, y: 55 })
      .code,
  ).toBe("busy");
  state = orderSurfaceWork(
    createInitialState(),
    { x: 63, y: 79 },
    "floor",
    "steel",
    "floor",
  ).state;
  for (
    let step = 0;
    step < 80 &&
    !state.jobs.some((job) => job.status === "in-progress" && job.progress > 0);
    step += 1
  )
    state = advanceSimulation(state);
  const job = state.jobs.find((job) => job.status === "in-progress")!;
  const issued = goHere(state, state.world.map.id, job.assignedPersonId!, {
    x: 66,
    y: 65,
  });
  expect(issued.code).toBe("accepted");
  expect(issued.state.jobs.find((entry) => entry.id === job.id)).toMatchObject({
    progress: job.progress,
    assignedPersonId: null,
    status: "available",
  });
  expect(issued.state.objects).toEqual(state.objects);
  const id = job.assignedPersonId!;
  const recovering = {
    ...issued.state,
    combat: {
      ...issued.state.combat,
      responders: {
        ...issued.state.combat.responders,
        [id]: {
          ...issued.state.combat.responders[id]!,
          phase: "recovering" as const,
          remaining: 3,
          ammunition: 7,
        },
      },
    },
  };
  expect(
    goHere(recovering, recovering.world.map.id, id, { x: 65, y: 65 }).state
      .combat.responders[id],
  ).toMatchObject({
    phase: "recovering",
    remaining: 3,
    ammunition: 7,
    returnToAutonomy: true,
  });
});

it("routes field movement only to the named live map and blocks recovery/assembly ownership", () => {
  const controller = createController(createInitialState());
  const team = ["person-caleb-ward", "person-lena-ortiz"];
  controller.enlistExpedition("notice-depot", team);
  expect(
    controller.goHere(controller.getSnapshot().game.world.map.id, team[0]!, {
      x: 60,
      y: 55,
    }).code,
  ).toBe("busy");
  controller.advance(100);
  controller.dispatchExpedition();
  const arrived = controller.advance(30);
  const mapId = arrived.game.expeditions.active!.site!.world.map.id;
  const result = controller.goHere(mapId, team[0]!, { x: 6, y: 12 });
  expect(result.code).toBe("accepted");
  expect(result.snapshot.game.combat.responders[team[0]!]).toBeUndefined();
  expect(
    result.snapshot.game.expeditions.active!.site!.combat.responders[team[0]!],
  ).toMatchObject({ destination: { x: 6, y: 12 }, returnToAutonomy: false });
  expect(controller.goHere("stale-map", team[0]!, { x: 6, y: 12 }).code).toBe(
    "not-found",
  );
  controller.recoverExpeditionObject(
    arrived.game.expeditions.active!.id,
    team[1]!,
    `${arrived.game.expeditions.active!.id}-archive`,
  );
  expect(controller.goHere(mapId, team[1]!, { x: 6, y: 12 }).code).toBe("busy");
});
