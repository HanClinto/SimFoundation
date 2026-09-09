# Archived Simulation

The previous simulation was moved here on 2026-09-09 at the user's request. Keep it available for inexpensive reference while the replacement is built in [../simulation](../simulation).

Existing application controllers, browser adapters and old tests explicitly import this directory. That retains a way to inspect the prototype; it is not a requirement to preserve stability, old save formats or gameplay assumptions during replacement. New simulation code must not import this directory. Bring over only useful rules/calculations, not compatibility wrappers or duplicate execution systems.

The code remains visible to Git and repository tooling. Its typechecking and tests are historical regression coverage, not the specification for the new model. New acceptance tests live under `test/simulation` in the web project.
