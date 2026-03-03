import { LevelDefinition } from './LevelDefinition';
import { TileType } from '../config/tileProperties';
import { TILT_FACTOR } from '../config/constants';
import type { FloorData, StairConnection } from '../state/WorldState';

/**
 * Pad a level definition so its tile grid fills the screen.
 *
 * The camera picks viewSize = max(W/(2*A), H/(2*TF)).
 * Whichever dimension is NOT the binding constraint has a gap.
 * We increase that deficient dimension to match the visible area,
 * which flips the constraint so the gap moves to the other dimension
 * but is reduced to a sub-tile rounding error (< 1 tile).
 *
 * The renderer clear color and ground plane handle any remaining
 * fractional-tile gap at the edges.
 */
export function padLevelToScreen(level: LevelDefinition): LevelDefinition {
  const aspect = window.innerWidth / window.innerHeight;

  const vsW = level.width / (2 * aspect);
  const vsH = level.height / (2 * TILT_FACTOR);

  let newWidth = level.width;
  let newHeight = level.height;

  if (vsH > vsW) {
    // Height is the binding constraint → width has empty space
    // Increase width to fill the visible area at the current viewSize (vsH)
    newWidth = Math.max(level.width, Math.ceil(vsH * 2 * aspect));
  } else {
    // Width is the binding constraint → height has empty space
    // Increase height to fill the visible area at the current viewSize (vsW)
    newHeight = Math.max(level.height, Math.ceil(vsW * 2 * TILT_FACTOR));
  }

  if (newWidth === level.width && newHeight === level.height) {
    return level;
  }

  const offsetX = Math.floor((newWidth - level.width) / 2);
  const offsetY = Math.floor((newHeight - level.height) / 2);

  // Create new tile grid, padded with walls
  const newTiles: TileType[][] = [];
  for (let y = 0; y < newHeight; y++) {
    newTiles[y] = [];
    for (let x = 0; x < newWidth; x++) {
      const srcX = x - offsetX;
      const srcY = y - offsetY;
      if (srcX >= 0 && srcX < level.width && srcY >= 0 && srcY < level.height) {
        newTiles[y][x] = level.tiles[srcY][srcX];
      } else {
        newTiles[y][x] = TileType.WALL;
      }
    }
  }

  const offset = (pos: { x: number; y: number }) => ({
    x: pos.x + offsetX,
    y: pos.y + offsetY,
  });

  return {
    ...level,
    width: newWidth,
    height: newHeight,
    tiles: newTiles,
    knightSpawn: offset(level.knightSpawn),
    dragonSpawn: offset(level.dragonSpawn),
    dragonWaypoints: level.dragonWaypoints.map(offset),
    treasurePositions: level.treasurePositions.map(offset),
    torchPositions: level.torchPositions?.map(t => ({ ...t, ...offset(t) })),
    wizardSpawn: level.wizardSpawn ? offset(level.wizardSpawn) : undefined,
    furniturePositions: level.furniturePositions?.map(f => ({ ...f, ...offset(f) })),
    additionalFloors: level.additionalFloors?.map(floor => padFloorData(floor, newWidth, newHeight, offsetX, offsetY)),
    stairs: level.stairs?.map(s => ({
      ...s,
      fromX: s.fromX + offsetX,
      fromY: s.fromY + offsetY,
      toX: s.toX + offsetX,
      toY: s.toY + offsetY,
    })),
  };
}

function padFloorData(
  floor: FloorData,
  newWidth: number, newHeight: number,
  offsetX: number, offsetY: number
): FloorData {
  // Pad this floor's tiles to match the new dimensions
  const newTiles: TileType[][] = [];
  for (let y = 0; y < newHeight; y++) {
    newTiles[y] = [];
    for (let x = 0; x < newWidth; x++) {
      const srcX = x - offsetX;
      const srcY = y - offsetY;
      if (srcX >= 0 && srcX < floor.width && srcY >= 0 && srcY < floor.height) {
        newTiles[y][x] = floor.tiles[srcY][srcX];
      } else {
        newTiles[y][x] = TileType.WALL;
      }
    }
  }

  const offset = (pos: { x: number; y: number }) => ({
    x: pos.x + offsetX,
    y: pos.y + offsetY,
  });

  return {
    ...floor,
    tiles: newTiles,
    width: newWidth,
    height: newHeight,
    furniture: floor.furniture.map(f => ({ ...f, ...offset(f) })),
    torches: floor.torches.map(t => ({ ...t, ...offset(t) })),
    treasures: floor.treasures.map(t => ({ ...t, ...offset(t) })),
  };
}

/**
 * Compute the minimum level dimensions that fill the screen.
 * Used by the level generator to create appropriately-sized levels.
 */
export function computeMinLevelSize(): { width: number; height: number } {
  const aspect = window.innerWidth / window.innerHeight;
  const baseWidth = 20;
  const baseHeight = 15;

  const vsW = baseWidth / (2 * aspect);
  const vsH = baseHeight / (2 * TILT_FACTOR);

  if (vsH > vsW) {
    return { width: Math.ceil(vsH * 2 * aspect), height: baseHeight };
  } else {
    return { width: baseWidth, height: Math.ceil(vsW * 2 * TILT_FACTOR) };
  }
}
