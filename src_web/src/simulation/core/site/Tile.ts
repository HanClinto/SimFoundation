export interface Tile {
  readonly blocksMovement: boolean;
  readonly blocksSight: boolean;
}

export const basicTiles: Readonly<Record<string, Tile>> = {
  ".": { blocksMovement: false, blocksSight: false },
  "#": { blocksMovement: true, blocksSight: true },
};
