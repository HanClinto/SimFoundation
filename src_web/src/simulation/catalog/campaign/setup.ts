import type { SiteTemplate } from "../../core/site/Site";
import type { Position } from "../../core/entity/Entity";
import { scp1867Scenario } from "../quests/scp1867/setup";
import { scp1370Scenario } from "../quests/scp1370/setup";
import { courierSite, courierInspection } from "./courier";
import { CorroborationBench } from "../quests/scp1867/collection";
import { returneeSite } from "../quests/scp507/setup";
import { triageSite } from "../quests/scp2295/setup";
import { dinerSite } from "../quests/scp1295/setup";
import { screeningSite } from "../quests/scp2006/setup";
import { storeSite } from "../quests/scp3008/setup";
import { accidentSite } from "./emergency";

export const home: SiteTemplate = {
  name: "Provisional Site: home",
  terrain: [
    "################",
    "#..............#",
    "#..........gggg#",
    "#.............g#",
    "#..........g..g#",
    "#..........gggg#",
    "#..............#",
    "#..............#",
    "#..............#",
    "################",
  ],
  tiles: { g: { blocksMovement: true, blocksSight: false } },
  entities: [
    {
      id: "parts",
      definitionId: "maintenance-parts",
      location: { kind: "ground", position: { x: 1, y: 6 } },
      overrides: { amount: 4 },
    },
    {
      id: "bear",
      definitionId: "scp-2295",
      location: { kind: "ground", position: { x: 6, y: 7 } },
    },
    {
      id: "textiles",
      definitionId: "textile-bundle",
      location: { kind: "ground", position: { x: 7, y: 7 } },
      overrides: { amount: 2 },
    },
    {
      id: "clinic",
      definitionId: "clinical-bed",
      location: { kind: "ground", position: { x: 4, y: 1 } },
    },
    {
      id: "clinical-packs",
      definitionId: "clinical-pack",
      location: { kind: "ground", position: { x: 5, y: 1 } },
      overrides: { amount: 4 },
    },
    {
      id: "guest-bed",
      definitionId: "bed",
      location: { kind: "ground", position: { x: 10, y: 2 } },
      overrides: { name: "Guest bed" },
    },
    {
      id: "review",
      definitionId: "returnee-review-station",
      location: { kind: "ground", position: { x: 10, y: 5 } },
    },
    {
      id: "case",
      definitionId: "specimen-case",
      location: { kind: "ground", position: { x: 4, y: 7 } },
    },
    {
      id: "machine",
      definitionId: "scp-294",
      location: { kind: "ground", position: { x: 8, y: 7 } },
    },
    {
      id: "coins",
      definitionId: "coin-allocation",
      location: { kind: "ground", position: { x: 7, y: 7 } },
      overrides: { amount: 8 },
    },
    {
      id: "sample-bench",
      definitionId: "sample-comparison-bench",
      location: { kind: "ground", position: { x: 8, y: 4 } },
    },
    {
      id: "water",
      definitionId: "water-reservoir",
      location: { kind: "ground", position: { x: 6, y: 4 } },
      overrides: { amount: 4 },
    },
    {
      id: "coffee",
      definitionId: "coffee-reservoir",
      location: { kind: "ground", position: { x: 6, y: 5 } },
      overrides: { amount: 3 },
    },
    {
      id: "tracer",
      definitionId: "tracer-reservoir",
      location: { kind: "ground", position: { x: 6, y: 3 } },
      overrides: { amount: 2 },
    },
    {
      id: "alex",
      definitionId: "field-agent",
      location: { kind: "ground", position: { x: 2, y: 2 } },
      overrides: { name: "alex", autonomy: false },
    },
    {
      id: "ben",
      definitionId: "researcher",
      location: { kind: "ground", position: { x: 3, y: 2 } },
      overrides: { name: "ben", autonomy: false },
    },
    {
      id: "casey",
      definitionId: "medic",
      location: { kind: "ground", position: { x: 4, y: 2 } },
      overrides: { name: "casey", autonomy: false },
    },
    {
      id: "bench",
      definitionId: "corroboration-bench",
      location: { kind: "ground", position: { x: 3, y: 4 } },
      overrides: {
        study: {
          plans: [
            ...CorroborationBench.defaults.study.plans,
            courierInspection,
          ],
          findings: [],
        },
      },
    },
    {
      id: "survey",
      definitionId: "independent-survey",
      location: { kind: "ground", position: { x: 2, y: 4 } },
    },
    {
      id: "lab",
      definitionId: "laboratory-dossier",
      location: { kind: "ground", position: { x: 4, y: 4 } },
    },
    {
      id: "display",
      definitionId: "exhibit-observation-station",
      location: { kind: "ground", position: { x: 13, y: 4 } },
    },
    {
      id: "display-door",
      definitionId: "automatic-steel-door",
      location: { kind: "ground", position: { x: 11, y: 3 } },
      overrides: { name: "Display bay door", blocksSight: false },
    },
    {
      id: "bed",
      definitionId: "bed",
      location: { kind: "ground", position: { x: 7, y: 2 } },
    },
    {
      id: "chair",
      definitionId: "armchair",
      location: { kind: "ground", position: { x: 8, y: 2 } },
    },
    {
      id: "meals",
      definitionId: "packaged-meal",
      location: { kind: "ground", position: { x: 5, y: 6 } },
      overrides: { amount: 8 },
    },
    {
      id: "transport",
      definitionId: "transport-docket",
      location: { kind: "ground", position: { x: 1, y: 7 } },
      overrides: { amount: 4 },
    },
    {
      id: "kit",
      definitionId: "survey-kit",
      location: { kind: "ground", position: { x: 5, y: 7 } },
    },
  ],
};

export interface Opportunity {
  name: string;
  briefing: string;
  site: SiteTemplate;
  loading: Position;
  pads: readonly Position[];
  duration: number;
  requiresFinding?: string;
  maximumPassengers?: number;
  loadingRadius?: number;
  daytimeReturn?: boolean;
}

export const homeLoading = { x: 2, y: 7 };
export const homePads = [homeLoading, { x: 3, y: 7 }];

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
      "Blackwood's corroborated finding authorizes this visit. Bring the field comparison kit for study station depot-survey. Recover finite meals or transport dockets from the cache; each carrier can hold only one object. The return is already funded. Returned dockets must be delivered beside home pad (2,7) before they fund later departures.",
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
          id: "dockets",
          definitionId: "transport-docket",
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
      "Rowan has uncontrolled bleeding: at blood loss100, twenty consecutive critical ticks cause permanent death. Send Casey promptly to treat, or dispatch the finite reserve medic Devon. Existing blood loss and wounds remain. If rescue is late, carry the actual body and its recorder home; no treatment resurrects it. The reserve command dispatches an existing responder via twelve ticks of transit, spending one of two reserved allocations; it is not a free replacement or automatic rescue.",
    site: accidentSite,
    loading: { x: 2, y: 3 },
    pads: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
    duration: 8,
  },
};
