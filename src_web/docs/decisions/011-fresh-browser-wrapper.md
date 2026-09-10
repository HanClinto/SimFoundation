# 011: Fresh browser over shared session operations

The reviewed replacement campaign has a different ownership model from the
old browser. Redirecting old views to new snapshots would retain two gameplay
architectures and obscure physical commands.

The active entry is a new `adapters/browser` using a small typed
`application/SessionController`. Pure application commands, complete-tick alarm
classification and bounded commitment completion are shared with the CLI.
DOM code offers concrete action parameters and previews/executions use the same
core policy; it never parses CLI output or runs walkthroughs.

Legacy browser and legacy-only bindings move to explicit archive directories.
Existing tests remain. Reusable attributed art and deployment version checks
have a presentation-only shared owner, with no legacy gameplay imports.

Desktop layout, command subject, inspection target, map zoom, pause and wall-clock
speed belong to the browser. Current-version session JSON is the same as the CLI,
stored under a separate key from both legacy saves and desktop preferences.
Invalid saves produce explicit errors, not migrations or silent overwrites.

We chose a small desktop/map/inspection/queue and operations surface over copying
the old window registrations or inventing a generic command/plugin framework.
Further panels must expose connected gameplay rather than duplicate core rules.
