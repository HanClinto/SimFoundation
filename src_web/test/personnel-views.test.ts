import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  createPersonnelInspectorWindows,
  updatePersonnelInspectors,
} from "../src/adapters/browser/personnel-view";
import {
  createPersonnelMedicalWindows,
  updatePersonnelMedicalWindows,
} from "../src/adapters/browser/medical-view";
import { createClinicalCareView } from "../src/adapters/browser/clinical-care-view";
import { createController } from "../src/application/controller";
import { completeAssessment } from "../src/simulation/clinical";

beforeEach(() => {
  const window = new JSDOM("<!doctype html><html><body></body></html>").window;
  for (const name of [
    "document",
    "HTMLElement",
    "Element",
    "DOMParser",
    "XMLSerializer",
    "KeyboardEvent",
  ] as const)
    vi.stubGlobal(name, window[name]);
});
afterEach(() => vi.unstubAllGlobals());

describe("personnel reference windows", () => {
  it("shows a mood screener without disclosing a psychiatric assessment", () => {
    const state = createInitialState();
    const person = completeAssessment(
      state.personnel[0]!,
      "mood",
      10,
      state.personnel[1]!,
    );
    const windows = createPersonnelInspectorWindows(document.body, [person]);
    expect(
      windows[0]!.querySelector('[data-field="mood-band"]')?.textContent,
    ).toContain("Screener");
    expect(
      windows[0]!.querySelector('[data-field="sanity-band"]')?.textContent,
    ).toBe("Observed only / unassessed");
    const records = createPersonnelMedicalWindows(document.body, [person]);
    expect(records.assessmentRecords[0]?.textContent).toContain(
      "psychiatric condition not evaluated",
    );
  });
  it("compares every pawn against the selected procedure and preserves separate review intervals", () => {
    const controller = createController(createInitialState());
    const host = document.createElement("div");
    document.body.append(host);
    const view = createClinicalCareView(host, controller);
    expect(host.querySelectorAll("[data-assignment-person]")).toHaveLength(6);
    const procedure = host.querySelector<HTMLSelectElement>(
      "[data-clinical-procedure]",
    )!;
    procedure.value = "psychological";
    procedure.dispatchEvent(new document.defaultView!.Event("change"));
    expect(
      host.querySelector(
        '[data-assignment-person="person-mara-voss"] [data-assignment-eligibility]',
      )?.textContent,
    ).toBe("Medical 5 required");
    const policy = host.querySelector<HTMLSelectElement>(
      '[data-survey-interval="mood"]',
    )!;
    policy.value = "240";
    policy.dispatchEvent(new document.defaultView!.Event("change"));
    view.render(controller.getSnapshot());
    expect(controller.getSnapshot().game.clinicalCare).toMatchObject({
      reviewInterval: 0,
      moodReviewInterval: 240,
    });
  });
  it("shows clinician coverage and queued referrals without exposing an examination", () => {
    const controller = createController(createInitialState());
    const host = document.createElement("div");
    document.body.append(host);
    const view = createClinicalCareView(host, controller);
    view.render(controller.orderPhysicalAssessment("person-lena-ortiz"));
    const row = host.querySelector(
      '[data-clinical-person="person-lena-ortiz"]',
    )!;
    expect(row.textContent).toContain("No review on record");
    expect(row.textContent).toContain("Queued");
    expect(
      host.querySelector("[data-clinical-coverage]")?.textContent,
    ).toContain("second clinician");
  });
  it("preserves item controls and descriptions across updates", () => {
    const state = createInitialState();
    const windows = createPersonnelInspectorWindows(
      document.body,
      state.personnel,
    );
    const dossier = windows[0]!;
    const item = dossier.querySelector<HTMLButtonElement>(
      '[data-equipment-tile="primaryHand"]',
    )!;
    item.click();
    expect(
      dossier.querySelector("[data-item-caption-title]")?.textContent,
    ).toBe("Telemetry Tablet");
    const inventoryItem =
      dossier.querySelector<HTMLButtonElement>(".inventory-slot")!;
    inventoryItem.focus();
    updatePersonnelInspectors(windows, state.personnel, 50);
    expect(dossier.querySelector(".inventory-slot")).toBe(inventoryItem);
    expect(document.activeElement).toBe(inventoryItem);
    expect(
      dossier.querySelector('[data-value="stress"]')?.textContent,
    ).not.toMatch(/\d+%/);
    const image = item.querySelector("img")!;
    expect(decodeURIComponent(image.src)).toContain('viewBox="160 0 80 80"');
  });
  it("supports arrow-key dossier tab navigation", () => {
    const dossier = createPersonnelInspectorWindows(
      document.body,
      createInitialState().personnel,
    )[0]!;
    const summary = dossier.querySelector<HTMLButtonElement>(
      '[data-dossier-tab="summary"]',
    )!;
    summary.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(
      dossier
        .querySelector('[data-dossier-tab="equipment"]')
        ?.getAttribute("aria-selected"),
    ).toBe("true");
    expect(dossier.querySelectorAll('[role="tab"][tabindex="0"]')).toHaveLength(
      1,
    );
  });
  it("keeps medical region filtering across simulation updates", () => {
    const state = createInitialState();
    const windows = createPersonnelMedicalWindows(
      document.body,
      state.personnel,
    );
    const chart = windows.medicalCharts.find(
      ({ dataset }) => dataset.personId === "person-lena-ortiz",
    )!;
    chart
      .querySelector<HTMLButtonElement>('[data-body-region="leftArm"]')!
      .click();
    updatePersonnelMedicalWindows(windows, state.personnel, 50, false);
    const rightArmFinding = chart.querySelector<HTMLElement>(
      '[data-finding-regions="rightArm"]',
    );
    expect(rightArmFinding).not.toBeNull();
    expect(rightArmFinding?.hidden).toBe(true);
    expect(chart.querySelector(".anatomy-illustration")).not.toBeNull();
    expect(chart.textContent).not.toContain("Deep right forearm laceration");
  });
});
