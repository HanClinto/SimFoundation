import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { updateWorkOrders } from "../src/adapters/browser/work-orders-view";
import { setWorkPriority, type WorkPriority } from "../src/simulation/jobs";
import { createInitialState, createTestJobs } from "./fixtures/work-state";

afterEach(() => vi.unstubAllGlobals());
it("sorts by effective priority and keeps selection and controls stable while editing", () => {
  const window = new JSDOM("<!doctype html><body></body>").window;
  vi.stubGlobal("document", window.document);
  const state = createInitialState();
  const base = { ...createTestJobs()[0]!, status: "available" as const };
  let jobs = [
    { ...base, id: "job-first", title: "First", priority: 60 },
    { ...base, id: "job-second", title: "Second", priority: 40 },
  ];
  const edit = vi.fn((id: string, priority: WorkPriority | null) => {
    jobs = [...setWorkPriority(jobs, id, priority)] as typeof jobs;
    render();
  });
  const render = () =>
    updateWorkOrders(document.body, jobs, state.personnel, state.world, edit);
  render();
  const secondRow = document.querySelector<HTMLElement>(
    '[data-order-row="job-second"]',
  )!;
  secondRow.click();
  const select = document.querySelector<HTMLSelectElement>(
    '[data-job-id="job-second"] [data-job-priority]',
  )!;
  select.value = "high";
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  expect(edit).toHaveBeenCalledWith("job-second", "high");
  expect(
    document.querySelector<HTMLElement>("[data-order-row]")!.dataset.orderRow,
  ).toBe("job-second");
  expect(
    document.querySelector('[data-job-id="job-second"] [data-job-priority]'),
  ).toBe(select);
  expect(
    document.querySelector<HTMLElement>('[data-job-id="job-second"]')!.hidden,
  ).toBe(false);
  expect(secondRow.textContent).toContain("High 75");
  render();
  expect(
    document.querySelector('[data-job-id="job-second"] [data-job-priority]'),
  ).toBe(select);
  select.value = "automatic";
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  expect(
    document.querySelector<HTMLElement>("[data-order-row]")!.dataset.orderRow,
  ).toBe("job-first");
  expect(
    document.querySelector<HTMLElement>('[data-job-id="job-second"]')!.hidden,
  ).toBe(false);
});

it("makes completed and emergency priority controls read-only", () => {
  const window = new JSDOM("<!doctype html><body></body>").window;
  vi.stubGlobal("document", window.document);
  const state = createInitialState();
  const base = createTestJobs()[0]!;
  updateWorkOrders(
    document.body,
    [{ ...base, priority: 95 }],
    state.personnel,
    state.world,
    vi.fn(),
  );
  const control = document.querySelector<HTMLSelectElement>(
    "[data-job-priority]",
  )!;
  expect(control.disabled).toBe(true);
  expect(control.title).toContain("emergency");
  updateWorkOrders(
    document.body,
    [{ ...base, priority: 50, status: "completed" }],
    state.personnel,
    state.world,
    vi.fn(),
  );
  expect(control.disabled).toBe(true);
  expect(control.title).toContain("Completed");
});
