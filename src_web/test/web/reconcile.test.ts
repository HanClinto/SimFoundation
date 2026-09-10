// @vitest-environment jsdom
import { expect, it } from "vitest";
import {
  button,
  element,
  replaceContents,
  select,
} from "../../src/adapters/browser/desktop/dom";

it("retains a live button but updates its callback with the latest view", () => {
  const parent = element("div");
  document.body.append(parent);
  let invoked = 0;
  replaceContents(
    parent,
    button("Order", () => {
      invoked = 1;
    }),
  );
  const original = parent.querySelector("button")!;
  original.focus();
  replaceContents(
    parent,
    button("Order", () => {
      invoked = 2;
    }),
  );
  expect(parent.querySelector("button")).toBe(original);
  expect(document.activeElement).toBe(original);
  original.click();
  expect(invoked).toBe(2);
  parent.remove();
});

it("retains select controls while updating options and dispatches their real current value", () => {
  const parent = element("div");
  document.body.append(parent);
  let value = "";
  replaceContents(
    parent,
    select("Target", [{ value: "a", label: "A" }], "a", () => {}),
  );
  const original = parent.querySelector("select")!;
  replaceContents(
    parent,
    select(
      "Target",
      [
        { value: "a", label: "A" },
        { value: "b", label: "B" },
      ],
      "b",
      (next) => {
        value = next;
      },
    ),
  );
  expect(parent.querySelector("select")).toBe(original);
  expect(original.value).toBe("b");
  original.value = "a";
  original.dispatchEvent(new Event("change"));
  expect(value).toBe("a");
  parent.remove();
});
