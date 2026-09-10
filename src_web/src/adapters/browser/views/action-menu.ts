import type { MenuEntry } from "../desktop/menu";
import { basicActionChoices, type ViewContext } from "./context";
import { entityArt } from "../map/art";
import recordsIcon from "../../browser_shared/assets/records.svg";
import workIcon from "../../browser_shared/assets/work-orders.svg";
import workerIcon from "../../browser_shared/assets/site-worker.svg";

export function actionMenu(context: ViewContext): MenuEntry[] {
  const target = context.site.entities[context.targetId ?? ""];
  const subject = context.site.entities[context.subjectId ?? ""];
  const entries: MenuEntry[] = [];
  if (subject?.kind === "pawn") {
    const grouped = new Map<string, MenuEntry[]>();
    for (const choice of basicActionChoices(context, target)) {
      const command = {
        kind: "enqueue" as const,
        siteId: context.site.id,
        entityId: subject.id,
        action: choice.action,
      };
      const preview = context.controller.preview(command);
      const entry: MenuEntry = {
        label: choice.label[0]!.toUpperCase() + choice.label.slice(1),
        icon: target ? (entityArt(target) ?? workIcon) : workIcon,
        disabledReason:
          preview.code === "rejected"
            ? (preview.reason ?? "Unavailable")
            : undefined,
        action: () =>
          context.act(
            () => context.controller.dispatch(command),
            `Queued: ${choice.label}. ${subject.name}'s existing work is retained.`,
          ),
      };
      if (!choice.group) entries.push(entry);
      else {
        let group = grouped.get(choice.group);
        if (!group) {
          group = [];
          grouped.set(choice.group, group);
          entries.push({
            label: choice.group,
            icon: recordsIcon,
            children: group,
          });
        }
        group.push(entry);
      }
    }
  }
  if (entries.length) entries.push({ separator: true });
  if (target) {
    entries.push({
      label: `Inspect ${target.name}`,
      icon: recordsIcon,
      action: () => context.inspect(target.id),
    });
    if (
      target.kind === "pawn" &&
      target.playerControllable &&
      target.id !== subject?.id
    )
      entries.push({
        label: `Control ${target.name}`,
        icon: entityArt(target) ?? workerIcon,
        action: () => context.control(target.id),
      });
  }
  return entries;
}
