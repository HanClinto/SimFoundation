import { expect, test, type Page } from "@playwright/test";
import {
  containedSpecimen,
  deliver,
  finish,
  floor,
  inspectNamed,
  move,
  order,
  save,
  travel,
  openGame,
} from "./play";

async function watch(page: Page, worker: string, subject: string) {
  await page
    .getByLabel("Worker", { exact: true })
    .selectOption({ label: worker });
  await page.getByLabel("Inspect", { exact: true }).selectOption(subject);
  await page
    .getByRole("button", { name: "Watch subject", exact: true })
    .click();
  await page.getByRole("button", { name: "Step", exact: true }).click();
}

async function relieve(page: Page, outgoing: string, replacement: string) {
  await page
    .getByLabel("Worker", { exact: true })
    .selectOption({ label: outgoing });
  const observer = await page
    .getByLabel("Replacement observer", { exact: true })
    .locator("option")
    .filter({ hasText: replacement })
    .getAttribute("value");
  await page
    .getByLabel("Replacement observer", { exact: true })
    .selectOption(observer!);
  await page
    .getByRole("button", { name: "Relieve selected worker", exact: true })
    .click();
}

test("three real staff maintain direct watch through guarded relief, study and safe withdrawal", async ({
  page,
}) => {
  await openGame(page);
  await containedSpecimen(page);
  await order(
    page,
    "alex",
    "site-1:holding",
    "Study Living kinetic subject: controlled intake",
  );
  await travel(page, "statue", ["alex", "casey"]);
  const statueSite = await page
    .getByLabel("Site", { exact: true })
    .inputValue();
  await move(page, "alex", 4, 1);
  await move(page, "casey", 4, 5);
  const subject = await inspectNamed(page, "SCP-173 (pawn)");
  await watch(page, "alex", subject);
  await expect(
    page.getByRole("button", { name: "Relieve selected worker", exact: true }),
  ).toBeDisabled();
  await watch(page, "casey", subject);
  await page.getByRole("button", { name: "Operations", exact: true }).click();
  await page
    .getByRole("button", { name: "Response desk", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Dispatch riley to inspected site" })
    .click();
  await page
    .getByRole("button", { name: "Travel / preparation", exact: true })
    .click();
  await finish(page, "Wait for arrival");
  await page
    .getByRole("button", { name: "Site map & orders", exact: true })
    .click();
  const gate = await inspectNamed(page, "Annex locked entry");
  await order(page, "riley", gate, "Door: held-open");
  await move(page, "riley", 3, 3);
  await relieve(page, "alex", "casey");
  await move(page, "alex", 10, 3);
  await watch(page, "alex", subject);
  await relieve(page, "casey", "alex");
  await move(page, "casey", 9, 4);
  await watch(page, "casey", subject);
  await move(page, "riley", 6, 3);
  await order(page, "riley", gate, "Door: held-closed");
  const station = await inspectNamed(
    page,
    "Annex cleaning and protocol station",
  );
  await order(page, "riley", station, "Repair / service");
  await order(
    page,
    "riley",
    station,
    "Study Direct-watch maintenance protocol",
  );
  await page
    .getByLabel("Worker", { exact: true })
    .selectOption({ label: "alex" });
  await page.getByLabel("Inspect", { exact: true }).selectOption(subject);
  await floor(page, 10, 3);
  await page
    .getByRole("button", {
      name: "Assign recurring watch at floor post",
      exact: true,
    })
    .click();
  await relieve(page, "alex", "casey");
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await expect(page.locator(".action-tray")).toContainText("autonomy");
  await page
    .getByRole("button", {
      name: "Clear selected watch assignment",
      exact: true,
    })
    .click();
  await page.screenshot({
    path: "test-results/direct-watch.png",
    fullPage: true,
  });
  await order(page, "riley", gate, "Door: held-open");
  await move(page, "riley", 7, 1);
  await watch(page, "riley", subject);
  await relieve(page, "alex", "riley");
  await move(page, "alex", 4, 1);
  await watch(page, "alex", subject);
  await relieve(page, "casey", "alex");
  await move(page, "casey", 4, 5);
  await watch(page, "casey", subject);
  await relieve(page, "riley", "alex");
  await move(page, "riley", 3, 3);
  await order(page, "riley", gate, "Door: held-closed");
  for (const worker of ["alex", "casey"]) {
    await page
      .getByLabel("Worker", { exact: true })
      .selectOption({ label: worker });
    await page
      .locator(".action-tray")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
  }
  await travel(page, "home", ["alex", "casey"]);
  await move(page, "alex", 1, 7);
  await page.getByLabel("Site", { exact: true }).selectOption(statueSite);
  await travel(page, "home", ["riley"]);
  const session = await save(page);
  const annex = session.state.sites[statueSite]!;
  const apparatus = annex.entities[station];
  if (apparatus?.kind !== "facility") throw new Error("Annex station missing.");
  expect(apparatus.study?.findings[0]?.planId).toBe("direct-watch-protocol");
  expect(
    apparatus.service?.history.some((entry) => entry.kind === "service"),
  ).toBe(true);
  expect(
    session.events.some(
      (event) =>
        event.kind === "died" &&
        ["site-1:alex", "site-1:casey"].includes(event.entityId),
    ),
  ).toBe(false);

  await move(page, "riley", 1, 8);
  await order(page, "riley", "site-1:guest-bed", "sleep");
  await order(page, "casey", "site-1:clinic", "sleep");
  await travel(page, "support", ["riley"]);
  await page
    .getByLabel("Worker", { exact: true })
    .selectOption({ label: "riley" });
  const power = await inspectNamed(page, "Sealed containment power units");
  await order(page, "riley", power, "Take / recover");
  await travel(page, "home", ["riley"]);
  await deliver(page, "riley", 14, 8);
  await travel(page, "companions", ["casey"]);
  await page
    .getByLabel("Worker", { exact: true })
    .selectOption({ label: "casey" });
  const podA = await inspectNamed(page, "SCP-131-A");
  const podB = await inspectNamed(page, "SCP-131-B");
  for (const [id, x, y] of [
    [podA, 2, 2],
    [podB, 2, 4],
  ] as const) {
    await page.getByLabel("Inspect", { exact: true }).selectOption(id);
    await floor(page, x, y);
    await page
      .getByRole("button", { name: "Escort to floor destination", exact: true })
      .click();
    await finish(page);
  }
  await move(page, "casey", 2, 3);
  await travel(page, "home", ["casey"], ["SCP-131-A", "SCP-131-B"]);
  await travel(page, "statue", ["casey"], ["SCP-131-A", "SCP-131-B"]);
  for (const [id, x, y] of [
    [podA, 4, 1],
    [podB, 4, 5],
  ] as const) {
    await page
      .getByLabel("Worker", { exact: true })
      .selectOption({ label: "casey" });
    await page.getByLabel("Inspect", { exact: true }).selectOption(id);
    await floor(page, x, y);
    await page
      .getByRole("button", { name: "Escort to floor destination", exact: true })
      .click();
    await finish(page);
  }
  await page.getByLabel("Inspect", { exact: true }).selectOption(subject);
  await expect(page.locator(".inspection-pane")).toContainText(
    "Currently watching: SCP-131",
  );
  const accompanied = await save(page);
  expect(accompanied.state.sites[statueSite]!.entities[podA]).toBeTruthy();
  expect(accompanied.campaign!.staffIds).not.toContain(podA);
  await page.screenshot({
    path: "test-results/eye-pod-support.png",
    fullPage: true,
  });
  for (const [id, x, y] of [
    [podA, 2, 2],
    [podB, 2, 4],
  ] as const) {
    await page.getByLabel("Inspect", { exact: true }).selectOption(id);
    await floor(page, x, y);
    await page
      .getByRole("button", { name: "Escort to floor destination", exact: true })
      .click();
    await finish(page);
  }
  await move(page, "casey", 2, 3);
  await travel(page, "home", ["casey"], ["SCP-131-A", "SCP-131-B"]);
  const returned = await save(page);
  expect(returned.state.sites["site-1"]!.entities[podA]).toBeTruthy();
  expect(returned.state.sites["site-1"]!.entities[podB]).toBeTruthy();
});
