# Direct Person Control And Action Ownership

Status: M0 contract and M1/M2 implementation, 2026-09-08. Parent: [#23](https://github.com/HanClinto/SimFoundation/issues/23).

## Principles

The map owns immediate personal orders. A person is the actor; a clicked object, tile or person is the target. Actor selection, target inspection, camera follow and construction placement have separate identities and lifecycles. Selection never drafts a person. Inspecting a target never issues work or replaces an existing actor. Portraits always offer explicit actor selection.

Keep the 98.css modeless desktop, existing object/dossier inspection, physical execution and World/Recorded boundaries. Operations windows retain planning, manifests, dispatch and reporting. Construction and facility relocation retain their placement previews. The interaction model borrows familiar life-simulation controls, not copyrighted assets or a different visual theme.

## Input Contract

- With no actor, clicking a present pawn selects them. Clicking their portrait always selects them. With an actor already selected, clicking another person changes only the inspection target until explicit portrait selection or contextual Select Person.
- Clicking a target opens its applicable interactions; Go Here on ground submits once, without preview/confirmation or opening an operations window. Inspect remains a separate command. A double-click only inspects: first-click menu creation must never itself execute an action.
- Dragging pans, wheel zooms, and construction placement takes input precedence. Escape closes an interaction menu before considering placement cancellation. It does not cancel movement. Enter on an inspected tile opens its interaction menu; Shift+F10 or the context-menu key opens interactions for the inspected target, falling back to ground at map center. Arrow menu navigation and Enter activate commands without pointer input.
- Actor selection persists within a map's browser lifetime and is cleared when the actor leaves or the location changes. It is not serialized as gameplay state. Follow is pinned to the target selected when Follow is enabled; inspecting another target does not retarget it. Existing explicit navigation still releases Follow.
- Recorded controls are inspection-only. No direct movement command is inferred from an unknown tile or remembered person. World mode requests authoritative eligibility and revalidates at submission.

## Manual Ownership

M1 uses the existing single tactical movement executor. `goHere(mapId, personId, destination)` validates map identity, physical presence, field phase and recovery ownership. It atomically drafts an undrafted base person, issues physical movement, and marks temporary ownership with `returnToAutonomy`. Invalid destinations cannot draft or interrupt someone as a side effect. Cargo carriers, clinical commitments, incapacitation and expedition assembly retain their existing protections.

After physical arrival and any retained action recovery, temporary ownership returns to routine autonomy on the next tick if the normal release checks permit it. Already-drafted staff remain drafted and hold after arrival. Replacing a temporary Go Here retains temporary ownership. Explicit tactical or expedition orders take ownership and clear the temporary-release flag. No supplies, equipment, injuries or cooldowns are reset. A newly blocked route keeps the current command with its reason; it does not silently resume work elsewhere.

Schema 39 records the optional temporary-ownership flag. Old development saves are not migrated. This is not a queue implementation. M1 replaces a single current action and must not show fictitious pending entries or advertise queue commands.

## Contextual Actions (M2)

`interactions.ts` supplies presentation-independent action descriptors, authoritative eligibility and execution. The controller exposes `interactions`, `previewInteraction` and `interact`; requests include map identity, actor, verb and target. Preview runs the same immutable decision path as execution without publishing or retaining reservations. Submission revalidates against current state. Field results are projected through the existing field adapter; only root state is saved.

The map reuses the existing 98.css `ul.menu` extension. This is a provisional presentation choice, not a dependency on a list or radial layout. Keyed buttons retain identity while an open menu updates disabled reasons. Ground/self offers Hold Position; another person offers Stabilize; the live adversary offers Engage From Here; recoverable field objects offer Recover to Extraction. Every target retains Inspect, with Select Person where applicable. Unsupported personal object-use verbs are not invented. Recorded mode exposes no live target-action descriptors.

Hold and Engage From Here explicitly take drafted ownership. Stabilize temporarily drafts an otherwise autonomous person and returns them to autonomy after physical treatment and recovery when normal release rules permit; existing drafted staff remain drafted. Engage From Here does not approach: range/LOS block reasons remain visible on the current action, and Attack approach belongs to M3.

The pawn strip describes the actual current action, preparation/recovery and blocked reason. Cancel Current Action stops movement, engagement or treatment through the tactical owner without resetting recovery or refunding ammunition/kits. Temporary ownership is retained for normal release; explicit draft mode is retained. Idle explicit Hold has no active execution to cancel, and release remains in Orders until the autonomy milestone. Field recovery cancellation releases its reservation and puts carried cargo on the actor's actual tile. Ordinary reserved deliveries, active clinical appointments, incapacitation and mission-owned phases remain protected with reasons. There is no speculative queue, new cargo state or schema version in M2; schema 39 validation now permits temporary stabilization as well as movement/hold.

## Queue Contract For Later Milestones

M2 adds target-specific interactions and visible current-action cancellation. M3 adds Attack approach with distinct hold-position engagement. M4 adds a bounded manual queue; default interaction appends, with explicit Do Now (safe replacement) and Clear Pending. Queued entries acquire no speculative long-lived reservations. The active entry delegates to its existing domain owner and stores only the identity needed to track completion, not duplicate execution progress or cargo.

Go Here completes at physical arrival. Attack repeats until target defeat, cancellation or terminal failure. Stabilize completes after actual treatment; Recover completes after delivery. Hold is persistent: a newly requested action explicitly replaces the idle Hold posture rather than waiting forever behind it. A failed or blocked active interaction must expose Retry/Skip/Cancel as appropriate, not silently execute a potentially hazardous next action. Recovery/cargo cancellation follows the owning system's safe boundary and cannot refund spent resources or bypass action recovery.

Player actions take precedence over optional autonomous discovery at safe boundaries. Protected cargo, appointments, incapacity and mission-owned phases remain exceptions with visible reasons. Map transfer/disposal invalidates location-bound pending intentions; no coordinates are reinterpreted on another map. These policies require execution and persistence tests before enabling multiple entries.

## Audited Verb/Owner Matrix

| Intent                           | Owner now                           | Preconditions / approach                                                      | Completion / cancellation                                                  | M1 treatment                                               |
| -------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Go Here                          | direct-control -> tactical movement | Present at named map; route exists; safe drafting or field roster; real doors | Arrival; temporary autonomy resumes after recovery; blocked route retained | New direct map menu, one replaceable action                |
| Hold / Retreat                   | combat                              | Drafted and available; retreat uses pathfinding                               | Hold persists; new command preserves recovery                              | Existing inspector controls retained                       |
| Engage                           | combat                              | Enrolled target, range, LOS, ammunition; no approach yet                      | Repeated attacks; stop/fail according to current rules                     | Unchanged; M3 replaces player-facing Attack with approach  |
| Stabilize                        | combat                              | Eligible casualty, kit; physical approach                                     | Six treatment steps; kit consumed at completion; recovery retained         | Existing owner retained; target menu comes in M2           |
| Field Recover                    | expeditions                         | Field roster; exclusive object reservation; physical handling/carry           | Actual extraction delivery; cancel puts held object down at carrier        | Direct Go Here rejects competing ownership                 |
| Routine work / needs             | routines, jobs                      | Schedule/qualification/need and reservations                                  | Existing work completion; protected appointments/cargo                     | Temporary control interrupts only via existing draft rules |
| Object relocation / installation | object-work                         | Physical object reservation; footprint and route                              | Delivery/install; existing cancellation rules                              | Keep placement confirmation; not a personal Go Here        |
| Door policy                      | world/controller                    | Correct map and safe obstruction checks                                       | Immediate administrative policy update                                     | Existing tile controls; not mislabeled as pawn interaction |
| Expedition assemble / recall     | expeditions                         | Team eligibility, cargo/casualty safety                                       | Physical regroup plus transfer                                             | Mission ownership overrides personal routing               |
| Inspect                          | browser records                     | Target available in selected perspective                                      | No simulation action or resource mutation                                  | Double-click unchanged, independent actor                  |

## Baseline And Acceptance

Source-audited old sequence for selected-person movement: open Orders window, choose responder if needed, choose Move, return to map preview, pin target, Confirm. Stabilize already includes approach, Engage does not; Recover delegates to exclusive expedition handling. Queue length is one overwritten order, not a pending-action list.

M1 target: portrait selection, then ground click and Go Here. After actor selection: two clicks, zero window switches, zero placement confirmations. Validate on base and field maps, with paused issuance, real door traversal, temporary autonomy restoration, independently pinned Follow, double-click inspection, drag pan, keyboard menus, unavailable people, invalid/stale locations and protected ownership. Further milestone acceptance remains in #23.
