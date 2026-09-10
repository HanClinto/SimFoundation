# SCP-507: Ordinary-World Retrieval

Adapted from [SCP-507](https://scp-wiki.wikidot.com/scp-507) by
**PennywiseTheClown**, SCP Wiki,
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
The [archived revision 44](../../../../../docs/references/scp-507/2026-09-09-revision-44.txt)
was reviewed before adaptation. Original scenario text is offered under the
same license; no source prose or images are copied into runtime.

## Source And Boundaries

SCP-507 is a cooperative person whose involuntary departures are reported as
alternate-world displacement. The article describes accompanied facility
movement, retrieval after distant reappearance, a personal flashlight and a
limited safe physical-test interval after return. Tommy is one of the listed
nicknames, not a new source identity.

This slice models only a newly returned contact waiting at an ordinary-world
pickup site. The signal log, cracked recorder sleeve, provisional home review
and one/two-staff transport capacity are original game abstractions. In
particular, the article's three-agent retrieval protocol is **not** claimed to
be fully implemented. Neither another shift, alternate geography, a fourteen-day
clock, dangerous touch, tracker network nor unrestricted dialogue is simulated.

The record supports local arrival only; a completed review does not prove an
alternate-world account or authorize a dimensional expedition. The flashlight
is real retained personal cargo, but lighting and batteries are not modeled.

## Play

`brief returnee` explains the opportunity. Bring the actual home `case` for the
fragile `log`. At the field site:

```text
order alex pack log case
step 20
order alex escort tommy 2 3
step 24
send home alex tommy
step 9
site home
```

The living passenger walks on his own turns. His flashlight stays carried by
him. The responder's case separately owns the log. Shared transfer therefore
preserves five records, not a passenger token plus invented cargo.

At home, unpack the log at (10,4), escort Tommy to (10,6), and
`order alex study review returnee-review`. Existing physical study requires
both the actual returnee and the exposed log beside the station. A person-only
withdrawal is legal and leaves the original log at the unchanged field site;
the review explains what evidence is missing.

After review, escort Tommy to (10,3) and `admit tommy guest-bed` for ordinary
rest. Admission creates no new staff member and erases no health state. Choosing
rest before review may require arranging his presence at the station later;
the review does not teleport or immobilize him.

The [complete command walkthrough](tests/return-and-review.txt) is test-only:

```sh
npm run sim < src/simulation/catalog/quests/scp507/tests/return-and-review.txt
```

Session version 6 discards older campaign saves, whose site catalog and case
protocol lack this opportunity. Core mechanics remain at version 14.
