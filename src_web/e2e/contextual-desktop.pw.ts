import { expect, test } from "@playwright/test";
import { save } from "./play";

test("playback tray renders visible media glyphs and uses real tick controls", async ({
  page,
}) => {
  await page.goto("./");
  const run = page.getByRole("button", { name: "Run", exact: true });
  const glyph = run.locator("svg").first();
  const geometry = await glyph.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const path = node.querySelector("path")!;
    return {
      width: rect.width,
      height: rect.height,
      fill: getComputedStyle(path).fill,
    };
  });
  expect(geometry.width).toBeGreaterThanOrEqual(12);
  expect(geometry.height).toBeGreaterThanOrEqual(12);
  expect(geometry.fill).toBe("rgb(21, 21, 21)");
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await expect(page.locator(".clock")).toHaveText("Tick 1 | PAUSED");
  await run.click();
  await expect(
    page
      .getByRole("button", { name: "Pause", exact: true })
      .locator("svg")
      .last(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
});

test("portrait and target clicks append a Sims-style queue without opening an inspector or ticking", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .locator(".portrait-strip")
    .getByRole("button", { name: "alex", exact: true })
    .click();
  await page.locator('[data-entity-id="site-1:kit"]').click();
  await expect(page.getByRole("menu", { name: /alex:/ })).toBeVisible();
  await page
    .getByRole("menuitem", { name: "Take / recover", exact: true })
    .click();
  await page.locator('[data-tile="3,8"]').click();
  await page.getByRole("menuitem", { name: "Move here", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Entity inspector", exact: true }),
  ).toBeHidden();
  await expect(page.locator(".action-tray .queue-entry")).toHaveCount(2);
  await expect(page.locator(".clock")).toContainText("Tick 0");
  const session = await save(page);
  const actor = session.state.sites["site-1"]!.entities["site-1:alex"]!;
  if (actor.kind !== "pawn") throw new Error("Worker missing");
  expect(actor.queue.map((entry) => entry.action.kind)).toEqual([
    "take",
    "move",
  ]);
  expect(
    session.state.sites["site-1"]!.entities["site-1:kit"]!.location.kind,
  ).toBe("ground");
  await page
    .locator(".action-tray .queue-entry")
    .first()
    .getByRole("button", { name: "Cancel" })
    .click();
  await expect(page.locator(".action-tray .queue-entry")).toHaveCount(1);
  await expect(page.locator(".action-tray")).toContainText("move");
  await page.screenshot({
    path: "test-results/contextual-queue.png",
    fullPage: true,
  });
});

test("Start and window tasks have icons, keyboard submenus and distinct focused windows", async ({
  page,
}) => {
  await page.goto("./");
  const start = page.getByRole("button", { name: "SCP menu" });
  await expect(start.locator("img")).toBeVisible();
  await expect(page.locator(".task-buttons button:visible img")).toHaveCount(1);
  await start.click();
  const facilities = page.getByRole("menuitem", {
    name: "Facilities",
    exact: true,
  });
  await expect(facilities).toBeFocused();
  await facilities.press("ArrowRight");
  await expect(
    page.getByRole("menu", { name: "Facilities", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(facilities).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(start).toBeFocused();
  await start.click();
  await page.getByRole("menuitem", { name: "Windows", exact: true }).click();
  await page.getByRole("menuitem", { name: "Personnel", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Personnel", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".task-buttons")
      .getByRole("button", { name: "Personnel", exact: true })
      .locator("img"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close Personnel" }).click();
  await page
    .getByRole("button", { name: "Travel / preparation", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Expeditions", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Operations & history", exact: true }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Close Expeditions" }).click();
  await page.locator('[data-entity-id="site-1:kit"]').dblclick();
  await expect(
    page.getByRole("region", { name: "Entity inspector", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".clock")).toContainText("Tick 0");
  await page.screenshot({
    path: "test-results/focused-windows.png",
    fullPage: true,
  });
});

test("contextual study uses a real submenu and Escape never changes queued work", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .locator(".portrait-strip")
    .getByRole("button", { name: "ben", exact: true })
    .click();
  await page.locator('[data-entity-id="site-1:bench"]').click();
  await page.getByRole("menuitem", { name: "Study", exact: true }).click();
  await expect(
    page.getByRole("menu", { name: "Study", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.locator(".queue-dock")).toContainText("No queued work");
  await expect(page.locator(".clock")).toContainText("Tick 0");
});
