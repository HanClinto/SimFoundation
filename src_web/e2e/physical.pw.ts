import { expect, test } from "@playwright/test";
import {
  finish,
  floor,
  inspectNamed,
  order,
  save,
  travel,
  openGame,
} from "./play";

test("cooperative medical evacuation retains the same patient and care consequences", async ({
  page,
}) => {
  await openGame(page);
  await travel(page, "care", ["casey"]);
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:casey");
  const mira = await inspectNamed(page, "Mira");
  await page
    .getByRole("button", { name: "Stabilize bleeding", exact: true })
    .click();
  await finish(page);
  await floor(page, 2, 3);
  await page
    .getByRole("button", { name: "Escort to floor destination", exact: true })
    .click();
  await finish(page);
  await travel(page, "home", ["casey"], ["Mira"]);
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:casey");
  await page.getByLabel("Inspect", { exact: true }).selectOption(mira);
  await page
    .getByRole("button", { name: "Admit to home care", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("within one tile");
  await floor(page, 4, 2);
  await page
    .getByRole("button", { name: "Escort to floor destination", exact: true })
    .click();
  await finish(page);
  await page
    .getByRole("button", {
      name: "Nurse blood / postoperative care",
      exact: true,
    })
    .click();
  await finish(page);
  await page
    .getByRole("button", { name: "Treat wounds at clinical bed", exact: true })
    .click();
  await finish(page);
  await floor(page, 6, 2);
  await page
    .getByRole("button", { name: "Escort to floor destination", exact: true })
    .click();
  await finish(page);
  await page
    .getByLabel("Home admission bed", { exact: true })
    .selectOption("site-1:bed");
  await page
    .getByRole("button", { name: "Admit to home care", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("admitted");
  const session = await save(page);
  const patient = session.state.sites["site-1"]!.entities[mira];
  if (patient?.kind !== "pawn" || !patient.health)
    throw new Error("Patient missing after evacuation.");
  expect(patient.id).toBe(mira);
  expect(patient.health.wounds[0]!.bleeding).toBe(0);
  expect(patient.health.bloodLoss).toBe(0);
  expect(patient.health.wounds[0]!.recovery?.length).toBeGreaterThan(0);
  expect(session.campaign!.admissions[mira]!.bedId).toBe("site-1:bed");
  await page.screenshot({
    path: "test-results/medical-admission.png",
    fullPage: true,
  });
});

test("portions and handoffs preserve quantities; fragile recovery requires an actual case", async ({
  page,
}) => {
  await openGame(page);
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:ben");
  await page
    .getByLabel("Inspect", { exact: true })
    .selectOption("site-1:parts");
  await page.getByLabel("Portions to collect").fill("2");
  await page.getByLabel("Portions to collect").press("Tab");
  await page.getByRole("button", { name: "Collect selected portion" }).click();
  await finish(page);
  await page.getByLabel("Inspect", { exact: true }).selectOption("site-1:ben");
  await page
    .locator(".inspection-pane")
    .getByRole("button", { name: /Maintenance.*\(2\)/i })
    .click();
  await page
    .getByLabel("Recipient", { exact: true })
    .selectOption("site-1:alex");
  await page.getByRole("button", { name: "Hand over to recipient" }).click();
  await finish(page);
  const portionSession = await save(page);
  const home = portionSession.state.sites["site-1"]!;
  expect(home.entities["site-1:parts"]!.amount).toBe(2);
  expect(
    Object.values(home.entities).some(
      (entity) =>
        entity.amount === 2 &&
        entity.location.kind === "carried" &&
        entity.location.carrierId === "site-1:alex",
    ),
  ).toBe(true);
  await order(page, "casey", "site-1:case", "Take / recover");
  await travel(page, "courier", ["casey"]);
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:casey");
  const vial = await inspectNamed(page, "Fragile survey vial");
  await expect(
    page.getByRole("button", { name: "Take / recover", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Protective case", { exact: true })
    .selectOption("site-1:case");
  await page.getByRole("button", { name: "Pack in selected case" }).click();
  await finish(page);
  const session = await save(page);
  const courier = session.state.sites[session.campaign!.siteIds.courier!]!;
  expect(courier.entities[vial]!.location).toEqual({
    kind: "carried",
    carrierId: "site-1:case",
  });
  expect(courier.entities["site-1:case"]!.integrity).toBe(35);
  await page.screenshot({
    path: "test-results/packed-courier.png",
    fullPage: true,
  });
});
