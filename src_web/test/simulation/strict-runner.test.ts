import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";

const root = fileURLToPath(new URL("../../", import.meta.url));
function run(input: string, strict: boolean) {
  return spawnSync(
    process.execPath,
    ["scripts/simulation-cli.mjs", ...(strict ? ["--strict"] : [])],
    {
      cwd: root,
      input,
      encoding: "utf8",
      timeout: 10000,
    },
  );
}
it("strict normal-command input succeeds without sockets or a separate parser", () => {
  const result = run("order alex wait 2\nfinish alex\nquit\n", true);
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Advanced 2 ticks.");
  expect(result.stderr).not.toContain("WebSocket");
});
it("a strict rejected command returns failure and does not execute later lines", () => {
  const result = run(
    "order alex take ben\norder alex wait 9\nfinish alex\nquit\n",
    true,
  );
  expect(result.status).toBe(1);
  expect(result.stdout).toContain("rejected:");
  expect(result.stderr).toContain("line 1");
  expect(result.stdout).not.toContain("Advanced 9 ticks.");
  expect(executeLine(openConsole(), "order alex take ben").rejected).toBe(true);
});
it("strict exceptions stop with line context while default interactive-style input can continue", () => {
  const input = "not-a-command\norder alex wait 2\nfinish alex\nquit\n";
  const strict = run(input, true);
  expect(strict.status).toBe(1);
  expect(strict.stderr).toContain("Line 1: Unknown command");
  expect(strict.stdout).not.toContain("Advanced 2 ticks.");
  const ordinary = run(input, false);
  expect(ordinary.status).toBe(0);
  expect(ordinary.stdout).toContain("Advanced 2 ticks.");
});
