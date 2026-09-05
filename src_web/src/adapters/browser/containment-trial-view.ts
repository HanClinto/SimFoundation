import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import {
  BARRIER_MATERIALS,
  TRIAL_LOCATION,
  type BarrierMaterial,
  type TrialProtocol,
  type TrialCommandCode,
} from "../../simulation/containment-trial";
import chamberUrl from "./assets/an-001-chamber.svg";
import { recordAge } from "./personnel-records";

const messages: Record<TrialCommandCode, string> = {
  accepted: "Work package accepted.",
  busy: "An existing work package or trial must finish first.",
  "not-ready": "The test chamber is not ready for exposure.",
  "insufficient-supplies": "Insufficient trial material allowance.",
  "invalid-material": "Material not recognized.",
  "invalid-protocol": "Protocol not recognized.",
};

export function createContainmentTrialWindow(
  host: HTMLElement,
  controller: GameController,
  locate: () => void,
) {
  const element = document.createElement("section");
  element.id = "containment-study-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "AN-001 containment study");
  element.innerHTML = `<div class="title-bar"><div class="title-bar-text">Research Archive - AN-001</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body trial-study-body"><nav class="trial-index" aria-label="Study sections"><strong>AN-001</strong><button type="button" data-trial-page="case" aria-pressed="true">Case file</button><button type="button" data-trial-page="materials" aria-pressed="false">Materials</button><button type="button" data-trial-page="protocol" aria-pressed="false">Protocols</button><button type="button" data-trial-page="findings" aria-pressed="false">Findings</button><button type="button" data-trial-locate>Locate chamber</button></nav><div class="trial-document"><section data-trial-section="case"><header><small>PROVISIONAL INTERNAL DESIGNATION</small><h2>AN-001</h2><p class="trial-subtitle">The Chalk Knot</p></header><figure class="trial-illustration"><img src="${chamberUrl}" alt="Faceted mineral-like specimen inside a transparent bench-scale test chamber and secondary catch tray"/><figcaption>Prepared chamber / reference illustration</figcaption></figure><p>A pale, irregular aggregate submitted for material-compatibility review. Its response to prolonged barrier contact is not established.</p><p>Initial study is limited to a primary test barrier inside a secondary catch vessel. The vessel is not evidence that the specimen is suitable for ordinary facility containment.</p><dl class="trial-readings"><div><dt>Last observation</dt><dd data-trial-observed>None recorded</dd></div><div><dt>Recorded chamber state</dt><dd data-trial-phase>Unprepared</dd></div><div><dt>Recorded barrier integrity</dt><dd data-trial-integrity>Unassessed</dd></div></dl></section><section data-trial-section="materials" hidden><h2>Barrier Materials</h2><p>Supplier resistance ratings. Compatibility with AN-001 requires experimental evidence.</p><table class="data-table"><thead><tr><th>Material</th><th>Chemical resistance</th><th>Impact resistance</th><th>Kit cost</th></tr></thead><tbody>${Object.values(
    BARRIER_MATERIALS,
  )
    .map(
      (material) =>
        `<tr><td>${material.name}</td><td>${material.corrosionResistance}/10</td><td>${material.impactResistance}/10</td><td>${material.cost}</td></tr>`,
    )
    .join(
      "",
    )}</tbody></table><p>Layering improves resilience at a higher cost. A successful short exposure does not establish indefinite service life.</p></section><section data-trial-section="protocol" hidden><h2>Exposure Protocol</h2><p data-trial-supplies></p><fieldset><legend>Chamber preparation</legend><label>Barrier <select data-trial-material aria-label="Test barrier material">${Object.entries(
    BARRIER_MATERIALS,
  )
    .map(([id, material]) => `<option value="${id}">${material.name}</option>`)
    .join(
      "",
    )}</select></label><button type="button" data-trial-fit>Fit / replace barrier</button></fieldset><fieldset><legend>Authorized exposure</legend><label>Protocol <select data-trial-protocol aria-label="Containment trial protocol"><option value="passive">Passive contact / 24 minutes</option><option value="stimulated">Mechanical stimulus / 24 minutes</option></select></label><div class="field-row"><input type="checkbox" id="trial-auto-isolate" checked/><label for="trial-auto-isolate">Isolate at 30% remaining integrity</label></div><p>Without protective isolation, exposure continues to the time limit or primary barrier failure. The secondary vessel remains in place.</p><div class="dossier-actions"><button type="button" data-trial-authorize>Authorize trial</button><button type="button" data-trial-isolate>Isolate specimen</button></div></fieldset><p data-trial-order></p><p role="status" data-trial-feedback></p></section><section data-trial-section="findings" hidden><h2>Observations &amp; Revisions</h2><div data-trial-evidence></div></section></div></div><div class="resize-grip" aria-hidden="true"></div>`;
  host.append(element);
  const feedback = element.querySelector<HTMLElement>("[data-trial-feedback]")!;
  element.addEventListener("click", (event) => {
    const target = event.target as Element;
    const page =
      target.closest<HTMLElement>("[data-trial-page]")?.dataset.trialPage;
    if (page) {
      for (const button of element.querySelectorAll<HTMLElement>(
        "[data-trial-page]",
      ))
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.trialPage === page),
        );
      for (const section of element.querySelectorAll<HTMLElement>(
        "[data-trial-section]",
      ))
        section.hidden = section.dataset.trialSection !== page;
    }
    if (target.closest("[data-trial-locate]")) locate();
    if (target.closest("[data-trial-fit]")) {
      const result = controller.orderTrialBarrier(
        element.querySelector<HTMLSelectElement>("[data-trial-material]")!
          .value as BarrierMaterial,
      );
      feedback.textContent = messages[result.code];
      render(result.snapshot);
    }
    if (target.closest("[data-trial-authorize]")) {
      const result = controller.authorizeContainmentTrial(
        element.querySelector<HTMLSelectElement>("[data-trial-protocol]")!
          .value as TrialProtocol,
        element.querySelector<HTMLInputElement>("#trial-auto-isolate")!.checked,
      );
      feedback.textContent = messages[result.code];
      render(result.snapshot);
    }
    if (target.closest("[data-trial-isolate]")) {
      render(controller.isolateContainmentTrial());
      feedback.textContent = "Isolation command issued.";
    }
  });
  let evidenceSignature = "";
  function render(snapshot: ControllerSnapshot) {
    const trial = snapshot.game.containmentTrial;
    const reading = trial.lastReading;
    const live = snapshot.game.observations.visibleTiles.includes(
      TRIAL_LOCATION.y * snapshot.game.world.map.width + TRIAL_LOCATION.x,
    );
    element.querySelector("[data-trial-observed]")!.textContent = reading
      ? `${recordAge(snapshot.game.tick, reading.observedTick)}${live ? " / Current coverage" : " / Current state unknown"}`
      : "No chamber observation on record";
    element.querySelector("[data-trial-phase]")!.textContent =
      reading?.phase ?? "Unassessed";
    element.querySelector("[data-trial-integrity]")!.textContent = reading
      ? `${reading.integrity}% / ${BARRIER_MATERIALS[reading.material].name}`
      : "No recorded reading";
    element.querySelector("[data-trial-supplies]")!.textContent =
      `Material allowance: ${trial.supplyCredits} units remaining / ${trial.spentCredits} committed`;
    const work = snapshot.game.jobs.find(({ id }) => id === trial.workOrderId);
    element.querySelector("[data-trial-order]")!.textContent = work
      ? `${work.title} / ${work.assignedPersonId ? snapshot.game.personnel.find(({ id }) => id === work.assignedPersonId)?.name : (work.assignmentReason ?? "Awaiting assignment")}`
      : "No open preparation order";
    const signature = JSON.stringify(trial.evidence);
    if (signature !== evidenceSignature) {
      const container = element.querySelector("[data-trial-evidence]")!;
      container.replaceChildren(
        ...[...trial.evidence].reverse().map((evidence) => {
          const article = document.createElement("article");
          article.className = "trial-evidence";
          const superseded = trial.evidence.some(
            (entry) => entry.supersedes === evidence.id,
          );
          const header = document.createElement("strong");
          header.textContent = superseded
            ? "SUPERSEDED ASSUMPTION"
            : evidence.certainty === "observed"
              ? "OBSERVATION"
              : "PROVISIONAL";
          const label = document.createElement("p");
          label.textContent = evidence.label;
          const time = document.createElement("small");
          const minute =
            snapshot.game.gameMinute -
            snapshot.game.tick +
            evidence.recordedTick;
          time.textContent = `Recorded day ${Math.floor(minute / 1440) + 1}, ${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
          if (superseded) article.classList.add("superseded");
          article.append(header, label, time);
          return article;
        }),
      );
      if (!trial.evidence.length) {
        const empty = document.createElement("p");
        empty.textContent = "No experimental findings recorded.";
        container.append(empty);
      }
      evidenceSignature = signature;
    }
  }
  render(controller.getSnapshot());
  return { element, render };
}
