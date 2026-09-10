// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { createMenu } from "../../src/adapters/browser/desktop/menu";

const menus: ReturnType<typeof createMenu>[] = [];
afterEach(() => {
  for (const menu of menus.splice(0)) menu.dispose();
  document.body.replaceChildren();
});

it("opens an icon-labelled submenu with the keyboard and restores its trigger on Escape", () => {
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  const menu = createMenu(document.body);
  menus.push(menu);
  menu.show(
    [{ label: "Facilities", children: [{ label: "Home", action: () => {} }] }],
    { x: 10, y: 20 },
    "SCP",
    trigger,
  );
  const facilities =
    document.querySelector<HTMLButtonElement>('[role="menuitem"]')!;
  expect(facilities.querySelector("img")).not.toBeNull();
  expect(document.activeElement).toBe(facilities);
  facilities.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
  );
  expect(document.querySelectorAll('[role="menu"]')).toHaveLength(2);
  expect(facilities.getAttribute("aria-expanded")).toBe("true");
  const home = document.activeElement!;
  expect(home.textContent).toContain("Home");
  home.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1);
  expect(document.activeElement).toBe(facilities);
  facilities.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  expect(menu.open).toBe(false);
  expect(document.activeElement).toBe(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
});

it("keeps disabled reasons inspectable without executing and closes after an enabled choice", () => {
  let executed = 0;
  const menu = createMenu(document.body);
  menus.push(menu);
  menu.show(
    [
      {
        label: "Blocked",
        disabledReason: "Carry a real case.",
        action: () => executed++,
      },
      { label: "Ready", action: () => executed++ },
    ],
    { x: 10, y: 20 },
    "Orders",
  );
  const [blocked, ready] =
    document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
  expect(blocked!.title).toBe("Carry a real case.");
  blocked!.click();
  expect(executed).toBe(0);
  expect(menu.open).toBe(true);
  ready!.click();
  expect(executed).toBe(1);
  expect(menu.open).toBe(false);
});
