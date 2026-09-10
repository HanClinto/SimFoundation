import type { ActionState } from "../../../simulation/core/entity/pawn/actions/Action";
import type { Site } from "../../../simulation/core/site/Site";
import { element } from "../desktop/dom";

export function workProgress(
  site: Site,
  action: ActionState,
): HTMLElement | null {
  if (!("workTicks" in action)) return null;
  const target = site.entities[action.targetId];
  let total: number | undefined;
  if (action.kind === "watch") total = action.ticks;
  if (action.kind === "study" && target?.kind === "facility")
    total = target.study?.plans.find(
      (plan) => plan.id === action.planId,
    )?.ticks;
  if (action.kind === "craft" && target?.kind === "facility")
    total = target.crafting?.recipes.find(
      (recipe) => recipe.id === action.recipeId,
    )?.ticks;
  if (
    ["sleep", "relax", "research", "read", "exercise"].includes(action.kind) &&
    target?.kind === "facility"
  ) {
    if (
      action.kind === "sleep" ||
      action.kind === "relax" ||
      action.kind === "research" ||
      action.kind === "read" ||
      action.kind === "exercise"
    )
      total = target.activities[action.kind]?.duration;
  }
  if (!total || total <= 0) return null;
  const wrapper = element("div", "work-progress");
  const bar = element("progress");
  bar.max = total;
  bar.value = Math.min(action.workTicks, total);
  bar.setAttribute("aria-label", `${action.kind} productive work`);
  wrapper.append(
    bar,
    element("small", "", `${action.workTicks} / ${total} productive ticks`),
  );
  return wrapper;
}
