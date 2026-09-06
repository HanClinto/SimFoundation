import type { GameController } from "../../application/controller";

export type SimulationSpeed = 1 | 2 | 4;

export interface BrowserRuntime {
  getSpeed(): SimulationSpeed;
  setSpeed(speed: SimulationSpeed): void;
  start(): void;
  stop(): void;
}

const BASE_TICK_DURATION_MS = 500;
const MAX_FRAME_DELTA_MS = 1_000;

export function createBrowserRuntime(
  controller: GameController,
  onFrame?: (visualTimeMs: number) => void,
): BrowserRuntime {
  let speed: SimulationSpeed = 1;
  let animationFrame: number | null = null;
  let previousTime: number | null = null;
  let accumulatedTime = 0;
  let visualTime = 0;
  let running = controller.getSnapshot().running;
  let unsubscribe: (() => void) | null = null;

  function frame(currentTime: number): void {
    if (previousTime !== null) {
      const frameDelta = Math.min(
        currentTime - previousTime,
        MAX_FRAME_DELTA_MS,
      );
      if (running) visualTime += frameDelta * speed;
      accumulatedTime = running ? accumulatedTime + frameDelta * speed : 0;
      const ticksDue = Math.floor(accumulatedTime / BASE_TICK_DURATION_MS);
      const initialSpeed = speed;
      for (let tick = 0; tick < ticksDue; tick += 1) {
        if (!running) {
          accumulatedTime = 0;
          break;
        }
        controller.advance();
        accumulatedTime -= BASE_TICK_DURATION_MS;
        if (!running || speed !== initialSpeed) {
          accumulatedTime = 0;
          break;
        }
      }
    }

    previousTime = currentTime;
    onFrame?.(visualTime);
    animationFrame = requestAnimationFrame(frame);
  }

  return {
    getSpeed() {
      return speed;
    },

    setSpeed(nextSpeed) {
      speed = nextSpeed;
    },

    start() {
      if (animationFrame !== null) return;
      running = controller.getSnapshot().running;
      unsubscribe = controller.subscribe((snapshot) => {
        running = snapshot.running;
      });
      animationFrame = requestAnimationFrame(frame);
    },

    stop() {
      if (animationFrame === null) return;
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
      previousTime = null;
      accumulatedTime = 0;
      unsubscribe?.();
      unsubscribe = null;
    },
  };
}
