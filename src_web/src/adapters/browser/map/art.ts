import type { Entity } from "../../../simulation/core/entity/Entity";
import workerSource from "../../browser_shared/assets/site-worker.svg?raw";
import bed from "../../browser_shared/assets/station-bed.svg";
import meal from "../../browser_shared/assets/station-meal.svg";
import rest from "../../browser_shared/assets/station-break.svg";
import medical from "../../browser_shared/assets/medical.svg";

const images = new Map<string, string>();
const palettes = [
  ["#d9aa7e", "#594a3c", "#d1d8e5"],
  ["#b77d54", "#292725", "#c5d2af"],
  ["#efc7a0", "#80552f", "#cbbbbb"],
  ["#87583f", "#292321", "#d4c59d"],
] as const;

function personArt(id: string): string {
  const cached = images.get(id);
  if (cached) return cached;
  const hash = [...id].reduce(
    (value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0,
    0,
  );
  const [skin, hair, uniform] = palettes[hash % palettes.length]!;
  const image = `data:image/svg+xml,${encodeURIComponent(workerSource.replace("#d9aa7e", skin).replace("#594a3c", hair).replace("#e5e8eb", uniform))}`;
  images.set(id, image);
  return image;
}
function drawing(kind: string, color: string): string {
  const key = `${kind}:${color}`;
  const existing = images.get(key);
  if (existing) return existing;
  const shape =
    kind === "document"
      ? '<path d="M15 8h22v31H15z" fill="#f8ecd0"/><path d="M19 15h14m-14 5h14m-14 5h10" fill="none"/>'
      : kind === "bottle"
        ? `<path d="M20 5h9v9l5 5v21H15V19l5-5z" fill="${color}"/><path d="M20 8h9M18 26h13" fill="none"/>`
        : kind === "bench"
          ? `<path d="M5 21l20-10 19 10-20 11z" fill="${color}"/><path d="M7 23v14m33-14v14M24 32v13" fill="none" stroke-width="3"/><path d="M20 10v-5h12v13l-6 3-6-3z" fill="#a4bab9"/>`
          : kind === "resident"
            ? `<path d="M11 36V21a13 13 0 0126 0v15l-13 6z" fill="${color}"/><circle cx="20" cy="24" r="2" fill="#111"/><circle cx="29" cy="24" r="2" fill="#111"/>`
            : `<path d="M7 18l17-9 17 9v20l-17 8L7 38z" fill="${color}"/><path d="M7 18l17 9 17-9M24 27v19" fill="none"/><path d="M18 12v-5h12v5" fill="none"/>`;
  const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><g stroke="#304445" stroke-width="1.5" stroke-linejoin="round">${shape}</g></svg>`;
  const result = `data:image/svg+xml,${encodeURIComponent(source)}`;
  images.set(key, result);
  return result;
}

export function entityArt(entity: Entity): string | null {
  if (entity.kind === "pawn")
    return entity.human || entity.playerControllable
      ? personArt(entity.id)
      : drawing("resident", "#be9e6a");
  if (entity.kind === "door") return null;
  if (entity.kind === "facility") {
    if (entity.care) return medical;
    if (entity.activities.sleep) return bed;
    if (entity.activities.relax) return rest;
    return drawing("bench", entity.containment ? "#7b909a" : "#9e9277");
  }
  if (entity.nutrition) return meal;
  if (
    entity.materialId.includes("paper") ||
    entity.definitionId.includes("journal") ||
    entity.definitionId.includes("dossier") ||
    entity.definitionId.includes("survey")
  )
    return drawing("document", "#eee");
  if (entity.sample || entity.definitionId.includes("reservoir"))
    return drawing("bottle", "#8cbbbb");
  return drawing(
    "case",
    entity.equipment ? "#7b8595" : entity.case ? "#b69a60" : "#9eaa81",
  );
}

export function entitySymbol(entity: Entity): string {
  if (entity.kind === "pawn") {
    if (entity.health?.death) return "BODY";
    if (!entity.playerControllable) return "R";
    return entity.name.slice(0, 1);
  }
  if (entity.kind === "door") return entity.open ? "/" : "|";
  if (entity.kind === "facility") return "F";
  return entity.case ? "CASE" : entity.equipment ? "GEAR" : "ITEM";
}
