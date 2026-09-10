import { expect, test } from "@playwright/test";
import { finish, inspectNamed, save, travel, openGame } from "./play";

test("the response desk distinguishes incapacitated original staff from terminal personnel loss", async ({
  page,
}) => {
  await openGame(page);
  const session = await save(page);
  for (const id of session.campaign!.staffIds) {
    const pawn = session.state.sites["site-1"]!.entities[id];
    if (pawn?.kind !== "pawn") throw new Error("Missing original staff.");
    pawn.canAct = false;
    pawn.health = {
      wounds: [{ id: "incapacitating", severity: 100, bleeding: 0 }],
      bloodLoss: 0,
      incapacity: "wounds",
      mortality: { criticalTicks: 0, fatalAfterTicks: 1 },
    };
  }
  await page.locator('input[type="file"]').setInputFiles({
    name: "incapacitated-original-roster.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(session)),
  });
  await page.getByRole("button", { name: "Operations", exact: true }).click();
  await page
    .getByRole("button", { name: "Response desk", exact: true })
    .click();
  const response = page.getByRole("region", {
    name: "Operations & history",
    exact: true,
  });
  await expect(response).toContainText(
    "Recovery uses surviving members of the starting roster",
  );
  await expect(response).not.toContainText("No surviving campaign staff");
  await expect(response.getByRole("button", { name: /Dispatch/ })).toHaveCount(
    0,
  );

  for (const id of session.campaign!.staffIds) {
    const pawn = session.state.sites["site-1"]!.entities[id];
    if (pawn?.kind !== "pawn") throw new Error("Missing original staff.");
    pawn.health!.wounds[0]!.severity = 150;
  }
  await page.locator('input[type="file"]').setInputFiles({
    name: "fatal-original-roster.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(session)),
  });
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await page
    .getByRole("button", { name: "Response desk", exact: true })
    .click();
  await expect(response).toContainText(
    "No surviving campaign staff. You can inspect the remaining world or start a new campaign.",
  );
  const lost = await save(page);
  expect(lost.campaign!.staffIds).toEqual(session.campaign!.staffIds);
  for (const id of lost.campaign!.staffIds) {
    const body = lost.state.sites["site-1"]!.entities[id];
    if (body?.kind !== "pawn") throw new Error("Missing original body.");
    expect(body.health!.death).toBeDefined();
  }
  await page.getByRole("button", { name: "SCP menu" }).click();
  await page
    .getByRole("menuitem", { name: "Load saved session", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Response desk", exact: true })
    .click();
  await expect(response).toContainText("No surviving campaign staff");
  await expect(response.getByRole("button", { name: /Dispatch/ })).toHaveCount(
    0,
  );
});

test("a critical alarm locates a death and an original colleague recovers the original body", async ({
  page,
}) => {
  await openGame(page);
  const initial = await save(page);
  expect(initial.campaign!.staffIds).toEqual([
    "site-1:alex",
    "site-1:ben",
    "site-1:casey",
  ]);
  expect(initial.campaign!.siteIds).not.toHaveProperty("reserve");
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
  await expect(page.getByRole("button", { name: /Dispatch/ })).toHaveCount(0);
  await expect(
    page.getByText("There are no replacement personnel.", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Site map & orders", exact: true })
    .click();
  await page.getByLabel("Site", { exact: true }).selectOption("site-1");
  await travel(page, "accident", ["casey"]);
  await page
    .getByLabel("Worker", { exact: true })
    .selectOption({ label: "casey" });
  await page.getByLabel("Inspect", { exact: true }).selectOption(rowan);
  await page
    .getByRole("button", { name: "Take / recover", exact: true })
    .click();
  await finish(page);
  await travel(page, "home", ["casey"]);
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
  expect(session.campaign!.staffIds).toEqual([
    "site-1:alex",
    "site-1:ben",
    "site-1:casey",
  ]);
  expect(session.campaign!.siteIds).not.toHaveProperty("reserve");
  await page.screenshot({
    path: "test-results/colleague-recovery.png",
    fullPage: true,
  });
});
