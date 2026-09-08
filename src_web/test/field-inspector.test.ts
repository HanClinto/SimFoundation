import { expect, it, vi, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { createController } from "../src/application/controller";
import { createInitialState } from "../src/simulation/state";
import {
  createFieldInspector,
  fieldInspectionTarget,
  fieldRecord,
} from "../src/adapters/browser/field-inspector";

afterEach(() => vi.unstubAllGlobals());
function arrival() {
  const controller = createController(createInitialState());
  controller.enlistExpedition("notice-depot", [
    "person-caleb-ward",
    "person-lena-ortiz",
  ]);
  controller.advance(100);
  controller.dispatchExpedition();
  return controller.advance(30);
}
it("routes only explicit orders to operations, people to dossiers and other selections to records", () => {
  expect(fieldInspectionTarget("tactical:person-caleb-ward")).toEqual({
    kind: "orders",
    id: "person-caleb-ward",
  });
  expect(fieldInspectionTarget("person-caleb-ward").kind).toBe("personnel");
  for (const id of [
    "SCP-049-2",
    "object:expedition-1-archive",
    "tile:17,10:structure",
    "expedition-1-emission",
  ])
    expect(fieldInspectionTarget(id)).toEqual({ kind: "record", id });
});
it("inspects the selected field object, surface and adversary without inventing recorded observations", () => {
  const snapshot = arrival();
  expect(
    fieldRecord(snapshot, "object:expedition-1-archive", "world"),
  ).toMatchObject({
    title: "Recovered archive case",
    position: { x: 14, y: 8 },
  });
  expect(
    fieldRecord(snapshot, "object:expedition-1-archive", "recorded").position,
  ).toBeNull();
  expect(
    fieldRecord(snapshot, "tile:17,10:structure", "world").rows,
  ).toContainEqual(["Door policy", "automatic"]);
  expect(fieldRecord(snapshot, "SCP-049-2", "world").rows).toContainEqual([
    "Behavior",
    "Patrolling; no visible target",
  ]);
  expect(fieldRecord(snapshot, "SCP-049-2", "recorded").position).toBeNull();
});
it("binds its record to expedition identity and disables locating after that location is disposed", () => {
  vi.stubGlobal("document", new JSDOM().window.document);
  const snapshot = arrival();
  const locate = vi.fn();
  const view = createFieldInspector(document.body, locate);
  view.select("object:expedition-1-archive", snapshot, "world");
  view.element
    .querySelector<HTMLButtonElement>("button[data-field-locate]")!
    .click();
  expect(locate).toHaveBeenCalledWith({ x: 14, y: 8 });
  view.render({
    ...snapshot,
    game: {
      ...snapshot.game,
      expeditions: { ...snapshot.game.expeditions, active: null },
    },
  });
  expect(view.element.textContent).toContain("This expedition has ended.");
  expect(
    view.element.querySelector<HTMLButtonElement>("button[data-field-locate]")!
      .disabled,
  ).toBe(true);
});
