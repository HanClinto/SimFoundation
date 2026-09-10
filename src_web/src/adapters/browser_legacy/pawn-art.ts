import figureSource from "../browser_shared/assets/personnel-figure.svg?raw";
import mapSource from "../browser_shared/assets/site-worker.svg?raw";

const portraits = new Map<string, string>();
const mapSprites = new Map<string, string>();
const profiles = [
  { skin: "#d7ad89", shade: "#b88969", hair: "#51463d", uniform: "#c0d1c4" },
  { skin: "#bd8c69", shade: "#976648", hair: "#5e4936", uniform: "#b6c1aa" },
  { skin: "#a97a58", shade: "#835737", hair: "#302c29", uniform: "#a6c7bd" },
  { skin: "#e0ba99", shade: "#bd9575", hair: "#6c4a35", uniform: "#b0c1cc" },
  { skin: "#93694e", shade: "#6c4734", hair: "#292a28", uniform: "#b8bdb2" },
  { skin: "#c59e80", shade: "#9f765c", hair: "#443f3a", uniform: "#cdc5a7" },
];

function pawnProfile(personId: string) {
  const index = [
    "person-mara-voss",
    "person-caleb-ward",
    "person-priya-shah",
    "person-lena-ortiz",
    "person-jon-bell",
    "person-emil-novak",
  ].indexOf(personId);
  return profiles[index >= 0 ? index : 0]!;
}

export type PawnPose =
  | "stand"
  | "walk-left"
  | "walk-right"
  | "carry"
  | "carry-left"
  | "carry-right"
  | "work"
  | "sit"
  | "sleep";

export function pawnMapSprite(
  personId: string,
  pose: PawnPose = "stand",
  facing: "left" | "right" = "right",
): string {
  const key = `${personId}:${pose}:${facing}`;
  const cached = mapSprites.get(key);
  if (cached) return cached;
  const profile = pawnProfile(personId);
  const document = new DOMParser().parseFromString(mapSource, "image/svg+xml");
  document.getElementById("head")!.setAttribute("fill", profile.skin);
  document.getElementById("hair")!.setAttribute("fill", profile.hair);
  document.getElementById("uniform")!.setAttribute("fill", profile.uniform);
  const legs = document.getElementById("legs")!.querySelectorAll("path");
  const arms = document.getElementById("uniform")!.querySelectorAll("path")[1]!;
  if (
    pose === "walk-left" ||
    pose === "walk-right" ||
    pose === "carry-left" ||
    pose === "carry-right"
  ) {
    const stride = pose.endsWith("left") ? 2 : -2;
    legs[0]!.setAttribute("transform", `translate(0 ${stride})`);
    legs[1]!.setAttribute("transform", `translate(0 ${-stride})`);
  }
  if (pose.startsWith("carry"))
    arms.setAttribute("d", "M5 13L2 19l8 2 1-4-5-1M19 13l3 6-8 2-1-4 5-1");
  if (pose === "work")
    arms.setAttribute("d", "M5 13L2 19l8-5-2-3M19 13l3 5-9 3-1-4 6-2");
  if (pose === "sit") {
    legs[0]!.setAttribute("d", "M6 23h5v5H5v4H2v-8z");
    legs[1]!.setAttribute("d", "M13 23h5l4 4v6h-4v-5h-5z");
  }
  if (pose === "sleep") {
    document.getElementById("shadow")!.setAttribute("opacity", "0");
    for (const group of Array.from(document.documentElement.children))
      group.setAttribute(
        "transform",
        "translate(12 22) rotate(-65) scale(.65) translate(-12 -18)",
      );
  }
  if (facing === "left") {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("transform", "translate(24 0) scale(-1 1)");
    group.append(...Array.from(document.documentElement.children));
    document.documentElement.append(group);
  }
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(document))}`;
  mapSprites.set(key, url);
  return url;
}

export function pawnPortrait(personId: string): string {
  const cached = portraits.get(personId);
  if (cached) return cached;
  const profile = pawnProfile(personId);
  const document = new DOMParser().parseFromString(
    figureSource,
    "image/svg+xml",
  );
  const root = document.documentElement;
  root.setAttribute("viewBox", "53 12 74 103");
  root.setAttribute("width", "74");
  root.setAttribute("height", "103");
  document.getElementById("reference-guides")?.remove();
  const head = document.getElementById("head")!.querySelectorAll("path");
  head[0]!.setAttribute("fill", profile.skin);
  head[1]!.setAttribute("fill", profile.shade);
  head[2]!.setAttribute("fill", profile.hair);
  document.getElementById("skin")!.setAttribute("fill", profile.skin);
  document
    .getElementById("uniform")!
    .querySelectorAll("path")[1]!
    .setAttribute("fill", profile.uniform);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(document))}`;
  portraits.set(personId, url);
  return url;
}
