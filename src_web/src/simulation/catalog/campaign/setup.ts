import type { SiteTemplate } from "../../core/site/Site";
import type { Position } from "../../core/entity/Entity";
import { scp1867Scenario } from "../quests/scp1867/setup";
import { scp1370Scenario } from "../quests/scp1370/setup";
import { courierSite } from "./courier";
import { returneeSite } from "../quests/scp507/setup";
import { triageSite } from "../quests/scp2295/setup";
import { dinerSite } from "../quests/scp1295/setup";
import { screeningSite } from "../quests/scp2006/setup";
import { storeSite } from "../quests/scp3008/setup";
import { accidentSite } from "./emergency";
import { interventionSite } from "./intervention";
import { supportDepot } from "./SupportDepot";
import { scp173Site } from "../quests/scp173/setup";
import { eyePodSite } from "../quests/scp131/setup";
import { clockworkSite } from "../quests/scp914/setup";

export interface Opportunity {
  name: string;
  briefing: string;
  site: SiteTemplate;
  loading: Position;
  pads: readonly Position[];
  duration: number;
  requiresFinding?: string;
  findingSite?: string;
  maximumPassengers?: number;
  loadingRadius?: number;
  daytimeReturn?: boolean;
  fatalAfterTicks?: number;
}

export const opportunities: Readonly<Record<string, Opportunity>> = {
  blackwood: {
    name: "Blackwood collection outpost",
    briefing:
      "Recover the journal and preserved specimen for home comparison. Two carriers can bring both back in one trip; carried supplies use the same slots. Leave the unverified device isolated: its function is unknown. Home intake: journal (3,3), specimen (3,5), then study bench marsh-lead. Partial returns remain recoverable by revisiting the same outpost.",
    site: {
      ...scp1867Scenario.site,
      name: "Blackwood collection outpost",
      entities: scp1867Scenario.site.entities.filter((entry) =>
        ["journal", "specimen", "device"].includes(entry.id),
      ),
    },
    loading: { x: 2, y: 4 },
    pads: [
      { x: 2, y: 4 },
      { x: 2, y: 5 },
    ],
    duration: 8,
  },
  gallery: {
    name: "SCP-1370 gallery recovery",
    briefing:
      "Recover the intact, toppled exhibit without attacking it. Take it home to the glass bay at (13,3), study display safe-exhibit, and move outside so its door can close. The exhibit keeps its pawn identity. No hostile capture or living escort is required.",
    site: {
      ...scp1370Scenario.site,
      name: "SCP-1370 remote gallery",
      entities: scp1370Scenario.site.entities.filter(
        (entry) => entry.id !== "station",
      ),
    },
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
    duration: 6,
  },
  kestrel: {
    name: "Kestrel Marsh depot",
    briefing:
      "Blackwood's corroborated finding authorizes this visit. Bring the field comparison kit for study station depot-survey. Recover finite meals or maintenance packs (spares) from the cache; each carrier can hold only one object. Travel is reusable, but supplies never restock. Return spares beside a workshop or holding facility for real repairs and fallback.",
    requiresFinding: "marsh-lead",
    site: {
      name: "Kestrel Marsh depot",
      terrain: [
        "############",
        "#..........#",
        "#..........#",
        "#....#.....#",
        "#..........#",
        "#..........#",
        "############",
      ],
      entities: [
        {
          id: "station",
          definitionId: "kestrel-station",
          location: { kind: "ground", position: { x: 8, y: 3 } },
        },
        {
          id: "rations",
          definitionId: "packaged-meal",
          location: { kind: "ground", position: { x: 8, y: 1 } },
          overrides: { amount: 8 },
        },
        {
          id: "spares",
          definitionId: "maintenance-parts",
          location: { kind: "ground", position: { x: 9, y: 5 } },
          overrides: { amount: 3 },
        },
      ],
    },
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
    duration: 10,
  },
  care: {
    name: "Closing aid station: cooperative care transfer",
    briefing:
      "Mira, a cooperative adult, needs transfer to home care. Her wound continues bleeding while the site is unattended (0.1 blood loss/tick). Casey has two finite stabilization charges; send a medic rather than treating this as cargo collection. After treatment, order casey escort mira 2 3. Send home casey mira when both queues finish and both are at the loading area. At home, escort Mira to (6,2), then admit mira bed for ordinary rest. If she cannot walk, stabilize and carry her with an available responder; incapacitated people are not silently abandoned or healed.",
    site: {
      name: "Closing aid station",
      terrain: [
        "############",
        "#..........#",
        "#..........#",
        "#....#.....#",
        "#..........#",
        "#..........#",
        "############",
      ],
      entities: [
        {
          id: "mira",
          definitionId: "care-recipient",
          location: { kind: "ground", position: { x: 8, y: 3 } },
        },
        {
          id: "field-bed",
          definitionId: "bed",
          location: { kind: "ground", position: { x: 9, y: 4 } },
        },
      ],
    },
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
    duration: 8,
  },
  courier: {
    name: "Damaged-specimen courier",
    briefing:
      "Bring home case: the depot's damaged case cannot complete another seal. A carrier can bring one case and its nested specimen, not a separate loose item. At the depot, order alex pack vial case; prepare and return with the same case and vial. At home move alex 3 5, then unpack case near the bench and study courier-inspection. No repair or hazardous material effect is modeled; worn equipment and missed preparation are the logistics problem.",
    site: courierSite,
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
    duration: 7,
  },
  returnee: {
    name: "SCP-507 ordinary-world pickup",
    briefing:
      "Tommy is waiting for accompanied transport after an ordinary-world return. Bring case for the fragile local log; his personal flashlight travels with him. Pack log, escort tommy to (2,3), then send home alex tommy with the same people and carried tree. Person-only withdrawal is allowed but leaves evidence behind. At home, unpack log at (10,4), escort Tommy to (10,6), and study review returnee-review. Then escort him to (10,3) and admit tommy guest-bed. The record does not verify another reality. No involuntary shift or dangerous contact window is modeled.",
    site: returneeSite,
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
    duration: 9,
  },
  triage: {
    name: "SCP-2295 supported adult transfer",
    briefing:
      "Iris (29) and Owen (54) have major lung trauma and need carrying. Send two actual staff; each can carry one person. The home bear automatically chooses the youngest major-organ patient within two tiles. Lay textiles nearby to spare its finite self-fabric; unsupported brain trauma is not repaired. Bring Iris to (6,6) before Owen to (5,7). After replacement they remain postoperative, with other injuries and lost blood unchanged. Carry each to (4,2) by clinic for one real nurse course, then ordinary rest admission. Prioritize positioning and supplies, not a generic heal order.",
    site: triageSite,
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
    duration: 10,
  },
  diner: {
    name: "SCP-1295 remote diner service",
    briefing:
      "Support four retained regulars without removing them. Bring a food portion and one maintenance pack: for example take meals 4 and take parts 1 with two staff. Deliver both beside counter (8,4); assign alex counter to repair once and keep serving while you manage home. The worker uses normal food/rest routines too, so budget their meals. Completed service starts a 100-tick deadline; later lapses block the counter register until service resumes. The entrance remains open and no global anomaly effects are modeled. To withdraw, assign alex none, autonomy alex off, finish or cancel current work, then prepare/send home. Revisit does not restock anything.",
    site: dinerSite,
    loading: { x: 2, y: 4 },
    pads: [
      { x: 2, y: 4 },
      { x: 2, y: 5 },
    ],
    duration: 8,
  },
  screening: {
    name: "SCP-2006 curated hosting",
    briefing:
      "Each host must physically study rehearsal acting-rehearsal with the guide nearby. Then deliver an approved programme beside rig (8,5); service rig or assign a hosting duty. The audience must remain present. The three original approved prints are retained, but each counts only once; unreviewed footage is refused. Coverage lasts 160 ticks with 32 ticks of preparation lead time. Bring fresh food for a long staffing stay and train relief staff independently. This is bounded protocol work, not arbitrary shapeshifting or psychological simulation.",
    site: screeningSite,
    loading: { x: 2, y: 4 },
    pads: [
      { x: 2, y: 4 },
      { x: 2, y: 5 },
    ],
    duration: 8,
  },
  store: {
    name: "SCP-3008 bounded group evacuation",
    briefing:
      "First actual responder entry starts a persistent 120-tick day / 60-tick night cycle. The fixed authored exit accepts returns by day and reports the next reopening at night. Employees become hostile after closing, but impacts are capped below incapacity for this prototype. Nora can walk; Eli is a stabilized blood-loss casualty. Bring food and a maintenance pack to restore shelter at (10,2), then use its one real clinical pack for field care, or carry Eli home instead. Two cooperative passengers may leave with staff; assemble everyone within two tiles of (2,4). Escort to separate positions, rather than blocking another person's loading pad. Revisit does not reset people, supplies, repair or the cycle.",
    site: storeSite,
    loading: { x: 2, y: 4 },
    pads: [
      { x: 2, y: 4 },
      { x: 2, y: 5 },
    ],
    duration: 8,
    maximumPassengers: 2,
    loadingRadius: 2,
    daytimeReturn: true,
  },
  accident: {
    name: "Outpost accident and body recovery",
    briefing:
      "Rowan has uncontrolled bleeding: at blood loss100, twenty consecutive critical ticks cause permanent death. Prepare and send Casey promptly to treat. Existing blood loss and wounds remain. If rescue is late, a surviving colleague can carry the actual body and its recorder home; no treatment resurrects it. Only the ordinary starting roster is available.",
    site: accidentSite,
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
    duration: 8,
  },
  intervention: {
    name: "Equipment-backed intervention yard",
    briefing:
      "LETHAL-RISK OPT-IN: responders entering this route acquire a persistent twelve-critical-tick mortality rule. The hostile kinetic specimen causes bleeding injury. Equip suppressor/vest and carry a physical restraint; subdue, then restrain before live transport. A worker can physically close the initially open yard gate for isolation, provided its doorway is clear; it is not controlled intake. Prepare home holding with parts/power before contain. Safe holding permits band recovery and study, but upkeep expires; physical lockdown spends a finite part for eighty fallback ticks. Surviving staff can recover actual bodies and gear. Losing the entire starting roster leaves no replacements.",
    site: interventionSite,
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
    duration: 8,
    fatalAfterTicks: 12,
  },
  support: {
    name: "Verified containment support allocation",
    briefing:
      "The actual controlled-intake finding authorizes a finite regional cache, not automatic free procurement. Choose physical power, suppression, wound-care, maintenance stock or the single donated library. Two carriers cannot take every category in one trip. Travel is reusable but takes real time while all sites continue. Power funds holding service; suppression units fund rearm; placing the actual library at home enables ordinary shared reading. Removed supplies/furniture never respawn; no completion reward generates staff or equipment.",
    requiresFinding: "kinetic-intake",
    site: supportDepot,
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
    duration: 8,
  },
  statue: {
    name: "SCP-173 direct-watch maintenance",
    briefing:
      "The controlled kinetic-intake finding authorizes this more dangerous annex. Bring the three starting workers using two ordinary trips; no staff are created. Plan the site's coverage while they are away. Stage two observers at (4,1)/(4,5), order each watch subject 200, then step1 to activate. Open gate with the third worker and clear the doorway. Move observers one at a time to (10,3)/(9,4), reactivating each watch before moving the other. Admit the third person and close gate from inside, then service station or study station direct-watch-protocol. The work needs two other active observers beside the station. Never finish the safety watches to wait for a worker; finish that worker. Watches warn before duration/fatigue cutoff. Withdraw with overlapping coverage and physically close gate before releasing the last observers. One active observer freezes motion; losing all coverage through an open gate permits lethal attacks. The source is not portable or subdued by the kinetic instrument. Viewing gallery, turn movement, fatigue and short cleaning cadence are explicit abstractions; no image or automatic blink/camera model.",
    requiresFinding: "kinetic-intake",
    site: scp173Site,
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
    duration: 8,
    fatalAfterTicks: 1,
    maximumPassengers: 2,
  },
  companions: {
    name: "SCP-131 supervised companion trial",
    briefing:
      "The actual direct-watch-protocol finding at the retained statue annex authorizes this original supervised visit. Guide the two existing cooperative Eye Pods (pod-a/pod-b) to loading positions (2,2)/(2,4), then bring both with a real staff member. They are passengers, not new staff or inventory buffs. At the statue annex, their specifically authored unblinking gaze may supplement SCP-173 coverage while grounded, capable, in sight and near a visible conscious human (six tiles). They do not replace two HUMAN observers or the third maintenance worker. Keep human protocol, close gate before withdrawing people, and physically guide the pair out. No food/sleep upkeep is invented; full bonding, roaming, climbing, momentum and general warden duties are outside this trial. Their documented specific interaction is not a certified universal guard system.",
    requiresFinding: "direct-watch-protocol",
    findingSite: "statue",
    site: eyePodSite,
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ],
    duration: 8,
    maximumPassengers: 2,
  },
  clockwork: {
    name: "SCP-914 approved nonliving processing",
    briefing:
      "Actual kinetic-impact research authorizes this original bounded trial. Bring one real protective vest, including broken recovered gear, and unequip it before processing. order alex process machine coarse vest returns two maintenance packs; order alex process machine very-fine vest produces one thirty-reduction/hundred-wear shell. The goal handles delivery to intake (4,3), panel (5,3) and two winding ticks. Then the MACHINE owns sixty processing ticks while the operator is free to leave; finish alex only finishes activation, not the cycle. Inspect machine/status for due time; clear output (8,3) and retrieve the actual result. Input is irreversibly consumed on successful output, not cloned or healed. No output qualifies as another input. Only these authored nonliving trials are implemented; no arbitrary, biological, weapon or medical requests or images.",
    requiresFinding: "kinetic-impact",
    site: clockworkSite,
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
    duration: 8,
  },
};
