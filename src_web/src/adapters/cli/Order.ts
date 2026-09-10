import type { ActionState } from "../../simulation/core/entity/pawn/actions/Action";

export function parseOrder(args: readonly string[]): ActionState {
  const [kind, target, extra] = args;
  const count = (expected: number, usage: string) => {
    if (args.length !== expected)
      throw new Error(`Use order <actor> ${usage}.`);
  };
  switch (kind) {
    case "pack":
      count(3, "pack <specimen> <case>");
      return { kind, targetId: target!, caseId: extra!, workTicks: 0 };
    case "unpack":
      count(2, "unpack <case>");
      return { kind, targetId: target!, workTicks: 0 };
    case "dispense":
      if (args.length !== 3 && args.length !== 4)
        throw new Error(
          "Use order <actor> dispense <machine> <request> [source].",
        );
      return {
        kind,
        targetId: target!,
        requestId: extra!,
        ...(args[3] ? { sourceId: args[3] } : {}),
        workTicks: 0,
      };
    case "escort":
    case "deliver":
      count(4, `${kind} <target> <x> <y>`);
      return {
        kind,
        targetId: target!,
        destination: { x: Number(extra), y: Number(args[3]) },
      };
    case "move":
      count(3, "move <x> <y>");
      return { kind, destination: { x: Number(target), y: Number(extra) } };
    case "wait":
      count(2, "wait <ticks>");
      return { kind, ticks: Number(target) };
    case "study":
      count(3, "study <station> <planId>");
      return { kind, targetId: target!, planId: extra!, workTicks: 0 };
    case "take":
    case "drop":
    case "eat":
    case "flee":
      count(2, `${kind} <target>`);
      return { kind, targetId: target! };
    case "sleep":
    case "relax":
    case "research":
    case "read":
    case "exercise":
    case "attack":
    case "treat":
      count(2, `${kind} <target>`);
      return { kind, targetId: target!, workTicks: 0 };
    default:
      throw new Error(`Unknown action kind: ${kind ?? "(missing)"}.`);
  }
}
