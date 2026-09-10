import { createServer } from "vite";
import { createInterface } from "node:readline";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const server = await createServer({
  root: fileURLToPath(new URL("..", import.meta.url)),
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { openConsole, executeLine, renderMap, questStatus } =
    await server.ssrLoadModule("/src/adapters/cli/Console.ts");
  const { restoreSession } = await server.ssrLoadModule(
    "/src/application/ScenarioSession.ts",
  );
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const index = args.indexOf(name);
    return index < 0 ? fallback : args[index + 1];
  };
  let consoleState = openConsole(option("--scenario", "campaign"));
  if (args.includes("--restore")) {
    const restored = restoreSession(
      await readFile(option("--restore"), "utf8"),
    );
    if (!restored) throw new Error("Invalid or incompatible session.");
    consoleState = {
      session: restored,
      siteId: Object.keys(restored.state.sites)[0],
    };
  }
  if (args.includes("--batch")) {
    const result = executeLine(
      consoleState,
      consoleState.session.phase === "setup"
        ? "status"
        : `run ${option("--ticks", "400")}`,
    );
    console.log(result.output);
    process.exitCode =
      result.console.session.phase === "setup" || result.alarm
        ? 2
        : result.console.session.quest?.status === "failed"
          ? 1
          : result.console.session.quest?.status === "active"
            ? 2
            : 0;
  } else {
    console.log(
      renderMap(consoleState) +
        "\n" +
        questStatus(consoleState) +
        "\nType brief for mission context or help for commands.",
    );
    const terminal = !!process.stdin.isTTY;
    const input = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal,
    });
    if (terminal) {
      input.setPrompt("sim> ");
      input.prompt();
    }
    for await (const line of input) {
      try {
        const [command] = line.trim().split(/\s+/);
        if (command === "save" || command === "restore") {
          const filename = line.trim().slice(command.length).trim();
          if (!filename) throw new Error("Specify a path.");
          if (command === "save") {
            await writeFile(
              filename,
              JSON.stringify(consoleState.session, null, 2),
              { flag: "wx" },
            );
            console.log(
              `Saved ${filename} (existing files are never overwritten).`,
            );
          } else {
            const restored = restoreSession(await readFile(filename, "utf8"));
            if (!restored) throw new Error("Invalid or incompatible session.");
            consoleState = {
              session: restored,
              siteId: Object.keys(restored.state.sites)[0],
            };
            console.log(questStatus(consoleState));
          }
        } else {
          const result = executeLine(consoleState, line);
          consoleState = result.console;
          console.log(result.output);
          if (result.quit) {
            input.close();
            break;
          }
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
      }
      if (terminal) input.prompt();
    }
  }
} finally {
  await server.close();
}
