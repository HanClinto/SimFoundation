import { expect, test } from "@playwright/test";
import {
  deliver,
  finish,
  floor,
  inspectNamed,
  order,
  save,
  containedSpecimen,
} from "./play";

test("live containment research crafts a real restraint used for awake care and recontainment", async ({
  page,
}) => {
  await page.goto("./");
  const specimen = await containedSpecimen(page);
  await page
    .getByLabel("Inspect", { exact: true })
    .selectOption("site-1:holding");
  const study = page.getByRole("button", {
    name: "Study Kinetic restraint loading study",
    exact: true,
  });
  await study.click();
  await finish(page);
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
  await page.getByRole("button", { name: /^Craft / }).click();
  await finish(page);
  const band = await inspectNamed(page, "Damped kinetic restraint");
  await expect(page.locator(".inspection-pane")).toContainText(
    "Manufacturing provenance",
  );
  await floor(page, 5, 3);
  await page.getByRole("button", { name: "Move here", exact: true }).click();
  await finish(page);
  await order(page, "alex", band, "Take / recover");
  await page.getByLabel("Inspect", { exact: true }).selectOption(specimen);
  await page.getByLabel("Restraint", { exact: true }).selectOption(band);
  await page.getByRole("button", { name: "Fit / exchange restraint" }).click();
  await finish(page);
  await floor(page, 3, 1);
  await page
    .getByRole("button", { name: "Deliver target to floor destination" })
    .click();
  await finish(page);
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:casey");
  await page.getByLabel("Inspect", { exact: true }).selectOption(specimen);
  await page
    .getByRole("button", { name: "Treat wounds at clinical bed" })
    .click();
  await finish(page);
  await page
    .getByRole("button", { name: "Nurse blood / postoperative care" })
    .click();
  await finish(page);
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:ben");
  await page
    .getByLabel("Inspect", { exact: true })
    .selectOption("site-1:holding");
  await page
    .getByRole("button", { name: "Clear selected service assignment" })
    .click();
  if (
    await page
      .getByRole("button", { name: "Finish current commitments", exact: true })
      .count()
  )
    await finish(page);
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:alex");
  await page.getByLabel("Inspect", { exact: true }).selectOption(specimen);
  await page.getByRole("button", { name: "Intake into holding" }).click();
  await finish(page);
  await page.getByRole("button", { name: "Remove restraint" }).click();
  await finish(page);
  const session = await save(page);
  const home = session.state.sites["site-1"]!;
  expect(home.entities[specimen]!.location).toEqual({
    kind: "carried",
    carrierId: "site-1:holding",
  });
  const crafted = home.entities[band];
  if (crafted?.kind !== "item") throw new Error("Crafted restraint missing.");
  expect(
    crafted.crafted?.inputs.reduce((total, entry) => total + entry.amount, 0),
  ).toBe(2);
  expect(crafted.restraint?.wearPerTick).toBe(0.5);
  expect(crafted.integrity).toBeGreaterThan(0);
  expect(crafted.integrity).toBeLessThan(200);
  await page.screenshot({
    path: "test-results/research-restraint.png",
    fullPage: true,
  });
});
