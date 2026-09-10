# Consumption Test Solutions

These are test-only answer keys, not gameplay variants. Open a file and type or paste its commands into the CLI. Each starts with `load consumption`; `#` lines are accepted comments.

- [pass.txt](pass.txt): eat normally, satisfy hunger and retain leftovers.
- [pass-resume.txt](pass-resume.txt): take three bites, cancel, walk away, then return and finish the same meal.
- [fail-deadline.txt](fail-deadline.txt): issue no orders and miss the deadline.

From `src_web`, `npm run sim < src/simulation/catalog/quests/consumption/tests/pass-resume.txt` executes the file unchanged. The automated transcript suite uses the same CLI parser and verifies outcome and remaining quantity. More targeted state-setup and save/load assertions remain under `test/simulation/quests/consumption/`.
