import { expect, type Page } from "@playwright/test";
import type { ScenarioSession } from "../src/application/ScenarioSession";

export async function finish(page: Page, label = "Finish current commitments") {
  for (let attempt = 0; attempt < 8; attempt++) {
    const action = page.getByRole("button", { name: label, exact: true });
    if (attempt && !(await action.count())) return;
    await action.click();
    const status = await page.getByRole("status").innerText();
    if (status.includes("ALARM")) {
      await page.screenshot({
        path: "test-results/campaign-alarm.png",
        fullPage: true,
      });
      continue; // Explicitly resume after seeing the global alarm.
    }
    expect(status).toContain("Watched commitments finished");
    return;
  }
  throw new Error("Repeated alarms prevented completion.");
}

export async function travel(
  page: Page,
  destination: string,
  crew = ["alex", "ben"],
  passengers: string[] = [],
) {
  await page
    .getByRole("button", { name: "Travel / preparation", exact: true })
    .click();
  await page
    .getByLabel("Destination", { exact: true })
    .selectOption(destination);
  const checkboxes = page.locator(".travel-view input[type=checkbox]");
  for (const checkbox of await checkboxes.all()) await checkbox.uncheck();
  for (const name of [...crew, ...passengers])
    await page.getByRole("checkbox", { name, exact: true }).check();
  if (!passengers.length) {
    await page.getByRole("button", { name: "Assemble selected staff" }).click();
    await finish(page, "Finish selected preparation");
  }
  await expect(
    page.getByRole("button", { name: "Depart with this manifest" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Depart with this manifest" }).click();
  await finish(page, "Wait for arrival");
  await page
    .getByRole("button", { name: "Open destination map", exact: true })
    .click();
}

export async function order(
  page: Page,
  worker: string,
  target: string,
  label: string,
) {
  await page
    .getByLabel("Worker", { exact: true })
    .selectOption({ label: worker });
  await page.getByLabel("Inspect", { exact: true }).selectOption(target);
  await page.getByRole("button", { name: label, exact: true }).click();
  await finish(page);
}

export async function floor(page: Page, x: number, y: number) {
  await page.getByRole("button", { name: "Choose floor destination" }).click();
  await page.locator(`[data-tile="${x},${y}"]`).click();
}

export async function deliver(
  page: Page,
  worker: string,
  x: number,
  y: number,
) {
  await page
    .getByLabel("Worker", { exact: true })
    .selectOption({ label: worker });
  await floor(page, x, y);
  await page.getByRole("button", { name: /^Deliver .+ here$/ }).click();
  await finish(page);
}

export async function inspectNamed(page: Page, name: string): Promise<string> {
  const option = page
    .getByLabel("Inspect", { exact: true })
    .locator("option")
    .filter({ hasText: name });
  const id = await option.getAttribute("value");
  expect(id).toBeTruthy();
  await page.getByLabel("Inspect", { exact: true }).selectOption(id!);
  return id!;
}

export async function save(page: Page): Promise<ScenarioSession> {
  await page.getByRole("button", { name: "SCP menu" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "SCP menu" }).click();
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("simfoundation.web.session.v1")!),
  );
}
