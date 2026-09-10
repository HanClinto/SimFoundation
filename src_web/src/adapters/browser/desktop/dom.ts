export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

export function button(
  text: string,
  action: () => void,
  key = text,
): HTMLButtonElement {
  const node = element("button", "", text);
  node.type = "button";
  node.dataset.focusKey = key;
  node.addEventListener("click", action);
  return node;
}

export function iconButton(
  text: string,
  icon: string,
  action: () => void,
  key = text,
): HTMLButtonElement {
  const node = button("", action, key);
  node.classList.add("icon-button");
  const image = element("img");
  image.src = icon;
  image.alt = "";
  node.append(image, element("span", "", text));
  node.title = text;
  return node;
}

export function fieldset(
  title: string,
  ...children: Node[]
): HTMLFieldSetElement {
  const node = element("fieldset");
  node.append(element("legend", "", title), ...children);
  return node;
}

export function select(
  label: string,
  entries: readonly { value: string; label: string }[],
  value: string,
  change: (value: string) => void,
): HTMLLabelElement {
  const wrapper = element("label", "select-field");
  wrapper.append(element("span", "", label));
  const input = element("select");
  input.setAttribute("aria-label", label);
  input.dataset.focusKey = label;
  for (const entry of entries) {
    const option = element("option", "", entry.label);
    option.value = entry.value;
    input.append(option);
  }
  input.value = value;
  input.addEventListener("change", () => change(input.value));
  wrapper.append(input);
  return wrapper;
}

export function replaceContents(
  parent: HTMLElement,
  ...children: Node[]
): void {
  const active = document.activeElement;
  const key =
    active instanceof HTMLElement && parent.contains(active)
      ? active.dataset.focusKey
      : undefined;
  const scrollTop = parent.scrollTop;
  const details = new Map(
    [
      ...parent.querySelectorAll<HTMLDetailsElement>(
        "details[data-detail-key]",
      ),
    ].map((node) => [node.dataset.detailKey, node.open]),
  );
  parent.replaceChildren(...children);
  for (const node of parent.querySelectorAll<HTMLDetailsElement>(
    "details[data-detail-key]",
  )) {
    const open = details.get(node.dataset.detailKey);
    if (open !== undefined) node.open = open;
  }
  parent.scrollTop = scrollTop;
  if (key) {
    [...parent.querySelectorAll<HTMLElement>("[data-focus-key]")]
      .find((node) => node.dataset.focusKey === key)
      ?.focus({ preventScroll: true });
  }
}

export function table(
  headers: readonly string[],
  rows: readonly (readonly (string | Node)[])[],
): HTMLTableElement {
  const result = element("table", "ledger");
  const head = element("thead");
  const heading = element("tr");
  for (const text of headers) heading.append(element("th", "", text));
  head.append(heading);
  const body = element("tbody");
  for (const row of rows) {
    const tr = element("tr");
    for (const value of row) {
      const td = element("td");
      td.append(value);
      tr.append(td);
    }
    body.append(tr);
  }
  result.append(head, body);
  return result;
}
