import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const server = await createServer({
  root: fileURLToPath(new URL("..", import.meta.url)),
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { loadScenario, stepSession } = await server.ssrLoadModule(
    "/src/application/ScenarioSession.ts",
  );
  const count = Number(process.argv[2] ?? 40);
  if (!Number.isSafeInteger(count) || count < 1 || count > 10000)
    throw new Error("Specify 1..10000 ticks.");
  let session = loadScenario("colony");
  session = stepSession(session, 5);
  const samples = [];
  for (let index = 0; index < count; index++) {
    const start = performance.now();
    session = stepSession(session, 1);
    samples.push(performance.now() - start);
  }
  samples.sort((first, second) => first - second);
  console.log(
    JSON.stringify(
      {
        scenario: "colony",
        pawns: 12,
        map: "42x26",
        ticks: count,
        averageMs: samples.reduce((sum, value) => sum + value, 0) / count,
        medianMs: samples[Math.floor(count / 2)],
        p95Ms: samples[Math.min(count - 1, Math.floor(count * 0.95))],
        quest: session.quest.status,
      },
      null,
      2,
    ),
  );
} finally {
  await server.close();
}
