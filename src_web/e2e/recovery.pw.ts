import { expect, test } from "@playwright/test";
import { finish, inspectNamed, save, travel, openGame } from "./play";

test("a critical alarm locates a death and a finite reserve recovers the original body", async ({
  page,
}) => {
  await openGame(page);
  await page.getByLabel("Speed", { exact: true }).selectOption("16");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator(".alarm-banner")).toContainText("Rowan", {
    timeout: 15000,
  });
  await page
    .getByRole("button", { name: "Acknowledge alarm", exact: true })
    .click();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator(".alarm-banner")).toContainText(
    "fatal critical interval",
    { timeout: 15000 },
  );
  await page
    .getByRole("button", { name: "Acknowledge alarm", exact: true })
    .click();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator(".alarm-banner")).toContainText("DIED", {
    timeout: 15000,
  });
  await page
    .getByRole("button", { name: "Locate incident", exact: true })
    .click();
  const rowan = await inspectNamed(page, "Rowan (pawn)");
  await expect(page.locator(".inspection-pane")).toContainText("DEAD at tick");
  await page
    .getByRole("button", { name: "Acknowledge alarm", exact: true })
    .click();
  await page.getByRole("button", { name: "Operations", exact: true }).click();
  await page
    .getByRole("button", { name: "Response desk", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Dispatch devon to inspected site" })
    .click();
  await expect(
    page.getByRole("button", { name: "Dispatch devon to inspected site" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Travel", exact: true }).click();
  await finish(page, "Wait for arrival");
  await page
    .getByRole("button", { name: "Site map & orders", exact: true })
    .click();
  await page
    .getByLabel("Worker", { exact: true })
    .selectOption({ label: "devon" });
  await page.getByLabel("Inspect", { exact: true }).selectOption(rowan);
  await page
    .getByRole("button", { name: "Take / recover", exact: true })
    .click();
  await finish(page);
  await travel(page, "home", ["devon"]);
  const session = await save(page);
  const body = session.state.sites["site-1"]!.entities[rowan];
  if (body?.kind !== "pawn") throw new Error("Original body not returned.");
  expect(body.health?.death).toBeTruthy();
  expect(body.location.kind).toBe("carried");
  expect(
    Object.values(session.state.sites["site-1"]!.entities).some(
      (entity) =>
        entity.location.kind === "carried" &&
        entity.location.carrierId === rowan,
    ),
  ).toBe(true);
  expect(session.campaign!.staffIds).toHaveLength(4);
  await page.screenshot({
    path: "test-results/reserve-recovery.png",
    fullPage: true,
  });
});
