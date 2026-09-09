import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const root = fileURLToPath(new URL("../docs/references/", import.meta.url));
const recommendationsPath = path.join(root, "AbbysSCPRecommendations.md");
const catalogPath = path.join(root, "catalog.json");
const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36";
const requestedSlugs = new Set(process.argv.slice(2));
const virtualConsole = new VirtualConsole();

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fileExists(filename) {
  try {
    await access(filename);
    return true;
  } catch {
    return false;
  }
}

async function fetchResponse(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": userAgent },
        redirect: "follow",
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(attempt * 750);
    }
  }
  throw lastError;
}

function recommendationEntries(markdown) {
  const entries = [];
  for (const paragraph of markdown.split(/\n\s*\n/)) {
    const urls = [
      ...paragraph.matchAll(/https?:\/\/(?:www\.)?scp-wiki\.net\/([^\s)]+)/g),
    ];
    if (urls.length === 0) continue;

    const note = paragraph
      .replace(/https?:\/\/\S+/g, "")
      .replace(/^\s*(?:and\s*)?/i, "")
      .replace(/^\s*-\s*/, "")
      .trim();

    for (const match of urls) {
      const slug = match[1].replace(/[.,;:!?]+$/, "").toLowerCase();
      if (slug === "top-rated-pages") continue;
      entries.push({
        slug,
        url: `https://scp-wiki.wikidot.com/${slug}`,
        recommendation: note,
      });
    }
  }
  return entries;
}

function safeAssetName(url, contentType) {
  const parsed = new URL(url);
  const original = decodeURIComponent(path.basename(parsed.pathname))
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "");
  const extensionByType = {
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "video/mp4": ".mp4",
  };
  const fallbackExtension = extensionByType[contentType.split(";")[0]] ?? "";
  const filename = original || `asset${fallbackExtension}`;
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 10);
  return `${hash}-${filename}`;
}

function absoluteUrl(value, baseUrl) {
  if (!value || value.startsWith("data:") || value.startsWith("javascript:")) {
    return null;
  }
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return null;
  }
}

async function localizeMedia(document, baseUrl, outputDirectory) {
  const assetsDirectory = path.join(outputDirectory, "assets");
  const downloaded = new Map();
  let assetCount = 0;

  async function localize(value) {
    const url = absoluteUrl(value, baseUrl);
    if (!url) return value;
    if (downloaded.has(url)) return downloaded.get(url);

    try {
      const response = await fetchResponse(url);
      const contentType = response.headers.get("content-type") ?? "";
      const filename = safeAssetName(url, contentType);
      await mkdir(assetsDirectory, { recursive: true });
      await writeFile(
        path.join(assetsDirectory, filename),
        Buffer.from(await response.arrayBuffer()),
      );
      const localPath = `assets/${filename}`;
      downloaded.set(url, localPath);
      assetCount += 1;
      return localPath;
    } catch (error) {
      console.warn(`  asset unavailable: ${url} (${error.message})`);
      return url;
    }
  }

  async function localizeCss(value) {
    let localized = value;
    for (const match of value.matchAll(/url\((['"]?)(.*?)\1\)/gi)) {
      const replacement = await localize(match[2]);
      localized = localized.replace(match[0], `url("${replacement}")`);
    }
    return localized;
  }

  for (const element of document.querySelectorAll(
    "img[src], audio[src], video[src], source[src]",
  )) {
    element.setAttribute("src", await localize(element.getAttribute("src")));
    element.removeAttribute("srcset");
  }
  for (const element of document.querySelectorAll("[poster]")) {
    element.setAttribute(
      "poster",
      await localize(element.getAttribute("poster")),
    );
  }
  for (const element of document.querySelectorAll("[style]")) {
    element.setAttribute(
      "style",
      await localizeCss(element.getAttribute("style")),
    );
  }
  for (const element of document.querySelectorAll("style")) {
    element.textContent = await localizeCss(element.textContent);
  }
  for (const element of document.querySelectorAll("script:not([src])")) {
    let script = element.textContent;
    for (const match of script.matchAll(
      /https?:\/\/[^"'`\s]+?\.(?:gif|jpe?g|png|svg|webp)(?:\?[^"'`\s]*)?/gi,
    )) {
      script = script.replace(match[0], await localize(match[0]));
    }
    element.textContent = script;
  }
  for (const element of document.querySelectorAll("a[href]")) {
    const href = element.getAttribute("href");
    const absolute = absoluteUrl(href, baseUrl);
    if (absolute) element.setAttribute("href", absolute);
  }
  for (const element of document.querySelectorAll("*")) {
    for (const attribute of [...element.attributes]) {
      if (attribute.name.startsWith("on"))
        element.removeAttribute(attribute.name);
    }
  }
  return assetCount;
}

async function localizeFrames(document, baseUrl, outputDirectory, depth = 0) {
  let assetCount = 0;
  let frameIndex = 0;
  for (const frame of [...document.querySelectorAll("iframe[src]")]) {
    if (
      frame.matches('[style*="display: none"]') ||
      frame.closest('[style*="display: none"]')
    ) {
      frame.remove();
      continue;
    }

    const frameUrl = absoluteUrl(frame.getAttribute("src"), baseUrl);
    if (!frameUrl || depth >= 2) continue;
    try {
      const response = await fetchResponse(frameUrl);
      const frameDom = new JSDOM(await response.text(), {
        url: response.url,
        virtualConsole,
      });
      assetCount += await localizeFrames(
        frameDom.window.document,
        response.url,
        outputDirectory,
        depth + 1,
      );
      assetCount += await localizeMedia(
        frameDom.window.document,
        response.url,
        outputDirectory,
      );
      const hash = createHash("sha256")
        .update(frameUrl)
        .digest("hex")
        .slice(0, 10);
      const filename = `frame-${depth}-${frameIndex}-${hash}.html`;
      await writeFile(
        path.join(outputDirectory, filename),
        `<!doctype html>\n${frameDom.window.document.documentElement.outerHTML}\n`,
      );
      frame.setAttribute("src", filename);
      frameIndex += 1;
    } catch (error) {
      console.warn(
        `  embedded document unavailable: ${frameUrl} (${error.message})`,
      );
      frame.setAttribute("src", frameUrl);
    }
  }
  return assetCount;
}

function articleText(article) {
  return article.textContent
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function articleAuthor(article) {
  for (const paragraph of article.querySelectorAll(
    ".licensebox blockquote p",
  )) {
    const text = paragraph.textContent.replace(/\s+/g, " ").trim();
    const match = text.match(
      /["“][^"”]+["”]\s+by\s+(.+?)(?:,?\s+from\s+the\s+SCP\s+Wiki|\.\s+Source:)/i,
    );
    if (match) return match[1].trim();
  }
  if (/^SCP Wiki Staff have removed/m.test(article.textContent)) {
    return "SCP Wiki staff (individual authors not stated)";
  }
  return "Unknown; consult the source page history and attribution block";
}

function archiveHtml({ title, url, retrieved, revisionLabel, article }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</title>
  <style>
    body { margin: 0 auto; max-width: 64rem; padding: 2rem; color: #171717; background: #f7f7f5; font: 16px/1.55 Georgia, serif; }
    header { border-bottom: 1px solid #999; margin-bottom: 2rem; font-family: sans-serif; }
    img, video { max-width: 100%; height: auto; }
    iframe { max-width: 100%; }
    table { border-collapse: collapse; max-width: 100%; }
    td, th { border: 1px solid #999; padding: .35rem; }
    blockquote { border-left: .25rem solid #999; margin-left: 0; padding-left: 1rem; }
    .archive-meta { color: #555; font-size: .875rem; }
  </style>
</head>
<body>
  <header>
    <h1>${title.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</h1>
    <p class="archive-meta">Archived ${retrieved} from <a href="${url}">${url}</a>${revisionLabel ? `; ${revisionLabel}` : ""}. Source content is licensed under CC BY-SA 3.0 unless the source page states otherwise.</p>
  </header>
  <main>${article.innerHTML}</main>
</body>
</html>
`;
}

async function archive(entry, retrieved) {
  console.log(`Archiving ${entry.slug}...`);
  const response = await fetchResponse(entry.url);
  const source = await response.text();
  const dom = new JSDOM(source, { url: response.url, virtualConsole });
  const document = dom.window.document;
  const article = document.querySelector("#page-content");
  if (!article || articleText(article).length < 100) {
    throw new Error(`No substantial article body found for ${entry.url}`);
  }

  article
    .querySelectorAll(
      "script, noscript, .page-rate-widget-box, .rate-box-with-credit-button",
    )
    .forEach((element) => element.remove());
  const title =
    document.querySelector("#page-title")?.textContent?.trim() || entry.slug;
  const author = articleAuthor(article);
  const pageInfo = document.querySelector("#page-info")?.textContent ?? "";
  const revisionMatch = pageInfo.match(/page revision:\s*(\d+)/i);
  const modifiedMatch = pageInfo.match(/last edited:\s*([^\n(]+)/i);
  const revision = revisionMatch ? Number(revisionMatch[1]) : null;
  const sourceModified = modifiedMatch ? modifiedMatch[1].trim() : null;
  const revisionLabel = [
    revision === null ? null : `revision ${revision}`,
    sourceModified ? `last edited ${sourceModified}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const outputDirectory = path.join(root, entry.slug);
  await mkdir(outputDirectory, { recursive: true });
  let assetCount = await localizeFrames(article, response.url, outputDirectory);
  assetCount += await localizeMedia(article, response.url, outputDirectory);
  const stem = `${retrieved}${revision === null ? "" : `-revision-${revision}`}`;
  const textPath = `${entry.slug}/${stem}.txt`;
  const htmlPath = `${entry.slug}/${stem}.html`;
  await writeFile(path.join(root, textPath), `${articleText(article)}\n`);
  await writeFile(
    path.join(root, htmlPath),
    archiveHtml({
      title,
      url: response.url,
      retrieved,
      revisionLabel,
      article,
    }),
  );

  const notesPath = `${entry.slug}/adaptation.md`;
  const notes = (await fileExists(path.join(root, notesPath)))
    ? notesPath
    : undefined;

  return {
    id: `${entry.slug}-${stem}`,
    title,
    author,
    url: response.url,
    ...(response.url !== entry.url ? { requestedUrl: entry.url } : {}),
    license: "CC-BY-SA-3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    revision,
    sourceModified,
    retrieved,
    text: textPath,
    html: htmlPath,
    ...(notes ? { notes } : {}),
    recommendation: entry.recommendation,
    assets: assetCount,
    capture:
      "Article body archived as searchable text and standalone HTML with referenced media downloaded where available; navigation, rating controls, and account UI omitted.",
    transformations:
      "Links were made absolute and downloaded media links were rewritten to local assets. Article markup and wording were otherwise retained.",
  };
}

const markdown = await readFile(recommendationsPath, "utf8");
let entries = recommendationEntries(markdown);
if (requestedSlugs.size > 0) {
  entries = entries.filter((entry) => requestedSlugs.has(entry.slug));
}
if (entries.length === 0) {
  throw new Error("No matching SCP Wiki recommendations found.");
}

const retrieved = new Date().toISOString().slice(0, 10);
const archived = [];
for (const entry of entries) {
  archived.push(await archive(entry, retrieved));
  await sleep(150);
}

const existing = JSON.parse(await readFile(catalogPath, "utf8"));
const archivedIds = new Set(archived.map(({ id }) => id));
const retained = existing.entries.filter((entry) => !archivedIds.has(entry.id));
await writeFile(
  catalogPath,
  `${JSON.stringify({ version: 2, entries: [...retained, ...archived] }, null, 2)}\n`,
);
console.log(`Archived ${archived.length} pages in ${root}`);
