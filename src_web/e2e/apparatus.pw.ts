import { expect, test } from "@playwright/test";
import {
  deliver,
  finish,
  floor,
  inspectNamed,
  order,
  save,
  travel,
  openGame,
} from "./play";

test("SCP-294 spends coins and actual source liquid on distinct samples and a refusal", async ({
  page,
}) => {
  await openGame(page);
  for (const [index, destination] of [
    [1, [8, 3]],
    [2, [9, 4]],
  ] as const) {
    await order(page, "ben", "site-1:machine", "Dispense Harmless tracer");
    if (index === 1) {
      await page
        .getByRole("button", { name: "Dispense Harmless tracer", exact: true })
        .click();
      await page.getByRole("button", { name: "Step", exact: true }).click();
      await expect(page.locator(".action-tray")).toContainText(
        "Clear the previous sample",
      );
      await page
        .locator(".action-tray")
        .getByRole("button", { name: "Cancel", exact: true })
        .click();
    }
    await page
      .getByLabel("Inspect", { exact: true })
      .selectOption(`site-1:machine:sample-${index}`);
    await floor(page, destination[0], destination[1]);
    await page
      .getByRole("button", {
        name: "Deliver target to floor destination",
        exact: true,
      })
      .click();
    await finish(page);
  }
  await order(
    page,
    "ben",
    "site-1:sample-bench",
    "Study SCP-294: repeated identified tracer retrieval",
  );
  await order(page, "ben", "site-1:machine", "Dispense Diamond");
  const session = await save(page);
  const home = session.state.sites["site-1"]!;
  expect(home.entities["site-1:coins"]!.amount).toBe(5);
  expect(home.entities["site-1:tracer"]!.amount).toBe(0);
  const machine = home.entities["site-1:machine"];
  const bench = home.entities["site-1:sample-bench"];
  if (machine?.kind !== "facility" || bench?.kind !== "facility")
    throw new Error("Apparatus missing.");
  expect(machine.dispenser!.records).toHaveLength(3);
  expect(machine.dispenser!.records[2]!.sampleId).toBeUndefined();
  expect(bench.study!.findings[0]!.sourceIds).toHaveLength(2);
  await page.screenshot({
    path: "test-results/dispensing.png",
    fullPage: true,
  });
});

test("SCP-914 owns its irreversible cycle while the operator travels home for care", async ({
  page,
}) => {
  await openGame(page);
  await order(page, "alex", "site-1:suppressor", "Fit equipment");
  await order(page, "alex", "site-1:vest", "Fit equipment");
  await order(page, "alex", "site-1:kit", "Take / recover");
  await travel(page, "intervention", ["alex"]);
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:alex");
  await floor(page, 4, 3);
  await page.getByRole("button", { name: "Move here", exact: true }).click();
  await finish(page);
  const specimen = await inspectNamed(page, "Kinetic specimen");
  await page
    .getByRole("button", { name: "Observe actual impacts", exact: true })
    .click();
  await finish(page);
  await order(page, "alex", specimen, "Subdue with equipped tool");
  await travel(page, "home", ["alex"]);
  await order(page, "casey", "site-1:alex", "Stabilize bleeding");
  await deliver(page, "alex", 8, 1);
  await order(
    page,
    "ben",
    "site-1:workshop",
    "Study Kinetic impact recording analysis",
  );
  await order(page, "alex", "site-1:vest", "Remove equipment");
  await order(page, "alex", "site-1:vest", "Take / recover");
  await travel(page, "clockwork", ["alex"]);
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:alex");
  const machineId = await inspectNamed(
    page,
    "SCP-914 approved trial apparatus",
  );
  await page
    .getByLabel("Processing input", { exact: true })
    .selectOption("site-1:vest");
  await page
    .getByRole("button", {
      name: "Process Very Fine: lattice shell",
      exact: true,
    })
    .click();
  await finish(page);
  await expect(page.locator(".inspection-pane")).toContainText(
    "Operator may leave",
  );
  await travel(page, "home", ["alex"]);
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:alex");
  await floor(page, 4, 2);
  await page.getByRole("button", { name: "Move here", exact: true }).click();
  await finish(page);
  await order(page, "casey", "site-1:alex", "Treat wounds at clinical bed");
  await order(page, "casey", "site-1:alex", "Nurse blood / postoperative care");
  await order(page, "alex", "site-1:bed", "sleep");
  await travel(page, "clockwork", ["alex"]);
  await page.getByLabel("Worker", { exact: true }).selectOption("site-1:alex");
  await page.getByLabel("Inspect", { exact: true }).selectOption(machineId);
  if (
    await page
      .getByRole("button", { name: "Wait for processing output", exact: true })
      .count()
  )
    await finish(page, "Wait for processing output");
  const output = await inspectNamed(page, "Clockwork lattice shell");
  await page
    .getByRole("button", { name: "Take / recover", exact: true })
    .click();
  await finish(page);
  await travel(page, "home", ["alex"]);
  await order(page, "alex", output, "Fit equipment");
  const session = await save(page);
  const shell = session.state.sites["site-1"]!.entities[output];
  if (shell?.kind !== "item")
    throw new Error("Physical machine output missing.");
  expect(shell.processed?.inputId).toBe("site-1:vest");
  expect(shell.equipment?.worn).toBe(true);
  expect(shell.equipment?.armor?.reduction).toBe(30);
  await page.screenshot({
    path: "test-results/independent-processing.png",
    fullPage: true,
  });
});
