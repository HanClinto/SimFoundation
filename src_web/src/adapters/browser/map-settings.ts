export type MapPerspective = "world" | "recorded";
export type MapBase = "site" | "materials";
export type MapOverlay =
  | "condition"
  | "rooms"
  | "objects"
  | "coverage"
  | "projects"
  | "activity"
  | "storage"
  | "spaces"
  | "exposure"
  | "effects";
export const DEFAULT_MAP_OVERLAYS: Readonly<Record<MapOverlay, boolean>> = {
  condition: false,
  rooms: true,
  objects: true,
  coverage: false,
  projects: true,
  activity: true,
  storage: false,
  spaces: false,
  exposure: false,
  effects: true,
};
