import {
  loadScenario,
  restoreSession,
  stepSession,
  type ScenarioSession,
} from "./ScenarioSession";
import {
  commandSession,
  previewSessionCommand,
  travelSession,
  admitSession,
  reserveSession,
} from "./Commands";
import type { Command } from "../simulation/core/ControlPolicy";
import type { TickEvent } from "../simulation/core/Simulation";
import { finishCommitments } from "./Finish";

export class SessionController {
  private current: ScenarioSession;
  private listeners = new Set<
    (session: ScenarioSession, events: readonly Readonly<TickEvent>[]) => void
  >();

  constructor(session = loadScenario("campaign")) {
    this.current = session;
  }

  get session(): ScenarioSession {
    return this.current;
  }

  subscribe(
    listener: (
      session: ScenarioSession,
      events: readonly Readonly<TickEvent>[],
    ) => void,
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(
    session: ScenarioSession,
    events: readonly Readonly<TickEvent>[] = [],
  ): void {
    this.current = session;
    for (const listener of this.listeners) listener(session, events);
  }

  dispatch(command: Command): void {
    const result = commandSession(this.current, command);
    if (result.code === "rejected")
      throw new Error(result.reason ?? "Command rejected.");
    this.publish({ ...this.current, state: result.state });
  }

  preview(command: Command) {
    return previewSessionCommand(this.current, command);
  }

  step(): void {
    let current: readonly Readonly<TickEvent>[] = [];
    const session = stepSession(this.current, 1, (events) => {
      current = events;
    });
    this.publish(session, current);
  }

  finish(ids: readonly string[]): string {
    const result = finishCommitments(this.current, ids, true);
    this.publish(result.session, result.events);
    return `${result.elapsed} ticks. ${result.reason}`;
  }

  travel(
    originId: string,
    destination: string,
    ids: readonly string[],
    operation: "prepare" | "depart",
  ): void {
    this.publish(
      travelSession(this.current, originId, destination, ids, operation),
    );
  }

  previewTravel(originId: string, destination: string, ids: readonly string[]) {
    const proposed = travelSession(
      this.current,
      originId,
      destination,
      ids,
      "depart",
    );
    return Object.values(proposed.state.transfers).find(
      (transfer) => !this.current.state.transfers[transfer.id],
    )!;
  }

  admit(personId: string, bedId: string): void {
    this.publish(admitSession(this.current, personId, bedId));
  }
  reserve(destination: string, responder: string): void {
    this.publish(reserveSession(this.current, destination, responder));
  }
  fresh(): void {
    this.publish(loadScenario("campaign"));
  }
  serialize(): string {
    return JSON.stringify(this.current);
  }

  restore(text: string): void {
    const session = restoreSession(text);
    if (!session)
      throw new Error(
        "Invalid or incompatible session. Development saves are not migrated.",
      );
    this.publish(session);
  }
}
