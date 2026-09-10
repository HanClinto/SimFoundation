import { expect, test } from "@playwright/test";
import {
  deliver,
  finish,
  floor,
  move,
  order,
  save,
  travel,
  openGame,
} from "./play";

test("a supplied diner duty continues while the manager and relief worker are home", async ({
  page,
}) => {
  await openGame(page);
  for (const [worker, source, quantity] of [
    ["alex", "meals", "4"],
    ["casey", "parts", "1"],
  ]) {
    await page
      .getByLabel("Worker", { exact: true })
      .selectOption({ label: worker! });
    await page
      .getByLabel("Inspect", { exact: true })
      .selectOption(`site-1:${source}`);
    await page.getByLabel("Portions to collect").fill(quantity!);
    await page.getByLabel("Portions to collect").press("Tab");
    await page
      .getByRole("button", { name: "Collect selected portion", exact: true })
      .click();
    await finish(page);
  }
  await travel(page, "diner", ["alex", "casey"]);
  const siteId = await page.getByLabel("Site", { exact: true }).inputValue();
  await deliver(page, "alex", 7, 4);
  await deliver(page, "casey", 8, 3);
  await page
    .getByLabel("Worker", { exact: true })
    .selectOption({ label: "alex" });
  await page
    .getByLabel("Inspect", { exact: true })
    .selectOption(`${siteId}:counter`);
  await page
    .getByRole("button", {
      name: "Assign selected worker to recurring service",
      exact: true,
    })
    .click();
  await travel(page, "home", ["casey"]);
  await move(page, "casey", 4, 3);
  await page
    .getByLabel("Inspect", { exact: true })
    .selectOption("site-1:casey");
  await page.getByLabel("Wait ticks").fill("100");
  await page.getByLabel("Wait ticks").press("Tab");
  await page.getByRole("button", { name: "Wait in place" }).click();
  await finish(page);
  const session = await save(page);
  const counter = session.state.sites[siteId]!.entities[`${siteId}:counter`];
  const alex = session.state.sites[siteId]!.entities["site-1:alex"];
  if (counter?.kind !== "facility" || alex?.kind !== "pawn")
    throw new Error("Remote duty ownership missing.");
  expect(alex.serviceDuty).toBe(counter.id);
  expect(
    counter.service!.history.some((entry) => entry.kind === "repair"),
  ).toBe(true);
  expect(
    counter.service!.history.filter((entry) => entry.kind === "service").length,
  ).toBeGreaterThan(1);
  await page.getByLabel("Site", { exact: true }).selectOption(siteId);
  await page.getByLabel("Inspect", { exact: true }).selectOption(counter.id);
  await page.screenshot({
    path: "test-results/diner-duty.png",
    fullPage: true,
  });
});

test("SCP-2006 uses personally trained hosts and three distinct physical programmes", async ({
  page,
}) => {
  await openGame(page);
  await travel(page, "screening", ["ben", "alex"]);
  const siteId = await page.getByLabel("Site", { exact: true }).inputValue();
  for (const worker of ["ben", "alex"])
    await order(
      page,
      worker,
      `${siteId}:rehearsal`,
      "Study Practical surprise/fear rehearsal",
    );
  for (const [worker, programme, x, y] of [
    ["ben", "teapot", 7, 5],
    ["alex", "moon", 9, 5],
    ["alex", "fog", 8, 6],
  ] as const) {
    await page
      .getByLabel("Worker", { exact: true })
      .selectOption({ label: worker });
    await page
      .getByLabel("Inspect", { exact: true })
      .selectOption(`${siteId}:${programme}`);
    await floor(page, x, y);
    await page
      .getByRole("button", {
        name: "Deliver target to floor destination",
        exact: true,
      })
      .click();
    await finish(page);
    if (programme === "teapot")
      await order(page, "ben", `${siteId}:rig`, "Repair / service");
  }
  await page
    .getByLabel("Worker", { exact: true })
    .selectOption({ label: "ben" });
  await page
    .getByLabel("Inspect", { exact: true })
    .selectOption(`${siteId}:rig`);
  await page
    .getByRole("button", {
      name: "Assign selected worker to recurring service",
      exact: true,
    })
    .click();
  await travel(page, "home", ["alex"]);
  await page
    .getByLabel("Worker", { exact: true })
    .selectOption({ label: "alex" });
  await page.getByLabel("Wait ticks").fill("300");
  await page.getByLabel("Wait ticks").press("Tab");
  await page.getByRole("button", { name: "Wait in place" }).click();
  await finish(page);
  const session = await save(page);
  const screening = session.state.sites[siteId]!;
  const station = screening.entities[`${siteId}:rehearsal`];
  const rig = screening.entities[`${siteId}:rig`];
  if (station?.kind !== "facility" || rig?.kind !== "facility")
    throw new Error("Screening records missing.");
  expect(
    station.study!.findings.map((finding) => finding.actorId).sort(),
  ).toEqual(["site-1:alex", "site-1:ben"]);
  const programmes = rig.service!.history.filter(
    (entry) => entry.kind === "service",
  );
  expect(new Set(programmes.map((entry) => entry.supplyId)).size).toBe(3);
  expect(programmes.every((entry) => !entry.consumed)).toBe(true);
  await page.getByLabel("Site", { exact: true }).selectOption(siteId);
  await page.getByLabel("Inspect", { exact: true }).selectOption(rig.id);
  await page.screenshot({
    path: "test-results/screening-duty.png",
    fullPage: true,
  });
});
