import { expect, test } from "@playwright/test";
import {
  admit,
  deliver,
  deliverObject,
  escort,
  finish,
  inspectNamed,
  move,
  order,
  save,
  travel,
  openGame,
} from "./play";

test("SCP-1370 is recovered intact, observed in the glass bay and left behind a closed door", async ({
  page,
}) => {
  await openGame(page);
  await travel(page, "gallery", ["alex"]);
  await page
    .getByLabel("Worker", { exact: true })
    .selectOption({ label: "alex" });
  const exhibit = await inspectNamed(page, "SCP-1370");
  await order(page, "alex", exhibit, "Take / recover");
  await travel(page, "home", ["alex"]);
  await deliver(page, "alex", 13, 3);
  await order(
    page,
    "alex",
    "site-1:display",
    "Study SCP-1370: intact recovered exhibit",
  );
  await move(page, "alex", 9, 3);
  await page.getByRole("button", { name: "Step", exact: true }).click();
  const session = await save(page);
  const home = session.state.sites["site-1"]!;
  expect(home.entities[exhibit]!.location).toEqual({
    kind: "ground",
    position: { x: 13, y: 3 },
  });
  expect(home.entities[exhibit]!.integrity).toBe(100);
  const door = Object.values(home.entities).find(
    (entity) => entity.kind === "door",
  );
  expect(door?.kind === "door" && !door.open).toBe(true);
});

test("SCP-507 returns with the separately protected log, earns review and enters ordinary care", async ({
  page,
}) => {
  await openGame(page);
  await order(page, "alex", "site-1:case", "Take / recover");
  await travel(page, "returnee", ["alex"]);
  await page
    .getByLabel("Worker", { exact: true })
    .selectOption({ label: "alex" });
  const site = await page.getByLabel("Site", { exact: true }).inputValue();
  await page.getByLabel("Inspect", { exact: true }).selectOption(`${site}:log`);
  await page
    .getByRole("button", { name: "Pack in selected case", exact: true })
    .click();
  await finish(page);
  await escort(page, "alex", `${site}:tommy`, 2, 3);
  await travel(page, "home", ["alex"], ["Tommy"]);
  await move(page, "alex", 10, 4);
  await order(page, "alex", "site-1:case", "Unpack case");
  await escort(page, "alex", `${site}:tommy`, 10, 6);
  await order(
    page,
    "alex",
    "site-1:review",
    "Study SCP-507: ordinary-world return reviewed",
  );
  await escort(page, "alex", `${site}:tommy`, 10, 3);
  await admit(page, "site-1:guest-bed");
  const session = await save(page);
  const station = session.state.sites["site-1"]!.entities["site-1:review"];
  if (station?.kind !== "facility") throw new Error("Review station missing.");
  expect(station.study!.findings[0]!.sourceIds).toContain(`${site}:log`);
  expect(session.campaign!.admissions[`${site}:tommy`]).toBeTruthy();
  await page.screenshot({
    path: "test-results/returnee-review.png",
    fullPage: true,
  });
});

test("SCP-2295 independently treats two returned patients, leaving real postoperative care", async ({
  page,
}) => {
  await openGame(page);
  await travel(page, "triage", ["alex", "casey"]);
  const site = await page.getByLabel("Site", { exact: true }).inputValue();
  await order(page, "alex", `${site}:iris`, "Take / recover");
  await order(page, "casey", `${site}:owen`, "Take / recover");
  await travel(page, "home", ["alex", "casey"]);
  await deliverObject(page, "alex", `${site}:iris`, 6, 6);
  await deliverObject(page, "casey", `${site}:owen`, 5, 7);
  await page
    .getByLabel("Inspect", { exact: true })
    .selectOption(`${site}:owen`);
  for (
    let ticks = 0;
    ticks < 20 &&
    !(await page
      .locator(".inspection-pane")
      .getByText(/replacement at tick/)
      .count());
    ticks++
  )
    await page.getByRole("button", { name: "Step", exact: true }).click();
  await expect(page.locator(".inspection-pane")).toContainText(
    "Postoperative care required",
  );
  await deliverObject(page, "alex", `${site}:iris`, 4, 2);
  await order(
    page,
    "casey",
    `${site}:iris`,
    "Nurse blood / postoperative care",
  );
  await escort(page, "casey", `${site}:iris`, 6, 2);
  await admit(page, "site-1:bed");
  await deliverObject(page, "alex", `${site}:owen`, 4, 2);
  await order(
    page,
    "casey",
    `${site}:owen`,
    "Nurse blood / postoperative care",
  );
  await escort(page, "casey", `${site}:owen`, 10, 3);
  await admit(page, "site-1:guest-bed");
  const session = await save(page);
  const home = session.state.sites["site-1"]!;
  const iris = home.entities[`${site}:iris`];
  const owen = home.entities[`${site}:owen`];
  if (iris?.kind !== "pawn" || owen?.kind !== "pawn")
    throw new Error("Actual patients missing.");
  expect(iris.health!.organs!.lung!.replacement!.actorId).toBe("site-1:bear");
  expect(owen.health!.organs!.lung!.replacement!.tick).toBeGreaterThan(
    iris.health!.organs!.lung!.replacement!.tick,
  );
  expect(iris.health!.postoperative).toBeUndefined();
  expect(owen.health!.postoperative).toBeUndefined();
  expect(home.entities["site-1:clinical-packs"]!.amount).toBe(2);
  await page.screenshot({
    path: "test-results/bear-postoperative-care.png",
    fullPage: true,
  });
});

test("SCP-3008 evacuation carries the casualty and escorts the walking survivor into home care", async ({
  page,
}) => {
  await openGame(page);
  await page
    .getByLabel("Site", { exact: true })
    .selectOption({ label: "SCP-3008: bounded evacuation sector" });
  await expect(page.locator(".site-cycle")).toContainText("UNSTARTED");
  await page.getByLabel("Site", { exact: true }).selectOption("site-1");
  await travel(page, "store", ["alex", "casey"]);
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await expect(page.locator(".site-cycle")).toContainText("DAY");
  const site = await page.getByLabel("Site", { exact: true }).inputValue();
  await order(page, "casey", `${site}:eli`, "Take / recover");
  await escort(page, "alex", `${site}:nora`, 2, 4);
  await move(page, "casey", 2, 5);
  await travel(page, "home", ["alex", "casey"], ["Nora"]);
  await escort(page, "alex", `${site}:nora`, 6, 2);
  await admit(page, "site-1:bed");
  await deliverObject(page, "casey", `${site}:eli`, 4, 2);
  await order(page, "casey", `${site}:eli`, "Nurse blood / postoperative care");
  await escort(page, "casey", `${site}:eli`, 10, 3);
  await admit(page, "site-1:guest-bed");
  const session = await save(page);
  expect(session.campaign!.admissions[`${site}:nora`]).toBeTruthy();
  expect(session.campaign!.admissions[`${site}:eli`]).toBeTruthy();
  expect(session.state.sites[site]!.cycle!.startedTick).not.toBeNull();
  await page.screenshot({
    path: "test-results/store-evacuation.png",
    fullPage: true,
  });
});
