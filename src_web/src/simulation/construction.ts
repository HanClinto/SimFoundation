import { authorizeJob, type SiteJob } from "./jobs";
import { surfacesForTile } from "./materials";
import type { GameState } from "./state";
import {
  reserveSupply,
  reservedObject,
  releaseObject,
  pickUpObject,
  putDownObject,
  consumeObject,
  objectFootprint,
} from "./objects";
import {
  findRoute,
  sameTile,
  tileAt,
  type TileKind,
  type TilePosition,
} from "./world";

export const LABORATORY_WIDTH = 9;
export const LABORATORY_HEIGHT = 7;
export const LABORATORY_MATERIAL_COST = 40;

export interface LaboratoryBlueprint {
  readonly id: string;
  readonly origin: TilePosition;
  readonly status:
    | "reserved"
    | "hauling"
    | "building"
    | "completed"
    | "cancelled";
  readonly haulJobId: string;
  readonly buildJobId: string;
  readonly commissionJobId: string;
  readonly blockedReason: string | null;
}

export interface ConstructionState {
  readonly availableMaterials: number;
  readonly stockpile: TilePosition;
  readonly nextBlueprintNumber: number;
  readonly blueprints: readonly LaboratoryBlueprint[];
}

export type ConstructionCode =
  | "placed"
  | "cancelled"
  | "out-of-bounds"
  | "overlap"
  | "occupied"
  | "insufficient-materials"
  | "unreachable"
  | "limit-reached"
  | "not-found"
  | "already-started";

export interface ConstructionResult {
  readonly code: ConstructionCode;
  readonly state: GameState;
}

export function createConstructionState(): ConstructionState {
  return {
    availableMaterials: 160,
    stockpile: { x: 67, y: 68 },
    nextBlueprintNumber: 1,
    blueprints: [],
  };
}

export function authorizeSiteWork(state: GameState, jobId: string): GameState {
  const job = state.jobs.find(({ id }) => id === jobId);
  if (!job) throw new Error(`Unknown job: ${jobId}`);
  if (job.status !== "proposed") return state;
  const objectOrder = state.objectOrders.find((order) => order.jobId === jobId);
  if (
    objectOrder &&
    Object.values(state.routines.activities).some(
      (activity) => activity.stationId === objectOrder.objectId,
    )
  )
    return state;
  return {
    ...state,
    jobs: state.jobs.map((entry) =>
      entry.id === job.id ? authorizeJob(entry, state.tick) : entry,
    ),
  };
}

export function laboratoryTiles(
  origin: TilePosition,
): readonly { readonly position: TilePosition; readonly tile: TileKind }[] {
  const tiles: { position: TilePosition; tile: TileKind }[] = [];
  for (let row = 0; row < LABORATORY_HEIGHT; row += 1) {
    for (let column = 0; column < LABORATORY_WIDTH; column += 1) {
      const perimeter =
        row === 0 ||
        row === LABORATORY_HEIGHT - 1 ||
        column === 0 ||
        column === LABORATORY_WIDTH - 1;
      tiles.push({
        position: { x: origin.x + column, y: origin.y + row },
        tile: row === 0 && column === 4 ? "door" : perimeter ? "wall" : "floor",
      });
    }
  }
  return tiles;
}

export function laboratoryWorkSite(origin: TilePosition): TilePosition {
  return { x: origin.x + 4, y: origin.y - 1 };
}

function includesPosition(
  blueprint: LaboratoryBlueprint,
  position: TilePosition,
): boolean {
  return (
    position.x >= blueprint.origin.x &&
    position.x < blueprint.origin.x + LABORATORY_WIDTH &&
    position.y >= blueprint.origin.y &&
    position.y < blueprint.origin.y + LABORATORY_HEIGHT
  );
}

export function validateLaboratoryPlacement(
  state: GameState,
  origin: TilePosition,
): ConstructionCode | null {
  const { map } = state.world;
  if (
    !Number.isInteger(origin.x) ||
    !Number.isInteger(origin.y) ||
    origin.x < 0 ||
    origin.y < 1 ||
    origin.x + LABORATORY_WIDTH > map.width ||
    origin.y + LABORATORY_HEIGHT > map.height
  )
    return "out-of-bounds";
  if (state.construction.blueprints.length >= 32) return "limit-reached";
  const tiles = laboratoryTiles(origin);
  if (
    state.environment.orders.some(
      (order) =>
        order.phase !== "completed" &&
        tiles.some((tile) => sameTile(tile.position, order.position)),
    )
  )
    return "overlap";
  const activeBlueprints = state.construction.blueprints.filter(
    ({ status }) => status !== "cancelled",
  );
  if (
    tiles.some(
      ({ position }) =>
        tileAt(map, position) !== "grass" ||
        activeBlueprints.some((blueprint) =>
          includesPosition(blueprint, position),
        ),
    )
  )
    return "overlap";
  if (
    Object.values(state.world.positions).some((position) =>
      tiles.some((tile) => sameTile(position, tile.position)),
    ) ||
    state.objects.items.some(
      (item) =>
        item.location.kind === "ground" &&
        objectFootprint(item, item.location.position).some((position) =>
          tiles.some((tile) => sameTile(tile.position, position)),
        ),
    )
  )
    return "occupied";
  const site = laboratoryWorkSite(origin);
  if (
    activeBlueprints.some(
      (blueprint) =>
        includesPosition(blueprint, site) ||
        tiles.some(({ position }) =>
          sameTile(position, laboratoryWorkSite(blueprint.origin)),
        ),
    )
  )
    return "overlap";
  if (state.construction.availableMaterials < LABORATORY_MATERIAL_COST)
    return "insufficient-materials";
  const supply = reserveSupply(
    state.objects,
    "materials",
    LABORATORY_MATERIAL_COST,
    state.construction.stockpile,
    "preview-annex",
    true,
  );
  if (!supply.objectId) return "insufficient-materials";
  const cargo = reservedObject(supply.store, "preview-annex")!;
  if (
    cargo.location.kind !== "ground" ||
    findRoute(map, cargo.location.position, site) === null
  )
    return "unreachable";
  return null;
}

function constructionJob(
  id: string,
  title: string,
  skillId: SiteJob["skillId"],
  workSite: TilePosition,
  tick: number,
  requiredProgress: number,
): SiteJob {
  return {
    id,
    title,
    description: "Approved laboratory annex work package.",
    skillId,
    priority: 40,
    xpPerTick: requiredProgress === 1 ? 0 : 1,
    preferredBiases: { mindMight: 1, receptiveResolute: 1 },
    status: "available",
    progress: 0,
    requiredProgress,
    assignedPersonId: null,
    assignmentReason: null,
    authorizedTick: tick,
    completedTick: null,
    workSite,
    requiredWorkerId: null,
  };
}

export function placeLaboratory(
  state: GameState,
  origin: TilePosition,
): ConstructionResult {
  const code = validateLaboratoryPlacement(state, origin);
  if (code) return { code, state };
  const number = state.construction.nextBlueprintNumber;
  const reserved = reserveSupply(
    state.objects,
    "materials",
    LABORATORY_MATERIAL_COST,
    state.construction.stockpile,
    `job-haul-lab-${number}`,
    true,
  );
  if (!reserved.objectId) return { code: "insufficient-materials", state };
  const blueprint: LaboratoryBlueprint = {
    id: `blueprint-lab-${number}`,
    origin: { ...origin },
    status: "reserved",
    haulJobId: `job-haul-lab-${number}`,
    buildJobId: `job-build-lab-${number}`,
    commissionJobId: `job-commission-lab-${number}`,
    blockedReason: null,
  };
  return {
    code: "placed",
    state: {
      ...state,
      objects: reserved.store,
      construction: {
        ...state.construction,
        availableMaterials:
          state.construction.availableMaterials - LABORATORY_MATERIAL_COST,
        nextBlueprintNumber: number + 1,
        blueprints: [...state.construction.blueprints, blueprint],
      },
      jobs: [
        ...state.jobs,
        constructionJob(
          blueprint.haulJobId,
          `Collect annex ${number} materials`,
          "logistics",
          (() => {
            const cargo = reservedObject(reserved.store, blueprint.haulJobId)!;
            return cargo.location.kind === "ground"
              ? cargo.location.position
              : state.construction.stockpile;
          })(),
          state.tick,
          1,
        ),
      ],
    },
  };
}

export function cancelLaboratory(
  state: GameState,
  blueprintId: string,
): ConstructionResult {
  const blueprint = state.construction.blueprints.find(
    ({ id }) => id === blueprintId,
  );
  if (!blueprint) return { code: "not-found", state };
  if (blueprint.status !== "reserved")
    return { code: "already-started", state };
  const cargo = reservedObject(state.objects, blueprint.haulJobId);
  return {
    code: "cancelled",
    state: {
      ...state,
      objects: cargo
        ? releaseObject(state.objects, cargo.id, blueprint.haulJobId)
        : state.objects,
      construction: {
        ...state.construction,
        availableMaterials:
          state.construction.availableMaterials + LABORATORY_MATERIAL_COST,
        blueprints: state.construction.blueprints.map((entry) =>
          entry.id === blueprint.id ? { ...entry, status: "cancelled" } : entry,
        ),
      },
      jobs: state.jobs.filter(({ id }) => id !== blueprint.haulJobId),
      personnel: state.personnel.map((person) =>
        person.currentJobId === blueprint.haulJobId
          ? { ...person, currentJobId: null, activity: person.defaultActivity }
          : person,
      ),
    },
  };
}

export function advanceConstruction(state: GameState): GameState {
  let objects = state.objects;
  let jobs = [...state.jobs];
  let personnel = [...state.personnel];
  let map = state.world.map;
  const blueprints = state.construction.blueprints.map(
    (blueprint): LaboratoryBlueprint => {
      const haulJob = jobs.find(({ id }) => id === blueprint.haulJobId);
      if (blueprint.status === "reserved" && haulJob?.status === "completed") {
        const cargo = reservedObject(objects, haulJob.id);
        const carrier = haulJob.assignedPersonId;
        if (!cargo || !carrier)
          return {
            ...blueprint,
            blockedReason: "Waiting for physical materials and a carrier.",
          };
        const picked = pickUpObject(
          objects,
          cargo.id,
          haulJob.id,
          carrier,
          state.world.positions[carrier]!,
        );
        if (picked === objects)
          return { ...blueprint, blockedReason: "Materials pickup blocked." };
        objects = picked;
        jobs = jobs.map((job) =>
          job.id === haulJob.id
            ? {
                ...job,
                title: job.title.replace("Collect", "Deliver"),
                status: "in-progress",
                progress: 0,
                completedTick: null,
                workSite: laboratoryWorkSite(blueprint.origin),
                requiredWorkerId: haulJob.assignedPersonId,
              }
            : job,
        );
        personnel = personnel.map((person) =>
          person.id === haulJob.assignedPersonId
            ? {
                ...person,
                currentJobId: haulJob.id,
                activity: "Delivering laboratory materials",
              }
            : person,
        );
        return { ...blueprint, status: "hauling" };
      }
      if (blueprint.status === "hauling" && haulJob?.status === "completed") {
        const cargo = reservedObject(objects, haulJob.id);
        const carrier = haulJob.assignedPersonId;
        if (!cargo || !carrier)
          return {
            ...blueprint,
            blockedReason: "Waiting for materials carrier.",
          };
        const delivered = putDownObject(
          objects,
          cargo.id,
          haulJob.id,
          carrier,
          haulJob.workSite,
          state.world.positions[carrier]!,
        );
        if (delivered === objects)
          return {
            ...blueprint,
            blockedReason: "Materials must reach the annex.",
          };
        objects = delivered;
        jobs.push(
          constructionJob(
            blueprint.buildJobId,
            `Construct laboratory annex ${blueprint.id.split("-").at(-1)}`,
            "engineering",
            laboratoryWorkSite(blueprint.origin),
            state.tick,
            112,
          ),
        );
        return { ...blueprint, status: "building" };
      }
      if (
        blueprint.status !== "building" ||
        jobs.find(({ id }) => id === blueprint.buildJobId)?.status !==
          "completed"
      )
        return blueprint;
      const replacementTiles = laboratoryTiles(blueprint.origin);
      if (
        replacementTiles.some(
          ({ position, tile }) =>
            tile === "wall" &&
            (state.objects.items.some(
              (item) =>
                item.location.kind === "ground" &&
                objectFootprint(item, item.location.position).some((tile) =>
                  sameTile(tile, position),
                ),
            ) ||
              Object.values(state.world.positions).some((occupant) =>
                sameTile(position, occupant),
              )),
        )
      )
        return {
          ...blueprint,
          blockedReason:
            "Final assembly awaits clearance of the wall footprint.",
        };
      const tiles = [...map.tiles];
      const cargo = reservedObject(objects, blueprint.haulJobId);
      if (!cargo)
        return { ...blueprint, blockedReason: "Delivered materials missing." };
      const consumed = consumeObject(
        objects,
        cargo.id,
        blueprint.haulJobId,
        laboratoryWorkSite(blueprint.origin),
      );
      if (consumed === objects)
        return {
          ...blueprint,
          blockedReason: "Materials must reach the annex.",
        };
      objects = consumed;
      const surfaces = { ...map.surfaces };
      const doorPolicies = { ...map.doorPolicies };
      for (const replacement of replacementTiles) {
        tiles[replacement.position.y * map.width + replacement.position.x] =
          replacement.tile;
        surfaces[replacement.position.y * map.width + replacement.position.x] =
          surfacesForTile(replacement.tile);
        if (replacement.tile === "door")
          doorPolicies[
            replacement.position.y * map.width + replacement.position.x
          ] = "automatic";
      }
      const number = blueprint.id.split("-").at(-1);
      map = {
        ...map,
        tiles,
        surfaces,
        doorPolicies,
        rooms: [
          ...map.rooms,
          {
            id: `room-${blueprint.id}`,
            name: `Laboratory Annex ${number}`,
            kind: "laboratory",
            ...blueprint.origin,
            width: LABORATORY_WIDTH,
            height: LABORATORY_HEIGHT,
          },
        ],
      };
      jobs.push(
        constructionJob(
          blueprint.commissionJobId,
          `Commission laboratory annex ${number}`,
          "research",
          { x: blueprint.origin.x + 4, y: blueprint.origin.y + 3 },
          state.tick,
          48,
        ),
      );
      return { ...blueprint, status: "completed", blockedReason: null };
    },
  );
  return {
    ...state,
    objects,
    jobs,
    personnel,
    world: { ...state.world, map },
    construction: { ...state.construction, blueprints },
  };
}
