# Deployment And Stable Pawn Labels

## Decision

The user approved CLI deployment as the counterpart of future GUI team selection and requested roguelike pawn labels such as @2. For the two authored SCP missions, load creates the environment/evidence/anomaly only. Authored deployment data declares allowed staff templates, ordered entry tiles, required roles and a team limit. Deploy instantiates a named pawn on a clear entry tile without advancing time. Start checks the assigned team and starts the quest clock; gameplay orders/ticking are unavailable during setup and deployment is unavailable after start.

Roles bind to actual deployed identities rather than fixed pawn names. The user simplified the CLI to `deploy <staff-type> <name>`: every player agent uses the authored map entry, and the first agent automatically fills the mission's single required role. Further agents are support staff. The application retains explicit role assignment for authored callers; multi-role team selection is not exposed by the CLI. Quest state and event conditions resolve those bindings. Other authored targets retain their normal local identities. No runtime import of test answer keys is introduced; colocated CLI walkthroughs now include deployment commands.

Walkthroughs use personal names (Alex, Ben, Daniel) rather than confusing staff types with names or roles. `order ben drop journal` replaces JSON parameters at the console boundary. Move, wait and study accept their respective coordinates, duration or plan arguments, with arity and existing action validation. Typed simulation actions and queue semantics are unchanged; JSON orders are removed rather than retained as a compatibility format.

Application session state assigns stable @N labels to all pawns and oN labels to non-pawns. Both are accepted alongside IDs/aliases by the console. Labels survive entity removal and save/restore, and are not reused. The map widens uniformly for longer labels, preserving terrain and stacked-entity display. This affects the replacement CLI, not the archived browser.

Session version 2 adds phase, team, bindings and label counters; old session saves are discarded without migration. Pre-staffed integration trials/sandbox remain immediate-start scenarios, not deployment missions. No campaign roster, transport, unlimited reinforcements, arbitrary test spawn or equipment editor is added. Future campaign deployment must move actual personnel identities, not create template copies.

## Checks

Tests cover blocked entries, duplicate/invalid aliases, role and team limits, setup without ticks, required-role start checks, rejection after start, saved setup, @10 alignment, stable labels after removal, malformed plain orders without mutation, and SCP-1370 completion with an alternate deployed identity. Existing pass/fail transcripts use personal names, plain orders and explicit deploy/start lines, using the same CLI and quest evaluator.
