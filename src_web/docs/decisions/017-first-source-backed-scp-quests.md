# First Source-Backed SCP Quests

## Selection

Implement the first two prioritized candidates, SCP-1867 and SCP-1370, as bounded playable quests before adding the third apparatus candidate SCP-294. Both reuse ordinary movement, carrying, integrity, preserved identities and observed quest conditions. Source texts were checked against archived revisions; credit Djoric for SCP-1867 and Sorts for SCP-1370 under CC BY-SA 3.0. Per-quest READMEs distinguish source facts from authored mission fiction.

## Shared Mechanics

Add Study as physical work at a facility with named plans and specific required evidence definitions. It records source instance IDs, actor, tick, title and result once per plan. Sources must be nearby and intact throughout productive work. No generic research-point payment, instant finding command or SCP-specific core branch is introduced. The existing research progress demo remains separate.

Quest conditions can observe a finding, delivery to a ground tile, a closed intact door, or lost/damaged evidence. The CLI provides briefings/source credits, catalog descriptions and a normal study command. Gameplay setup contains no solution scripts. Tests under test/simulation/quests/scp1867 and scp1370 issue physical orders and verify success, specific damage failure, absent corroboration and unsecured containment failure. Partial work and findings persist through saves.

## Adaptation Boundaries

Blackwood stays off-map at an outpost. The collection mission recovers journal/specimen and compares both with two independent survey/laboratory records; the journal itself is not independent corroboration. Kestrel Marsh and the corroborating details are original game fiction, and the resulting lead does not yet unlock another scenario.

SCP-1370 starts toppled with agency but no independent movement or attack capability. It retains its pawn identity while carried into an oversized glass display bay. The mission does not simulate its dialogue or ineffectual wrestling. The enclosure uses one-level terrain and door rules, not fire resistance or dimensioned portable containers. Source-specific observation text summarizes those bounded adaptations rather than claiming omitted behaviors ran in simulation.

Both quests use local intake areas, not the complete expedition-to-home lifecycle. No image assets, new GUI, new SCP combat, or full containment framework are added. Core save version 11 discards incompatible saves without migration. The existing engine/CLI boundary and test-only answer-key organization remain intact.
