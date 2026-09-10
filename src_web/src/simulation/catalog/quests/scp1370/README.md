# SCP-1370: A Place In The Gallery

## Source And Attribution

Adapted from [SCP-1370](https://scp-wiki.wikidot.com/scp-1370) by **Sorts**, SCP Wiki, under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Based on the [locally archived revision 31](../../../../../docs/references/scp-1370/2026-09-09-revision-31.txt), captured 2026-09-09. This adaptation's original scenario text and source-derived content are also offered under CC BY-SA 3.0. No source images are used.

Source anchors: SCP-1370 is a sapient artificial being, animated without an external power supply, verbally belligerent but incapable of harming living beings. Poor balance can leave it unable to right itself. Containment calls for a fire-proof glass display case; an adequately sized alternative container is permitted temporarily, with space to move recommended for long-term storage.

## Playable Adaptation

The exhibit starts toppled. Carry it intact into the glass display bay, place it on the designated tile, perform a controlled observation, then return to reception and leave the automatic door closed. It remains the same pawn while carried and after placement; it is not converted into cargo or given an artificial hunger/battery requirement. Its harmlessness is reflected by absent attack capability and a nonthreatening faction policy, not by high health or a hidden combat encounter.

The oversized one-level glass bay abstracts an adequate enclosure. Tile dimensions, fire resistance, a portable case, dialogue, ineffective wrestling, autonomous walking after being righted, and inter-site freight are **not simulated**. The observation finding summarizes source-grounded properties; it is not a claim that those omitted behaviors were dynamically tested. Damaging the exhibit is a quest failure, not a capture shortcut.

## Organization

- `quest.ts`: briefing, source attribution and observed completion/failure rules.
- `setup.ts`: shared gallery setup.
- `display.ts`: source-specific observation station and finding.
- `catalog/actors/anomalies/SCP1370.ts`: the named pawn definition.
- Test-only answer keys: `src_web/test/simulation/quests/scp1370/quest.test.ts`.

Run `npm run sim -- --scenario scp1370` from `src_web`. Use `brief`, `status`, and `inspect station`. `study handler station safe-exhibit` performs the observation after the exhibit has been physically brought nearby. Damage/loss, handler incapacitation and deadline failure are separate from successful secure recovery.
