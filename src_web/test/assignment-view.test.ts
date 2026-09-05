import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAssignmentView } from "../src/adapters/browser/assignment-view";
import { createInitialState } from "../src/simulation/state";

afterEach(() => vi.unstubAllGlobals());
describe("reusable assignment table", () => {
  it("lists untrained personnel, supports variable selection, and sorts skill independently from availability", () => {
    const window = new JSDOM("<!doctype html><body></body>").window;
    vi.stubGlobal("document", window.document);
    vi.stubGlobal("DOMParser", window.DOMParser);
    vi.stubGlobal("XMLSerializer", window.XMLSerializer);
    const host = document.createElement("div");
    document.body.append(host);
    const state = createInitialState();
    const onChange = vi.fn();
    const view = createAssignmentView(host, {
      id: "test-duty",
      label: "Test assignments",
      skillId: "medical",
      eligibility: () => "Eligible",
      onChange,
    });
    view.render(state.personnel, [], []);
    expect(host.querySelectorAll("tbody tr")).toHaveLength(6);
    expect(host.querySelectorAll("[data-assignment-portrait]")).toHaveLength(6);
    expect(
      new Set(
        Array.from(
          host.querySelectorAll<HTMLImageElement>("[data-assignment-portrait]"),
          (image) => image.src,
        ),
      ).size,
    ).toBe(6);
    const checkbox = host.querySelector<HTMLInputElement>(
      '[data-assignment-toggle="person-caleb-ward"]',
    )!;
    checkbox.click();
    expect(onChange).toHaveBeenCalledWith(["person-caleb-ward"]);
    const sort = host.querySelector<HTMLSelectElement>(
      "[data-assignment-sort]",
    )!;
    sort.value = "skill";
    sort.dispatchEvent(new window.Event("change"));
    expect(
      host.querySelector<HTMLElement>("tbody tr")?.dataset.assignmentPerson,
    ).toBe("person-priya-shah");
    view.render(
      state.personnel,
      [
        {
          ...state.jobs[0]!,
          status: "in-progress",
          assignedPersonId: "person-priya-shah",
        },
      ],
      ["person-caleb-ward"],
    );
    sort.value = "availability";
    sort.dispatchEvent(new window.Event("change"));
    expect(
      host.querySelector<HTMLElement>("tbody tr:last-child")?.dataset
        .assignmentPerson,
    ).toBe("person-priya-shah");
    expect(
      host.querySelector('[data-assignment-toggle="person-caleb-ward"]'),
    ).toBe(checkbox);
  });
});
