import type { GameState } from "../../simulation/state";
import type { TilePosition } from "../../simulation/world";
import type { MapPerspective } from "./map-settings";
import { pawnCues, type PawnCue, type PawnCueIcon } from "./pawn-cues";

const GLYPHS: Record<PawnCueIcon, readonly string[]> = {
  meal: [
    "x.x......",
    "xxx...xx.",
    ".x...xxxx",
    ".x...xxxx",
    ".x....xx.",
    ".x....xx.",
    ".x....xx.",
    ".x....xx.",
    ".........",
  ],
  sleep: [
    "xxxxxx...",
    "....x....",
    "...x.....",
    "..x......",
    ".x.......",
    "xxxxxx...",
    "......xxx",
    ".......x.",
    "......xxx",
  ],
  break: [
    ".........",
    ".xxxxx...",
    ".xoooxxx.",
    ".xooox.x.",
    ".xoooxxx.",
    ".xxxxx...",
    "..xxx....",
    "xxxxxxx..",
    ".........",
  ],
  walk: [
    "...xx....",
    "...xx....",
    "....x....",
    "..xxxx...",
    ".x..x.x..",
    "...xx....",
    "..x.x....",
    ".x...x...",
    "xx...xx..",
  ],
  tools: [
    "xx....x.x",
    ".xx...xxx",
    "..xx..xx.",
    "...xxxx..",
    "...xxx...",
    "..xxxxx..",
    ".xxx..xx.",
    "xxx....xx",
    "xx......x",
  ],
  box: [
    "..xxxxx..",
    ".xxoooxx.",
    "xxoooooxx",
    "xxxxxxxxx",
    "xoooxooox",
    "xoooxooox",
    "xoooxooox",
    "xoooxooox",
    "xxxxxxxxx",
  ],
  medical: [
    "...xxx...",
    "...xox...",
    "...xox...",
    "xxxxoxxxx",
    "xooooooox",
    "xxxxoxxxx",
    "...xox...",
    "...xox...",
    "...xxx...",
  ],
  research: [
    "..xxxxx..",
    "...x.x...",
    "...x.x...",
    "...x.x...",
    "..x...x..",
    ".x.....x.",
    "xooooooox",
    "xooooooox",
    ".xxxxxxx.",
  ],
  guard: [
    ".xxxxxxx.",
    "xxoooooxx",
    "xooooooox",
    "xoooxooox",
    "xoooxooox",
    ".xooooox.",
    ".xxoooxx.",
    "..xxxxx..",
    "....x....",
  ],
  chat: [
    ".xxxxxxx.",
    "x.......x",
    "x.......x",
    "x.x.x.x.x",
    "x.......x",
    ".xxxxxxx.",
    "...x.x...",
    "..xxx....",
    ".........",
  ],
  wait: [
    ".........",
    ".........",
    ".........",
    "xx.xx.xx.",
    "xx.xx.xx.",
    ".........",
    ".........",
    ".........",
    ".........",
  ],
  alert: [
    "...xxx...",
    "...xxx...",
    "...xxx...",
    "...xxx...",
    "...xxx...",
    ".........",
    "...xxx...",
    "...xxx...",
    ".........",
  ],
  happy: [
    "..xxxxx..",
    ".x.....x.",
    "x.x...x.x",
    "x.......x",
    "x.......x",
    "x.x...x.x",
    "x..xxx..x",
    ".x.....x.",
    "..xxxxx..",
  ],
  tense: [
    "..xxxxx..",
    ".x.....x.",
    "x.xx.xx.x",
    "x.......x",
    "x.......x",
    "x..xxx..x",
    "x.......x",
    ".x.....x.",
    "..xxxxx..",
  ],
  sad: [
    "..xxxxx..",
    ".x.....x.",
    "x.x...x.x",
    "x.......x",
    "x.......x",
    "x..xxx..x",
    "x.x...x.x",
    ".x.....x.",
    "..xxxxx..",
  ],
  reserved: [
    "..xxxxx..",
    ".x.....x.",
    "x.x...x.x",
    "x.......x",
    "x.......x",
    "x.xxxxx.x",
    "x.......x",
    ".x.....x.",
    "..xxxxx..",
  ],
};

export interface PawnBubble {
  readonly personId: string;
  readonly title: string;
  readonly cue: PawnCue;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly anchor: TilePosition;
}
interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
const overlaps = (first: Bounds, second: Bounds) =>
  first.x < second.x + second.width + 3 &&
  first.x + first.width + 3 > second.x &&
  first.y < second.y + second.height + 3 &&
  first.y + first.height + 3 > second.y;

export function layoutPawnBubbles(
  state: GameState,
  perspective: MapPerspective,
  zoom: number,
  width: number,
  height: number,
  project: (position: TilePosition) => TilePosition,
  selectedId: string | null = null,
): readonly PawnBubble[] {
  if (zoom < 0.45 || width < 40 || height < 40) return [];
  const people = state.personnel
    .flatMap((person) => {
      const position = state.world.positions[person.id];
      if (!position) return [];
      const point = project(position);
      if (point.x < 0 || point.x > width || point.y < 0 || point.y > height)
        return [];
      return [{ person, point, cues: pawnCues(state, person.id, perspective) }];
    })
    .sort(
      (first, second) =>
        Number(second.person.id === selectedId) -
          Number(first.person.id === selectedId) ||
        first.person.id.localeCompare(second.person.id),
    );
  const heads = people.map(({ point }) => ({
    x: point.x - 12 * zoom,
    y: point.y - 36 * zoom,
    width: 24 * zoom,
    height: 36 * zoom,
  }));
  const bubbles: PawnBubble[] = [];
  for (const kind of ["action", "mood"] as const)
    for (const { person, point, cues } of people) {
      const anchor = { x: point.x, y: point.y - 36 * zoom };
      for (const cue of cues) {
        const mood = cue.kind === "mood";
        if (mood !== (kind === "mood")) continue;
        const size = mood ? 22 : 28;
        const baseline = anchor.y - size - 9;
        const candidates = mood
          ? [
              [18, 0],
              [-42, 0],
              [18, -30],
            ]
          : [
              [-14, 0],
              [-14, -32],
              [22, -12],
              [-50, -12],
              [-14, -64],
            ];
        const bounds = candidates
          .map(([offsetX, offsetY]) => ({
            x: Math.round(
              Math.max(2, Math.min(width - size - 2, anchor.x + offsetX!)),
            ),
            y: Math.round(baseline + offsetY!),
            width: size,
            height: size,
          }))
          .find(
            (rect) =>
              rect.y >= 2 &&
              rect.y + rect.height + 6 <= height &&
              !bubbles.some((bubble) => overlaps(rect, bubble)) &&
              !heads.some((head) => overlaps(rect, head)),
          );
        if (bounds)
          bubbles.push({
            ...bounds,
            personId: person.id,
            title: `${person.name}: ${cue.label}`,
            cue,
            anchor,
          });
      }
    }
  return bubbles;
}

export function bubbleAt(
  bubbles: readonly PawnBubble[],
  point: TilePosition,
): PawnBubble | undefined {
  return bubbles.find(
    (bubble) =>
      point.x >= bubble.x &&
      point.x <= bubble.x + bubble.width &&
      point.y >= bubble.y &&
      point.y <= bubble.y + bubble.height,
  );
}

export function drawPawnBubbles(
  context: CanvasRenderingContext2D,
  bubbles: readonly PawnBubble[],
): void {
  context.save();
  for (const bubble of bubbles) {
    const { x, y, width, height, cue } = bubble;
    const mood = cue.kind === "mood";
    const concerned = ["alert", "sad", "tense"].includes(cue.icon);
    const ink = concerned ? "#843e36" : "#284c43";
    const fill = concerned ? "#fff0cb" : mood ? "#e0f0dd" : "#fbfcf4";
    context.lineWidth = 1;
    context.strokeStyle = "#52665b";
    if (!mood) {
      context.beginPath();
      context.moveTo(x + width / 2, y + height + 3);
      context.lineTo(bubble.anchor.x, bubble.anchor.y - 2);
      context.stroke();
    }
    context.fillStyle = "rgba(24, 40, 32, .3)";
    context.fillRect(x + 2, y + 2, width, height);
    context.fillStyle = fill;
    context.beginPath();
    context.moveTo(x + 3, y);
    context.lineTo(x + width - 3, y);
    context.lineTo(x + width, y + 3);
    context.lineTo(x + width, y + height - 3);
    context.lineTo(x + width - 3, y + height);
    if (cue.kind === "speech") {
      context.lineTo(x + 10, y + height);
      context.lineTo(x + 5, y + height + 5);
      context.lineTo(x + 5, y + height);
    }
    context.lineTo(x + 3, y + height);
    context.lineTo(x, y + height - 3);
    context.lineTo(x, y + 3);
    context.closePath();
    context.fill();
    context.stroke();
    if (cue.kind === "thought") {
      context.fillRect(x + width / 2 - 1, y + height + 2, 3, 3);
      context.strokeRect(x + width / 2 - 1, y + height + 2, 3, 3);
    }
    const glyph = GLYPHS[cue.icon];
    const scale = 2;
    const left = x + Math.floor((width - 18) / 2);
    const top = y + Math.floor((height - 18) / 2);
    glyph.forEach((row, rowIndex) =>
      [...row].forEach((pixel, column) => {
        if (pixel === ".") return;
        context.fillStyle =
          pixel === "o"
            ? cue.icon === "medical"
              ? "#6f9a76"
              : "#b4cbb7"
            : ink;
        context.fillRect(
          left + column * scale,
          top + rowIndex * scale,
          scale,
          scale,
        );
      }),
    );
  }
  context.restore();
}
