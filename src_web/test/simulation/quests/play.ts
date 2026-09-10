import { expect } from "vitest";
import {
  stepSession,
  type ScenarioSession,
} from "../../../src/application/ScenarioSession";
import { executeCommand } from "../../../src/simulation/core/ControlPolicy";
import { materials } from "../../../src/simulation/catalog";
import type { ActionState } from "../../../src/simulation/core/entity/pawn/actions/Action";
import type { Pawn } from "../../../src/simulation/core/entity/pawn/Pawn";

export function order(
  session: ScenarioSession,
  actor: string,
  action: ActionState,
): ScenarioSession {
  const result = executeCommand(
    session.state,
    { kind: "enqueue", siteId: "site-1", entityId: `site-1:${actor}`, action },
    materials,
  );
  expect(result.code, result.reason ?? "Command rejected").toBe("accepted");
  return { ...session, state: result.state };
}

export function finish(
  session: ScenarioSession,
  actor: string,
  action: ActionState,
): ScenarioSession {
  let result = order(session, actor, action);
  for (let tick = 0; tick < 60; tick++) {
    if (
      !(result.state.sites["site-1"]!.entities[`site-1:${actor}`] as Pawn).queue
        .length
    )
      return result;
    result = stepSession(result, 1);
  }
  throw new Error(
    `Action did not finish: ${JSON.stringify((result.state.sites["site-1"]!.entities[`site-1:${actor}`] as Pawn).queue)}`,
  );
}

export function deliver(
  session: ScenarioSession,
  actor: string,
  target: string,
  x: number,
  y: number,
): ScenarioSession {
  let result = finish(session, actor, {
    kind: "take",
    targetId: `site-1:${target}`,
  });
  result = finish(result, actor, { kind: "move", destination: { x, y } });
  return finish(result, actor, { kind: "drop", targetId: `site-1:${target}` });
}
