import figureSource from "./assets/personnel-figure.svg?raw";

const portraits = new Map<string, string>();
const profiles = [
  { skin: "#d7ad89", shade: "#b88969", hair: "#51463d", uniform: "#c0d1c4" },
  { skin: "#bd8c69", shade: "#976648", hair: "#5e4936", uniform: "#b6c1aa" },
  { skin: "#a97a58", shade: "#835737", hair: "#302c29", uniform: "#a6c7bd" },
  { skin: "#e0ba99", shade: "#bd9575", hair: "#6c4a35", uniform: "#b0c1cc" },
  { skin: "#93694e", shade: "#6c4734", hair: "#292a28", uniform: "#b8bdb2" },
  { skin: "#c59e80", shade: "#9f765c", hair: "#443f3a", uniform: "#cdc5a7" },
];

export function pawnPortrait(personId: string): string {
  const cached = portraits.get(personId);
  if (cached) return cached;
  const index = [
    "person-mara-voss",
    "person-caleb-ward",
    "person-priya-shah",
    "person-lena-ortiz",
    "person-jon-bell",
    "person-emil-novak",
  ].indexOf(personId);
  const profile = profiles[index >= 0 ? index : 0]!;
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
