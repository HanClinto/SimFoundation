# Browser Chrome Icons

On 2026-09-05 the original facility, folder, library, alarm, budget, records, work orders, playback, monitor, camera, personnel, and medical icons were redrawn by GitHub Copilot on a shared 32x32 canvas with consistent outlines and limited-color highlights. Their editable SVGs are the sources, licensed CC BY-SA 3.0. The canonical SCP emblem was not changed. Pawn portraits derive from the original personnel reference illustration with per-person display palettes; these are provisional appearance choices, not inferred personality or clinical information.

These small SVGs support SCPSiteManager's desktop chrome.

- `alarm.svg`, `book.svg`, `budget.svg`, `camera.svg`, `control.svg`, `debug.svg`, `folder.svg`, `facility.svg`, `medical.svg`, `personnel.svg`, `records.svg`, and `work-orders.svg` are original project artwork.
- `scp-emblem.svg` is the canonical SCP Foundation emblem downloaded from [Wikimedia Commons](<https://commons.wikimedia.org/wiki/File:SCP_Foundation_(emblem).svg>). The original logo was designed by far2; Aelanna created the first high-resolution version. The vendored SVG is the Commons revision based on the SCP Wiki Sigma header logo. It is licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).

These files follow SCPSiteManager's SCP/CC BY-SA licensing direction. They are not part of the generic CC0 OpenIsoGfx package because the emblem and their interface use are specific to this game.

## Facility Markers

Pawn action and outward-mood glyphs are original 9x9 pixel patterns in `../pawn-bubbles.ts`, authored for SimFoundation by GitHub Copilot on 2026-09-05. They are drawn inside action, thought, speech, and mood bubbles by the Canvas renderer. Source: the editable pixel grids and bubble geometry in that module. License: CC BY-SA 3.0, consistent with the project. They use no emoji font or third-party game artwork. The medical glyph uses a green cross.

`an-001-chamber.svg` is original artwork authored by GitHub Copilot for SimFoundation on 2026-09-05, licensed CC BY-SA 3.0. Source: the editable SVG in this directory. Initial depiction of the original AN-001 specimen and bench-scale test chamber. No third-party imagery or canonical SCP entry was used for the specimen. Its gameplay and provenance are documented in `docs/anomaly-catalog.md`.

`site-worker.svg` and `site-999.svg` are original SVG artwork created for SimFoundation by GitHub Copilot on 2026-09-05. Source: the editable SVG files in this directory. License: CC BY-SA 3.0. Modification history: initial authored personnel and SCP-999 surveillance markers. They contain no copied prototype or third-party artwork. SCP-999 is based on the [SCP Wiki article](https://scp-wiki.wikidot.com/scp-999) by ProfSnider, under CC BY-SA 3.0. These provisional map markers are not the future generic OpenIsoGfx equipment rig.

Runtime personnel variants of `site-worker.svg` recolor the original head, hair, and uniform groups with the same six palettes used by `pawn-art.ts` dossier portraits. Modification author: GitHub Copilot, 2026-09-05. The geometry and CC BY-SA 3.0 license are unchanged; no external artwork or new outfit/equipment state is introduced. Generated SVG data URLs and loaded canvas images are cached per person.

On 2026-09-05, the SCP-999 marker was revised against source revision 40: a broad translucent oblate dome, without a permanent face. Dimensions remain a stylized approximation; see the local source catalog and adaptation notes under `docs/references/`.

## Personnel Reference Illustrations

`station-bed.svg`, `station-meal.svg`, and `station-break.svg` are original isometric routine-station illustrations created by GitHub Copilot for SimFoundation on 2026-09-05, licensed CC BY-SA 3.0. Source: the editable files in this directory. Modification history: initial bed, meal table, and break-seat drawings. These station markers represent simulation-owned service positions; they are not decorative props or third-party assets.

`equipment-atlas.svg`, `personnel-figure.svg`, and `anatomy-figure.svg` are original SVG artwork created by GitHub Copilot for SimFoundation on 2026-09-05, licensed CC BY-SA 3.0. Source: these editable files. Modification history: initial reference-book equipment plates, uniform reference, and anterior body illustration. No third-party images or proprietary reference-book artwork were copied. The uniform is a generic reference, not yet a composited equipment portrait. Medical kit artwork uses a green cross, not the protected red-cross emblem.

The shared `medical.svg` chrome icon was recolored green on 2026-09-05 to match the clinical art and avoid use of the protected red-cross emblem. All medical-window launchers and taskbar entries use this same asset.
