import { openGame } from "./play";
import { expect, test } from "@playwright/test";

test("real desktop selection, physical work, persistence and layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openGame(page);
  await expect(
    page.getByText("New campaign paused.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:alex");
  await page.getByLabel("Inspect", { exact: true }).selectOption("site-1:kit");
  await expect(
    page.getByText("Orders for: alex", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Take / recover", exact: true })
    .click();
  await expect(page.locator(".action-tray")).toContainText("take");
  await page
    .getByRole("button", { name: "Finish current commitments", exact: true })
    .click();
  await expect(page.locator(".inspection-pane")).toContainText(
    "Carried / held by alex",
  );
  await page.getByRole("button", { name: "Choose floor destination" }).click();
  await page.locator('[data-tile="3,8"]').click();
  await page.getByRole("button", { name: "Move here", exact: true }).click();
  await page
    .locator(".action-tray")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(page.locator(".queue-dock")).toContainText("No queued work");
  await page.getByRole("button", { name: "SCP menu" }).click();
  await page.getByRole("menuitem", { name: "Save", exact: true }).click();
  const saved = await page.evaluate(() =>
    localStorage.getItem("simfoundation.web.session.v1"),
  );
  expect(saved).toBeTruthy();
  const session = JSON.parse(saved!);
  expect(session.state.sites["site-1"].entities["site-1:kit"].location).toEqual(
    { kind: "carried", carrierId: "site-1:alex" },
  );
  await page.reload();
  await expect(page.getByRole("status")).toContainText("Browser save restored");
  await page.getByRole("button", { name: "Operations", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Current commitments" }),
  ).toBeVisible();
  const title = page.locator('[aria-label="Operations & history"] .title-bar');
  const before = await title.boundingBox();
  await title.hover();
  await page.mouse.down();
  await page.mouse.move(before!.x + 150, before!.y + 100);
  await page.mouse.up();
  const after = await title.boundingBox();
  expect(after!.y).toBeGreaterThan(before!.y);
  const root = page.locator('[aria-label="Operations & history"]');
  const rect = await root.boundingBox();
  await page.mouse.move(rect!.x + rect!.width - 3, rect!.y + rect!.height - 3);
  await page.mouse.down();
  await page.mouse.move(
    rect!.x + rect!.width - 83,
    rect!.y + rect!.height - 53,
  );
  await page.mouse.up();
  expect((await root.boundingBox())!.width).toBeLessThan(rect!.width);
  await page
    .getByRole("button", { name: "Close Operations & history" })
    .click();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});
