import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("dist");
const manifest = JSON.parse(
  await readFile(path.join(outputDirectory, "version.json"), "utf8"),
);

if (typeof manifest.version !== "string" || manifest.version.length === 0) {
  throw new Error("dist/version.json does not contain a build version");
}

const html = await readFile(path.join(outputDirectory, "index.html"), "utf8");
if (!/\/assets\/[^"']+-[A-Za-z0-9_-]+\.js/.test(html)) {
  throw new Error(
    "dist/index.html does not reference a content-hashed JavaScript asset",
  );
}
if (!/\/assets\/[^"']+-[A-Za-z0-9_-]+\.css/.test(html)) {
  throw new Error(
    "dist/index.html does not reference a content-hashed CSS asset",
  );
}

const assetNames = await readdir(path.join(outputDirectory, "assets"));
const javaScriptNames = assetNames.filter((name) => name.endsWith(".js"));
const javaScript = (
  await Promise.all(
    javaScriptNames.map((name) =>
      readFile(path.join(outputDirectory, "assets", name), "utf8"),
    ),
  )
).join("\n");

if (!javaScript.includes(manifest.version)) {
  throw new Error(
    "compiled JavaScript does not contain the deployment version",
  );
}

console.log(`Verified deployment build ${manifest.version}`);
