import { expect, it } from "vitest";
import { executeLine, openConsole } from "../src/adapters/cli/Console";
import { parseOrder } from "../src/adapters/cli/Order";

it("deploys a named agent at entry and accepts plain orders with the same action semantics", () => {
  let console = openConsole("scp1370");
  expect(() => executeLine(console, "deploy field-agent alex entry")).toThrow(
    "automatic",
  );
  console = executeLine(console, "deploy field-agent alex").console;
  expect(console.session.bindings.handler).toBe("site-1:alex");
  expect(console.session.labels["site-1:alex"]).toBe("@2");
  console = executeLine(console, "start").console;
  const before = JSON.stringify(console);
  expect(() => executeLine(console, "order alex wait 0")).toThrow(
    "positive integer",
  );
  expect(() => executeLine(console, "order alex drop missing")).toThrow(
    "Unknown entity",
  );
  expect(() => executeLine(console, "order alex move 1.5 3")).toThrow(
    "integer",
  );
  expect(JSON.stringify(console)).toBe(before);
  console = executeLine(console, "order alex take exhibit").console;
  console = executeLine(console, "step 10").console;
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:exhibit"]!.location,
  ).toEqual({ kind: "carried", carrierId: "site-1:alex" });
  console = executeLine(console, "order @2 drop exhibit").console;
  console = executeLine(console, "step 1").console;
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:exhibit"]!.location
      .kind,
  ).toBe("ground");
});

it("parses readable actions and rejects ambiguous or incomplete arguments", () => {
  expect(parseOrder(["study", "bench", "marsh-lead"])).toEqual({
    kind: "study",
    targetId: "bench",
    planId: "marsh-lead",
    workTicks: 0,
  });
  expect(parseOrder(["move", "3", "5"])).toEqual({
    kind: "move",
    destination: { x: 3, y: 5 },
  });
  expect(parseOrder(["wait", "3"])).toEqual({ kind: "wait", ticks: 3 });
  expect(() => parseOrder(["drop"])).toThrow("drop <target>");
  expect(() => parseOrder(["eat", "meal", "extra"])).toThrow("eat <target>");
});
