import type { SessionController } from "../../application/SessionController";

export const SAVE_KEY = "simfoundation.web.session.v1";

export function saveSession(controller: SessionController): void {
  localStorage.setItem(SAVE_KEY, controller.serialize());
}

export function loadSavedSession(controller: SessionController): void {
  const text = localStorage.getItem(SAVE_KEY);
  if (!text)
    throw new Error(
      "No browser save exists. Use Save first, or import an exported session.",
    );
  controller.restore(text);
}

export function exportSession(controller: SessionController): void {
  const url = URL.createObjectURL(
    new Blob([controller.serialize()], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `simfoundation-tick-${controller.session.state.tick}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
