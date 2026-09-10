import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import {
  restoreSession,
  stepSession,
} from "../../src/application/ScenarioSession";
import { positionOf } from "../../src/simulation/core/site/TileMap";
import type { Facility } from "../../src/simulation/core/entity/Facility";

it("keeps a depleted unattended campaign deterministic without spawning resources, repeating deaths or losing ownership", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/connected-danger.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let console = openConsole();
  for (const line of lines) console = executeLine(console, line).console;
  const initial = console.session;
  const owners = [
    ...Object.values(initial.state.sites),
    ...Object.values(initial.state.transfers),
  ];
  const originalIds = new Set(
    owners.flatMap((owner) => Object.keys(owner.entities)),
  );
  const originalAmounts = new Map(
    owners.flatMap((owner) =>
      Object.values(owner.entities)
        .filter((entity) => entity.kind === "item")
        .map((entity) => [entity.id, entity.amount] as const),
    ),
  );
  const dead = new Set(
    owners.flatMap((owner) =>
      Object.values(owner.entities)
        .filter((entity) => entity.kind === "pawn" && entity.health?.death)
        .map((entity) => entity.id),
    ),
  );
  const startedDead = new Set(dead);
  const restored = restoreSession(JSON.stringify(initial))!;
  let breaches = 0;
  const result = stepSession(initial, 5000, (events) => {
    for (const event of events) {
      if (event.kind === "died") {
        expect(dead.has(event.entityId)).toBe(false);
        dead.add(event.entityId);
      }
      if (event.kind === "breached") breaches++;
    }
  });
  expect(stepSession(restored, 5000)).toEqual(result);
  expect(breaches).toBeGreaterThan(0);
  expect(result.events.length).toBeLessThanOrEqual(100);
  const seen = new Set<string>();
  for (const owner of [
    ...Object.values(result.state.sites),
    ...Object.values(result.state.transfers),
  ]) {
    for (const entity of Object.values(owner.entities)) {
      expect(originalIds.has(entity.id)).toBe(true);
      expect(seen.has(entity.id)).toBe(false);
      seen.add(entity.id);
      expect(positionOf(owner, entity.id)).not.toBeNull();
      if (entity.kind === "item") {
        expect(entity.amount).toBeGreaterThanOrEqual(0);
        expect(entity.amount).toBeLessThanOrEqual(
          originalAmounts.get(entity.id)!,
        );
      }
      if (entity.kind === "pawn") {
        expect(entity.queue.length).toBeLessThanOrEqual(8);
        if (startedDead.has(entity.id))
          expect(entity.health?.death).toBeDefined();
        if (entity.health?.death) {
          expect(entity.canAct).toBe(false);
          expect(entity.queue).toEqual([]);
        }
      }
    }
  }
  for (const id of dead) expect(seen.has(id)).toBe(true);
  expect(
    result.state.sites["site-1"]!.entities["site-1:power-units"]!.amount,
  ).toBe(0);
  const cell = result.state.sites["site-1"]!.entities[
    "site-1:holding"
  ] as Facility;
  expect(
    cell.service!.history.filter((entry) => entry.kind === "service"),
  ).toHaveLength(3);
}, 30000);
