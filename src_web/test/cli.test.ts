import { expect, it } from "vitest";
import {
  openConsole,
  renderMap,
  executeLine,
} from "../src/adapters/cli/Console";

it("renders terrain and entities separately, retaining stacked and carried occupants in the legend", () => {
  const console = openConsole("daily");
  const site = console.session.state.sites[console.siteId]!;
  site.entities[`${site.id}:meals`]!.location =
    site.entities[`${site.id}:researcher`]!.location;
  expect(renderMap(console)).toContain("++");
  expect(renderMap(console)).toContain(`${site.id}:meals`);
  site.entities[`${site.id}:meals`]!.location = {
    kind: "carried",
    carrierId: `${site.id}:researcher`,
  };
  expect(renderMap(console)).toContain("carried by");
});

it("plays and inspects the same quest session as integration tests without mutation from inspection", () => {
  const console = openConsole("response");
  const before = JSON.stringify(console);
  expect(executeLine(console, "inspect soldier").output).toContain("concern");
  expect(JSON.stringify(console)).toBe(before);
  const result = executeLine(console, "run 40");
  expect(result.console.session.quest?.status).toBe("succeeded");
  expect(result.output).toContain("SUCCEEDED");
  expect(executeLine(result.console, "events").output).toContain("treated");
});

it("issues real player commands and rejects invalid tick counts", () => {
  let console = openConsole("daily");
  console = executeLine(console, "autonomy researcher off").console;
  expect(executeLine(console, "move researcher 6 4").output).toContain(
    "accepted",
  );
  console = executeLine(console, "move researcher 6 4").console;
  console = executeLine(console, "step 1").console;
  expect(executeLine(console, "inspect researcher").output).toContain('"x": 6');
  expect(() => executeLine(console, "step -1")).toThrow();
  expect(() => executeLine(console, "load unknown")).toThrow();
  expect(() =>
    executeLine(console, 'order researcher {"kind":"move"}'),
  ).toThrow("coordinates");
  expect(
    executeLine(console, 'order researcher {"kind":"read","targetId":"shelf"}')
      .output,
  ).toContain("accepted");
});

it("shows SCP briefings and source context and submits ordinary study commands", () => {
  const console = openConsole("scp1867");
  const before = JSON.stringify(console);
  expect(executeLine(console, "brief").output).toContain("Djoric");
  expect(executeLine(console, "brief").output).toContain(
    "both independent records",
  );
  expect(executeLine(console, "inspect journal").output).toContain(
    "not an independent corroboration",
  );
  expect(JSON.stringify(console)).toBe(before);
  expect(() => executeLine(console, "study investigator bench")).toThrow(
    "plan ID",
  );
  expect(
    executeLine(console, "study investigator bench marsh-lead").output,
  ).toContain("accepted");
  expect(executeLine(openConsole("scp1370"), "brief").output).toContain(
    "Sorts",
  );
});

it("explains a new move queued behind an occupied destination and allows cancellation of only the blocker", () => {
  let console = openConsole("scp1370");
  console = executeLine(console, "move 02 4 5").console;
  console = executeLine(console, "step 5").console;
  const queued = executeLine(console, "move 02 3 5");
  expect(queued.output).toContain("action-2");
  expect(queued.output).toContain(
    "queued at position 2 behind action-1: move to (4,5)",
  );
  expect(queued.output).toContain("cancel 02 action-1");
  console = executeLine(queued.console, "step 1").console;
  const before = JSON.stringify(console);
  const queue = executeLine(console, "queue 02").output;
  expect(queue).toContain("current action-1: move to (4,5)");
  expect(queue).toContain("pending action-2: move to (3,5)");
  expect(JSON.stringify(console)).toBe(before);
  expect(renderMap(console)).toContain(
    "action-1: move to (4,5) | blocked: The destination is occupied. | 1 pending",
  );
  console = executeLine(console, "cancel 02 action-1").console;
  console = executeLine(console, "step 3").console;
  expect(
    console.session.state.sites[console.siteId]!.entities[
      `${console.siteId}:handler`
    ]!.location,
  ).toEqual({ kind: "ground", position: { x: 3, y: 5 } });
  expect(executeLine(console, "queue 02").output).toBe("No queued actions.");
});
