# Development Personnel Visibility

## Context

The simulation is still being expanded and tuned. Assessment-gated health, mood, sanity and trait displays obscure the values being evaluated. The anomalous psychometrics branch has no production unlock path, and its trait evidence/assessment machinery is disconnected from actual play.

## Decision

Delete anomalous screening, its capability and policy, and its trait evidence/reveal model. Personnel roster/inspectors and medical charts display authoritative current state directly, including needs, preferences, traits and active effects. Dated ordinary clinical reports remain history, not a gate or replacement for current summaries.

Keep outward expression as an in-world behavior used by local perception, and keep the map's explicit World/Recorded projection. Opening a staff inspector is nevertheless a development inspection of live personnel state. Do not add new information hiding while tuning the basic simulation.

Schema 46 discards older saves. No migration or legacy record adapter is retained.

## Consequences

- Hidden traits and injuries are visible before examination; this loss of psychological fog is intentional.
- Ordinary clinical jobs still exercise clinician/patient movement and ownership, but they do not unlock inspector fields or claim to treat injuries.
- Clinical record types may be simplified further; retaining them now is a gameplay/workflow choice, not save compatibility.
- Scenario tests should check actual work and resource/ownership outcomes, not enforce secrecy or a particular UI sequence.

## Alternatives Deferred

A replacement research tree, generic knowledge registry and new assessment framework are unnecessary for this cleanup. Facility-based research will be designed around a concrete physical study action separately.
