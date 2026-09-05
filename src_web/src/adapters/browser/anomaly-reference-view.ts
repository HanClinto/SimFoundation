import chamberUrl from "./assets/an-001-chamber.svg";

export function createAnomalyReference(host: HTMLElement, locate: () => void) {
  const element = document.createElement("section");
  element.id = "containment-study-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "AN-001 reference");
  element.innerHTML = `<div class="title-bar"><div class="title-bar-text">Research Archive - AN-001</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body trial-document"><h2>AN-001 / The Chalk Knot</h2><figure class="trial-illustration"><img src="${chamberUrl}" alt="Chalk Knot specimen reference"/><figcaption>Specimen reference</figcaption></figure><p>A stationary aggregate with a persistent corrosive contact field. Its enclosure is lined with ceramic; exposed floor finishes and structural surfaces require inspection.</p><p>Intact walls and sealed doors limit contact. Openings expose neighboring surfaces. Material compatibility does not establish indefinite containment.</p><button type="button" data-locate-source>Locate enclosure</button><button type="button" data-open-related-window="engineering-window">Engineering</button></div><div class="resize-grip" aria-hidden="true"></div>`;
  element
    .querySelector("[data-locate-source]")!
    .addEventListener("click", locate);
  host.append(element);
  return { element };
}
