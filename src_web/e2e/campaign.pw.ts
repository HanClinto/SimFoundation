import { expect, test } from "@playwright/test";
import { finish, travel, order, deliver } from "./play";

test("Blackwood recovery, home corroboration and Kestrel all use normal GUI commands", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page
    .getByRole("button", { name: "Travel / preparation", exact: true })
    .click();
  await page.getByLabel("Destination", { exact: true }).selectOption("kestrel");
  await expect(
    page.getByRole("button", { name: "Assemble selected staff" }),
  ).toBeDisabled();
  await expect(page.locator(".travel-view")).toContainText(
    "Home study required: marsh-lead",
  );
  await page
    .getByRole("button", { name: "Close Operations & history" })
    .click();
  await travel(page, "blackwood");
  await order(page, "alex", "site-2:journal", "Take / recover");
  await order(page, "ben", "site-2:specimen", "Take / recover");
  await travel(page, "home");
  await deliver(page, "alex", 3, 3);
  await deliver(page, "ben", 3, 5);
  await order(
    page,
    "ben",
    "site-1:bench",
    "Study Corroborated lead: Kestrel Marsh",
  );
  await order(page, "alex", "site-1:kit", "Take / recover");
  await travel(page, "kestrel");
  const station = await page
    .getByLabel("Inspect", { exact: true })
    .locator("option")
    .filter({ hasText: "Kestrel" })
    .getAttribute("value");
  expect(station).toBeTruthy();
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:alex");
  await page.getByLabel("Inspect", { exact: true }).selectOption(station!);
  await page.getByRole("button", { name: /^Study / }).click();
  await finish(page);
  await page.getByRole("button", { name: "SCP menu" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const session = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("simfoundation.web.session.v1")!),
  );
  expect(
    session.state.sites["site-1"].entities["site-1:bench"].study.findings[0]
      .planId,
  ).toBe("marsh-lead");
  const kestrel = session.state.sites[session.campaign.siteIds.kestrel];
  expect(kestrel.entities[station!].study.findings[0].planId).toBe(
    "depot-survey",
  );
  expect(kestrel.entities["site-1:alex"]).toBeTruthy();
  await page.screenshot({
    path: "test-results/campaign-kestrel.png",
    fullPage: true,
  });
  await page.reload();
  expect(errors).toEqual([]);
});
