function key(node: Node): string | null {
  if (!(node instanceof Element)) return null;
  return (
    node.getAttribute("data-focus-key") ??
    node.getAttribute("data-entity-id") ??
    node.getAttribute("data-tile")
  );
}

function update(existing: Node, proposed: Node): Node {
  if (
    existing.nodeType !== proposed.nodeType ||
    existing.nodeName !== proposed.nodeName ||
    key(existing) !== key(proposed)
  )
    return proposed;
  if (!(existing instanceof Element) || !(proposed instanceof Element)) {
    if (existing.nodeValue !== proposed.nodeValue)
      existing.nodeValue = proposed.nodeValue;
    return existing;
  }
  const open =
    existing instanceof HTMLDetailsElement ? existing.open : undefined;
  const value =
    proposed instanceof HTMLInputElement ||
    proposed instanceof HTMLSelectElement
      ? proposed.value
      : null;
  for (const attribute of [...existing.attributes]) {
    if (!proposed.hasAttribute(attribute.name))
      existing.removeAttribute(attribute.name);
  }
  for (const attribute of proposed.attributes) {
    if (existing.getAttribute(attribute.name) !== attribute.value)
      existing.setAttribute(attribute.name, attribute.value);
  }
  if (
    (existing instanceof HTMLElement && proposed instanceof HTMLElement) ||
    (existing instanceof SVGElement && proposed instanceof SVGElement)
  ) {
    existing.onclick = proposed.onclick;
    existing.onchange = proposed.onchange;
    existing.oninput = proposed.oninput;
    existing.onkeydown = proposed.onkeydown;
  }
  reconcileChildren(existing, [...proposed.childNodes]);
  if (
    existing instanceof HTMLInputElement &&
    proposed instanceof HTMLInputElement
  ) {
    if (document.activeElement !== existing) existing.value = value ?? "";
    existing.checked = proposed.checked;
  }
  if (
    existing instanceof HTMLSelectElement &&
    proposed instanceof HTMLSelectElement &&
    existing.value !== value
  )
    existing.value = value ?? "";
  if (existing instanceof HTMLDetailsElement && open !== undefined)
    existing.open = open;
  return existing;
}

// Keep live control nodes in place so ticks cannot swallow a pointer click or close a native select.
export function reconcileChildren(
  parent: Element,
  children: readonly Node[],
): void {
  const keyed = new Map(
    [...parent.childNodes].flatMap((node) => {
      const value = key(node);
      return value ? [[value, node] as const] : [];
    }),
  );
  for (const [index, proposed] of children.entries()) {
    const current = parent.childNodes[index];
    const proposedKey = key(proposed);
    const match = proposedKey ? keyed.get(proposedKey) : current;
    const result = match ? update(match, proposed) : proposed;
    if (result !== parent.childNodes[index])
      parent.insertBefore(result, parent.childNodes[index] ?? null);
  }
  while (parent.childNodes.length > children.length) parent.lastChild!.remove();
}
