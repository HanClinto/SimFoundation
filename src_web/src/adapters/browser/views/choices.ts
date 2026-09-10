import type { ViewContext } from "./context";
import type { Entity } from "../../../simulation/core/entity/Entity";
import { element, select } from "../desktop/dom";

const values = new Map<string, string>();

export function entityChoice(
  context: ViewContext,
  label: string,
  candidates: readonly Entity[],
): { node: HTMLElement; id: string } {
  const key = `${context.subjectId}:${context.targetId}:${label}`;
  const saved = values.get(key);
  const id =
    candidates.find((entry) => entry.id === saved)?.id ??
    candidates[0]?.id ??
    "";
  return {
    id,
    node: select(
      label,
      candidates.length
        ? candidates.map((entry) => ({ value: entry.id, label: entry.name }))
        : [{ value: "", label: "None at this site" }],
      id,
      (value) => {
        values.set(key, value);
        context.act(() => {});
      },
    ),
  };
}

export function quantityChoice(
  context: ViewContext,
  label: string,
  initial = 1,
): { node: HTMLElement; value: number } {
  const key = `${context.subjectId}:${context.targetId}:${label}`;
  const value = Number(values.get(key) ?? initial);
  const wrapper = element("label", "select-field");
  const input = element("input");
  input.type = "number";
  input.min = "1";
  input.step = "1";
  input.value = String(value);
  input.dataset.focusKey = key;
  input.setAttribute("aria-label", label);
  input.addEventListener("change", () => {
    values.set(key, input.value);
    context.act(() => {});
  });
  wrapper.append(element("span", "", label), input);
  return { node: wrapper, value };
}
