import { expect, test, type Page } from "@playwright/test";
import { save } from "./play";

async function raiseAlarm(page: Page) {
  await page
    .getByRole("button", { name: "Inspect / more orders", exact: true })
    .click();
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:alex");
  await page.getByRole("tab", { name: "Orders", exact: true }).click();
  await page.getByLabel("Wait ticks").fill("100");
  await page
    .getByRole("button", { name: "Wait in place", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish current commitments", exact: true })
    .click();
  await expect(page.locator(".alarm-banner")).toBeVisible();
}

test("editing a quantity validates immediately and the first following click issues that amount", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Inspect / more orders", exact: true })
    .click();
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:alex");
  await page
    .getByLabel("Inspect", { exact: true })
    .selectOption("site-1:parts");
  await page.getByRole("tab", { name: "Cargo & gear", exact: true }).click();
  await page.getByLabel("Portions to collect").fill("0");
  await expect(
    page.getByRole("button", { name: "Collect selected portion" }),
  ).toBeDisabled();
  await page.getByLabel("Portions to collect").fill("3");
  await page.getByRole("button", { name: "Collect selected portion" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Queued: Collect selected portion",
  );
  await page
    .getByRole("button", { name: "Finish current commitments", exact: true })
    .click();
  const session = await save(page);
  expect(session.state.sites["site-1"]!.entities["site-1:parts"]!.amount).toBe(
    1,
  );
  await page.screenshot({
    path: "test-results/compact-cargo.png",
    fullPage: true,
  });
});

test("closed window positions survive browser resize and reopening", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Operations", exact: true }).click();
  const window = page.getByRole("region", {
    name: "Operations & history",
    exact: true,
  });
  const before = await window.boundingBox();
  await page
    .getByRole("button", { name: "Close Operations & history" })
    .click();
  await page.setViewportSize({ width: 1300, height: 900 });
  await page.getByRole("button", { name: "Operations", exact: true }).click();
  const after = await window.boundingBox();
  expect(after!.x).toBe(before!.x);
  expect(after!.y).toBe(before!.y);
});

test("successful load, new campaign and import clear old alarms; failed import preserves current state", async ({
  page,
}) => {
  await page.goto("./");
  const initial = await save(page);
  await raiseAlarm(page);
  await page.getByRole("button", { name: "SCP menu" }).click();
  await page
    .getByRole("menuitem", { name: "Load saved session", exact: true })
    .click();
  await expect(page.locator(".alarm-banner")).toBeHidden();
  await expect(page.locator(".clock")).toHaveText("Tick 0 | PAUSED");
  await raiseAlarm(page);
  await page.getByRole("button", { name: "SCP menu" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("menuitem", { name: "New campaign", exact: true })
    .click();
  await expect(page.locator(".alarm-banner")).toBeHidden();
  await expect(page.locator(".clock")).toHaveText("Tick 0 | PAUSED");
  await raiseAlarm(page);
  const tick = await page.locator(".clock").innerText();
  await page.locator('input[type="file"]').setInputFiles({
    name: "incompatible.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1}'),
  });
  await expect(page.getByRole("status")).toContainText("incompatible");
  await expect(page.locator(".alarm-banner")).toBeVisible();
  await expect(page.locator(".clock")).toHaveText(tick);
  await page.locator('input[type="file"]').setInputFiles({
    name: "exported-session.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(initial)),
  });
  await expect(page.getByRole("status")).toContainText("Imported session");
  await expect(page.locator(".alarm-banner")).toBeHidden();
  await expect(page.locator(".clock")).toHaveText("Tick 0 | PAUSED");
});

test("a pointer click held across running ticks is not swallowed by rendering", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Inspect / more orders", exact: true })
    .click();
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:alex");
  await page.getByLabel("Inspect", { exact: true }).selectOption("site-1:kit");
  const action = page.getByRole("button", {
    name: "Take / recover",
    exact: true,
  });
  const rect = await action.boundingBox();
  await page.getByLabel("Speed", { exact: true }).selectOption("16");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.mouse.move(rect!.x + rect!.width / 2, rect!.y + rect!.height / 2);
  await page.mouse.down();
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector(".clock")!.textContent!.match(/Tick (\d+)/)![1],
      ) >= 8,
  );
  await page.mouse.up();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Queued: Take / recover",
  );
});

test("compact inspector tabs and map destinations are keyboard accessible without advancing time", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Inspect / more orders", exact: true })
    .click();
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:alex");
  const record = page.getByRole("tab", { name: "Record", exact: true });
  await record.focus();
  await record.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Orders", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.locator(".map-viewport").focus();
  await page.locator(".map-viewport").press("ArrowRight");
  await page.locator(".map-viewport").press("Enter");
  await expect(page.locator(".destination-notice")).toContainText("(2, 1)");
  await expect(page.locator(".clock")).toHaveText("Tick 0 | PAUSED");
  await expect(page.locator(".queue-dock")).toContainText("No queued work");
  await page.screenshot({
    path: "test-results/compact-desktop.png",
    fullPage: true,
  });
});

test("desktop remains usable at its minimum workspace and catalogs actual sites", async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto("./");
  const window = page.getByRole("region", {
    name: "Site map & orders",
    exact: true,
  });
  const bounds = await window.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(550);
  await page.getByRole("button", { name: "SCP menu" }).click();
  await page
    .locator(".scp-menu")
    .getByText("Facilities", { exact: true })
    .click();
  await page
    .locator(".facility-menu")
    .getByRole("menuitem", {
      name: "SCP-914 bounded nonliving trial cell",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Site", { exact: true })).toHaveValue("site-17");
  await expect(page.locator(".clock")).toHaveText("Tick 0 | PAUSED");
  await page.screenshot({
    path: "test-results/minimum-workspace.png",
    fullPage: true,
  });
});

test("accelerated desktop publishes a complete alarm tick with measured browser responsiveness", async ({
  page,
}, info) => {
  await page.goto("./");
  await page.getByLabel("Speed", { exact: true }).selectOption("16");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  const metrics = await page.evaluate(
    () =>
      new Promise<{
        elapsedMs: number;
        tick: number;
        longTasks: number;
        maximumLongTaskMs: number;
        nodes: number;
      }>((resolve) => {
        const started = performance.now();
        const tasks: number[] = [];
        const observer = new PerformanceObserver((entries) => {
          tasks.push(...entries.getEntries().map((entry) => entry.duration));
        });
        observer.observe({ entryTypes: ["longtask"] });
        const timer = setInterval(() => {
          const tick = Number(
            document
              .querySelector(".clock")!
              .textContent!.match(/Tick (\d+)/)![1],
          );
          if (tick < 60) return;
          clearInterval(timer);
          observer.disconnect();
          resolve({
            elapsedMs: performance.now() - started,
            tick,
            longTasks: tasks.length,
            maximumLongTaskMs: Math.max(0, ...tasks),
            nodes: document.querySelectorAll("*").length,
          });
        }, 16);
      }),
  );
  expect(metrics.tick).toBe(60);
  await expect(page.locator(".clock")).toHaveText("Tick 60 | PAUSED");
  await expect(page.locator(".alarm-banner")).toContainText("Rowan");
  await info.attach("desktop-runtime-metrics", {
    body: JSON.stringify(metrics),
    contentType: "application/json",
  });
  console.log("Desktop 16x runtime:", JSON.stringify(metrics));
});
