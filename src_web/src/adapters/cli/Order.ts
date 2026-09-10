import type { ActionState } from "../../simulation/core/entity/pawn/actions/Action";

export function parseOrder(args: readonly string[]): ActionState {
  const [kind, target, extra] = args;
  const count = (expected: number, usage: string) => {
    if (args.length !== expected)
      throw new Error(`Use order <actor> ${usage}.`);
  };
  switch (kind) {
    case "rearm":
      count(2, "rearm <worn-tool>");
      return { kind, targetId: target!, workTicks: 0 };
    case "contain":
      count(3, "contain <subject> <cell>");
      return { kind, targetId: target!, cellId: extra!, workTicks: 0 };
    case "lockdown":
      count(2, "lockdown <cell>");
      return { kind, targetId: target!, workTicks: 0 };
    case "restrain":
      count(3, "restrain <subject> <restraint>");
      return { kind, targetId: target!, restraintId: extra!, workTicks: 0 };
    case "service":
      count(2, "service <counter>");
      return { kind, targetId: target!, workTicks: 0 };
    case "nurse":
      if (args.length !== 3 && !(args.length === 4 && args[3] === "wounds"))
        throw new Error(
          "Use order <worker> nurse <patient> <clinical-bed> [wounds].",
        );
      return {
        kind,
        targetId: target!,
        bedId: extra!,
        workTicks: 0,
        ...(args[3] === "wounds" ? { course: "wounds" as const } : {}),
      };
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
      if (args.length !== 2 && args.length !== 3)
        throw new Error("Use order <actor> take <target> [amount].");
      if (
        extra !== undefined &&
        (!Number.isFinite(Number(extra)) || Number(extra) <= 0)
      )
        throw new Error("Choose a positive finite supply quantity.");
      return {
        kind,
        targetId: target!,
        ...(extra !== undefined ? { amount: Number(extra) } : {}),
      };
    case "drop":
    case "equip":
    case "unequip":
    case "unrestrain":
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
    case "subdue":
      count(2, `${kind} <target>`);
      return { kind, targetId: target!, workTicks: 0 };
    default:
      throw new Error(`Unknown action kind: ${kind ?? "(missing)"}.`);
  }
}
