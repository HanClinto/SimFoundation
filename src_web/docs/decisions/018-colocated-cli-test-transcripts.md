# Colocated CLI Test Transcripts

The user requested discoverable pass/fail setups beside each scenario and solutions written in the same commands used interactively. This revises the physical placement of answer keys from decision 016, not their test-only role.

Place plain text transcripts under `catalog/quests/<quest>/tests/`, beginning with a normal `load` command. The CLI accepts comment lines beginning with `#`, so a file can be read, pasted or piped without preprocessing. Tests replay it through executeLine, checking expected status/reason and key state invariants. SCP quest success assertions use these transcripts rather than maintaining separate scripted API solutions.

Production setup and registration never import the transcript directory. The automated reader and assertions stay in the top-level test tree. Specialized state-injection checks (damage, invalid evidence, etc.) remain focused TypeScript tests and are not presented as player-executable walkthroughs. No debug mutation commands, forced outcomes or fixture registry are added just to reproduce those checks.

Seven initial transcripts cover SCP-1370, SCP-1867 and Consumption. Tests verify nonmutation and saved-session replay after each command. Fixed step budgets in a walkthrough are examples, not requirements on implementation timing. Interactive/piped CLI outcome remains textual; batch exit status semantics are unchanged.
