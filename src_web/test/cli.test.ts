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
