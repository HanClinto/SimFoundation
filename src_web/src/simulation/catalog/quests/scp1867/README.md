# SCP-1867: Corroborate The Collection

## Source And Attribution

Adapted from [SCP-1867](https://scp-wiki.wikidot.com/scp-1867) by **Djoric**, SCP Wiki, under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Based on the [locally archived revision 26](../../../../../docs/references/scp-1867/2026-09-09-revision-26.txt), captured 2026-09-09. This adaptation's original scenario text and source-derived content are also offered under CC BY-SA 3.0. No source images are used.

Source anchors: Blackwood is a cooperative telepathic naturalist in an aquatic body; he offers his extensive collection; his claims require correlation with at least two other sources before allocating further research resources. His journals are his own accounts, not independent corroboration.

## Playable Adaptation

The bounded map combines a collection vault with temporary Foundation intake. Recover the journal and preserved specimen, compare them with an independently supplied survey and laboratory dossier, and leave the unidentified device isolated. Study requires all four intact physical sources within one tile of the comparison bench for eight work ticks. The dated finding records the actor and exact source identities without consuming or duplicating evidence.

Kestrel Marsh, the specimen details, survey and laboratory findings are **original mission fiction**, not facts from the SCP article. The two independent records corroborate one bounded claim; the finding does not establish that all of Blackwood's stories are true. In the [persistent campaign](../../campaign/README.md), the evidence must return home and its finding unlocks the retained Kestrel depot. This isolated trial records the same finding without a campaign.

Blackwood remains at the outpost off-map. Aquarium care, live transfer, the full collection, hazardous device activation and free-form interviews are not implemented. The campaign adds physical evidence transport back to home; this isolated trial retains local intake. Relocating the isolated device prevents trial success but does not invent an explosion or canonical hazard effect.

## Organization

- `quest.ts`: briefing, sources, success/failure conditions and deadline.
- `setup.ts`: shared playable setup; no success commands.
- `collection.ts`: named physical evidence and study station definitions.
- Copyable test-only solutions: [pass](tests/pass.txt) and [fail: missing corroboration](tests/fail-missing-corroboration.txt). Every non-comment line is a normal CLI command. The failure deliberately moves a required independent record away from the bench.
- Automated provenance, deduplication and injected-damage/source checks remain in `src_web/test/simulation/quests/scp1867/quest.test.ts`; the successful recovery replays the transcript above.

Run `npm run sim -- --scenario scp1867` from `src_web`. Use `brief` and `status`, then `deploy researcher ben` and `start`. Ben automatically arrives at entry, fills the investigator role and receives the stable label `@1`. `inspect bench` lists the task and study plan. Orders use plain verbs such as `order ben take journal` and `order ben drop journal`; `order ben study bench marsh-lead` starts the physical comparison. Failure covers damage or loss of essential evidence, investigator incapacitation, and missed deadline. Colocated transcripts include deployment/start rather than relying on a pre-created player pawn.
