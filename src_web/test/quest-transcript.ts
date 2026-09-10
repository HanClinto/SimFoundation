import fs from "node:fs";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../src/adapters/cli/Console";
import { restoreSession } from "../src/application/ScenarioSession";
import { isDeepStrictEqual } from "node:util";

export function replayTranscript(
  quest: string,
  filename: string,
): ConsoleState {
  const text = fs.readFileSync(
    new URL(
      `../src/simulation/catalog/quests/${quest}/tests/${filename}`,
      import.meta.url,
    ),
    "utf8",
  );
  let console = openConsole();
  let restored = openConsole();
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    try {
      const before = JSON.stringify(console);
      const result = executeLine(console, line);
      if (/^rejected/.test(result.output)) throw new Error(result.output);
      if (JSON.stringify(console) !== before)
        throw new Error("Command mutated its input session");
      const replay = executeLine(restored, line);
      if (!isDeepStrictEqual(result, replay))
        throw new Error("Saved-session replay diverged");
      console = result.console;
      restored = {
        ...replay.console,
        session: restoreSession(JSON.stringify(replay.console.session))!,
      };
    } catch (error) {
      throw new Error(`${quest}/tests/${filename}:${index + 1}: ${line}`, {
        cause: error,
      });
    }
  }
  return console;
}
