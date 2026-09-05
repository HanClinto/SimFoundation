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
): BrowserRuntime {
  let speed: SimulationSpeed = 1;
  let animationFrame: number | null = null;
  let previousTime: number | null = null;
  let accumulatedTime = 0;

  function frame(currentTime: number): void {
    if (previousTime !== null) {
      const frameDelta = Math.min(
        currentTime - previousTime,
        MAX_FRAME_DELTA_MS,
      );
      accumulatedTime += frameDelta * speed;
      const ticksDue = Math.floor(accumulatedTime / BASE_TICK_DURATION_MS);
      const initialSpeed = speed;
      for (let tick = 0; tick < ticksDue; tick += 1) {
        if (!controller.getSnapshot().running) {
          accumulatedTime = 0;
          break;
        }
        controller.advance();
        accumulatedTime -= BASE_TICK_DURATION_MS;
        if (!controller.getSnapshot().running || speed !== initialSpeed) {
          accumulatedTime = 0;
          break;
        }
      }
    }

    previousTime = currentTime;
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
      animationFrame = requestAnimationFrame(frame);
    },

    stop() {
      if (animationFrame === null) return;
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
      previousTime = null;
      accumulatedTime = 0;
    },
  };
}
