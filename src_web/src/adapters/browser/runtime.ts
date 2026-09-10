import type { SessionController } from "../../application/SessionController";
import { firstAlarm } from "../../application/Alarms";

export function createRuntime(
  controller: SessionController,
  report: (message: string) => void,
  changed: () => void,
) {
  let running = false;
  let speed = 1;
  let last = performance.now();
  let elapsed = 0;
  controller.subscribe((_session, events) => {
    const alarm = firstAlarm(events);
    if (alarm) {
      running = false;
      elapsed = 0;
      report(
        `ALARM - ${alarm.kind}: ${alarm.reason ?? alarm.entityId}. Paused after the complete tick.`,
      );
      changed();
    }
  });
  const timer = window.setInterval(() => {
    const now = performance.now();
    const delta = now - last;
    last = now;
    if (!running) {
      elapsed = 0;
      return;
    }
    elapsed += Math.min(delta, 500) * speed;
    try {
      while (running && elapsed >= 250) {
        elapsed -= 250;
        controller.step();
      }
    } catch (error) {
      running = false;
      elapsed = 0;
      report(`Simulation stopped: ${String(error)}`);
      changed();
    }
  }, 50);
  return {
    get running() {
      return running;
    },
    get speed() {
      return speed;
    },
    setRunning(value: boolean) {
      running = value;
      elapsed = 0;
      last = performance.now();
      changed();
    },
    setSpeed(value: number) {
      speed = value;
      elapsed = 0;
      changed();
    },
    dispose() {
      clearInterval(timer);
    },
  };
}
