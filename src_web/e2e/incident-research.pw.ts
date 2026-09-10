import { expect, test } from "@playwright/test";
import {
  deliver,
  finish,
  floor,
  inspectNamed,
  order,
  save,
  travel,
} from "./play";

test("recorded disaster evidence survives a death and produces protection for another intervention", async ({
  page,
}) => {
  await page.goto("./");
  await order(page, "alex", "site-1:suppressor", "Fit equipment");
  await order(page, "alex", "site-1:vest", "Fit equipment");
  await order(page, "alex", "site-1:kit", "Take / recover");
  await travel(page, "intervention", ["alex"]);
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:alex");
  await floor(page, 4, 3);
  await page.getByRole("button", { name: "Move here", exact: true }).click();
  await finish(page);
  const specimen = await inspectNamed(page, "Kinetic specimen");
  await page.getByRole("button", { name: "Observe actual impacts" }).click();
  await finish(page);
  await page.getByLabel("Inspect", { exact: true }).selectOption("site-1:kit");
  await expect(page.locator(".inspection-pane")).toContainText(
    "physical records",
  );
  await page.getByLabel("Inspect", { exact: true }).selectOption("site-1:alex");
  await page.getByLabel("Wait ticks").fill("200");
  await page.getByLabel("Wait ticks").press("Tab");
  await page.getByRole("button", { name: "Wait in place" }).click();
  await finish(page);
  for (
    let ticks = 0;
    ticks < 200 &&
    !(await page
      .locator(".inspection-pane")
      .getByText(/^DEAD at tick/)
      .count());
    ticks++
  ) {
    await page.getByRole("button", { name: "Step", exact: true }).click();
  }
  await expect(page.locator(".alarm-banner")).toContainText("DIED");
  await page
    .getByRole("button", { name: "Acknowledge alarm", exact: true })
    .click();
  await page.getByLabel("Site", { exact: true }).selectOption("site-1");
  await travel(page, "intervention", ["casey"]);
  await order(page, "casey", "site-1:suppressor", "Fit equipment");
  await order(page, "casey", specimen, "Subdue with equipped tool");
  await order(page, "casey", "site-1:kit", "Take / recover");
  await travel(page, "home", ["casey"]);
  await deliver(page, "casey", 8, 1);
  await order(
    page,
    "ben",
    "site-1:workshop",
    "Study Kinetic impact recording analysis",
  );
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:casey");
  await page
    .getByLabel("Inspect", { exact: true })
    .selectOption("site-1:parts");
  await page.getByLabel("Portions to collect").fill("2");
  await page.getByLabel("Portions to collect").press("Tab");
  await page.getByRole("button", { name: "Collect selected portion" }).click();
  await finish(page);
  await deliver(page, "casey", 8, 1);
  await page
    .getByLabel("Inspect", { exact: true })
    .selectOption("site-1:workshop");
  await page
    .getByRole("button", { name: "Craft Short-burst impact vest", exact: true })
    .click();
  await finish(page);
  const vest = await inspectNamed(page, "Short-burst impact vest");
  await page
    .getByRole("button", { name: "Fit equipment", exact: true })
    .click();
  await finish(page);
  await order(page, "casey", "site-1:clinic", "sleep");
  await order(page, "casey", "site-1:restraint", "Take / recover");
  await travel(page, "intervention", ["casey"]);
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:casey");
  await page.getByLabel("Inspect", { exact: true }).selectOption(specimen);
  await floor(page, 2, 3);
  await page
    .getByRole("button", { name: "Capture to floor destination" })
    .click();
  await finish(page);
  const session = await save(page);
  const field = session.state.sites[session.campaign!.siteIds.intervention!]!;
  const alex = field.entities["site-1:alex"];
  const equipment = field.entities[vest];
  if (alex?.kind !== "pawn" || equipment?.kind !== "item")
    throw new Error("Persistent casualty or crafted equipment missing.");
  expect(alex.health?.death).toBeTruthy();
  expect(
    equipment.crafted?.research.finding.observationIds?.length,
  ).toBeGreaterThan(0);
  expect(equipment.equipment?.worn).toBe(true);
  expect(field.entities[specimen]!.location).toEqual({
    kind: "carried",
    carrierId: "site-1:casey",
  });
  await page.screenshot({
    path: "test-results/incident-research.png",
    fullPage: true,
  });
});
