import { TileType } from '../config/tileProperties';
import { PowerUpType } from './EntityState';
import { WOOD_WALL_HP, WARDROBE_HP } from '../config/constants';

export enum FurnitureType {
  TABLE, CHAIR, WARDROBE, BOOKSHELF, BARREL, BED, RUG, CHANDELIER, ARMOR_STAND, BANNER,
  FIREPLACE, CAULDRON, BENCH, CRATE, WEAPON_RACK
}

/** Furniture types that block movement (solid objects on the floor). */
export const BLOCKING_FURNITURE = new Set<FurnitureType>([
  FurnitureType.TABLE, FurnitureType.CHAIR, FurnitureType.WARDROBE,
  FurnitureType.BOOKSHELF, FurnitureType.BARREL, FurnitureType.BED,
  FurnitureType.ARMOR_STAND, FurnitureType.CAULDRON, FurnitureType.BENCH,
  FurnitureType.CRATE, FurnitureType.WEAPON_RACK,
]);
// Non-blocking: RUG (flat on floor), CHANDELIER (overhead), BANNER (on wall), FIREPLACE (on wall)

export enum RoomType {
  THRONE_ROOM, BEDROOM, LIBRARY, STORAGE, ARMORY, DINING_HALL, COMMON, COURTYARD,
  KITCHEN, GREAT_HALL
}

export interface FurnitureState {
  x: number; y: number;
  type: FurnitureType;
  rotation: number;
  variant: number;
}

export interface BurningTileState {
  x: number;
  y: number;
  startTime: number;
}

export interface TorchState {
  x: number;
  y: number;
  lit: boolean;
}

export interface TreasureState {
  x: number;
  y: number;
  type: PowerUpType;
  collected: boolean;
}

/** Per-floor data for multi-floor levels. */
export interface FloorData {
  tiles: TileType[][];
  width: number;
  height: number;
  furniture: FurnitureState[];
  torches: TorchState[];
  treasures: TreasureState[];
  woodWallHP: Map<string, number>;
  burningTiles: Map<string, BurningTileState>;
  furnitureBlocked: Set<string>;
  wardrobeHP: Map<string, number>;
  brokenFurniture: Set<string>;
}

/** A stair connection between two floors. */
export interface StairConnection {
  fromFloor: number;
  fromX: number;
  fromY: number;
  toFloor: number;
  toX: number;
  toY: number;
}

export interface WorldState {
  tiles: TileType[][];
  width: number;
  height: number;
  woodWallHP: Map<string, number>;
  burningTiles: Map<string, BurningTileState>;
  treasures: TreasureState[];
  torches: TorchState[];
  furniture: FurnitureState[];
  furnitureBlocked: Set<string>;
  wardrobeHP: Map<string, number>;
  brokenFurniture: Set<string>;
  // Multi-floor support
  floors: FloorData[];
  currentFloor: number;
  stairs: StairConnection[];
}

export function createWorldState(
  tiles: TileType[][],
  width: number,
  height: number,
  treasurePositions: { x: number; y: number }[],
  torchPositions?: { x: number; y: number; lit: boolean }[],
  furniturePositions?: FurnitureState[],
  additionalFloors?: FloorData[],
  stairs?: StairConnection[]
): WorldState {
  const woodWallHP = new Map<string, number>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x] === TileType.WOOD_WALL) {
        woodWallHP.set(`${x},${y}`, WOOD_WALL_HP);
      }
    }
  }

  const wardrobeHP = new Map<string, number>();
  if (furniturePositions) {
    for (const f of furniturePositions) {
      if (f.type === FurnitureType.WARDROBE) {
        wardrobeHP.set(`${f.x},${f.y}`, WARDROBE_HP);
      }
    }
  }
  const brokenFurniture = new Set<string>();

  const powerUpTypes = Object.values(PowerUpType);
  const treasures: TreasureState[] = treasurePositions.map(pos => ({
    x: pos.x,
    y: pos.y,
    type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
    collected: false,
  }));

  const torches: TorchState[] = (torchPositions || []).map(t => ({
    x: t.x,
    y: t.y,
    lit: t.lit,
  }));

  // Build furniture blocking set
  const furnitureBlocked = new Set<string>();
  if (furniturePositions) {
    for (const f of furniturePositions) {
      if (BLOCKING_FURNITURE.has(f.type)) {
        furnitureBlocked.add(`${f.x},${f.y}`);
      }
    }
  }

  const tilesCopy = tiles.map(row => [...row]);

  // Build floor 0 data
  const floor0: FloorData = {
    tiles: tilesCopy,
    width,
    height,
    furniture: furniturePositions || [],
    torches,
    treasures,
    woodWallHP,
    burningTiles: new Map(),
    furnitureBlocked,
    wardrobeHP,
    brokenFurniture,
  };

  const floors: FloorData[] = [floor0, ...(additionalFloors || [])];

  return {
    tiles: tilesCopy,
    width,
    height,
    woodWallHP,
    burningTiles: new Map(),
    treasures,
    torches,
    furniture: furniturePositions || [],
    furnitureBlocked,
    wardrobeHP,
    brokenFurniture,
    floors,
    currentFloor: 0,
    stairs: stairs || [],
  };
}

/**
 * Switch the active floor data in WorldState.
 * Saves current floor state back to floors[] and loads the target floor.
 */
export function switchFloor(world: WorldState, floorIndex: number): void {
  if (floorIndex < 0 || floorIndex >= world.floors.length) return;
  if (floorIndex === world.currentFloor) return;

  // Save current floor state back
  const current = world.floors[world.currentFloor];
  current.tiles = world.tiles;
  current.woodWallHP = world.woodWallHP;
  current.burningTiles = world.burningTiles;
  current.treasures = world.treasures;
  current.torches = world.torches;
  current.furniture = world.furniture;
  current.furnitureBlocked = world.furnitureBlocked;
  current.wardrobeHP = world.wardrobeHP;
  current.brokenFurniture = world.brokenFurniture;

  // Load target floor
  const target = world.floors[floorIndex];
  world.tiles = target.tiles;
  world.width = target.width;
  world.height = target.height;
  world.woodWallHP = target.woodWallHP;
  world.burningTiles = target.burningTiles;
  world.treasures = target.treasures;
  world.torches = target.torches;
  world.furniture = target.furniture;
  world.furnitureBlocked = target.furnitureBlocked;
  world.wardrobeHP = target.wardrobeHP;
  world.brokenFurniture = target.brokenFurniture;
  world.currentFloor = floorIndex;
}
