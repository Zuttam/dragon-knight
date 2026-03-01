import { TileType } from '../config/tileProperties';
import { PowerUpType } from './EntityState';
import { WOOD_WALL_HP } from '../config/constants';

export interface BurningTileState {
  x: number;
  y: number;
  startTime: number;
}

export interface TreasureState {
  x: number;
  y: number;
  type: PowerUpType;
  collected: boolean;
}

export interface WorldState {
  tiles: TileType[][];
  width: number;
  height: number;
  woodWallHP: Map<string, number>;
  burningTiles: Map<string, BurningTileState>;
  treasures: TreasureState[];
}

export function createWorldState(
  tiles: TileType[][],
  width: number,
  height: number,
  treasurePositions: { x: number; y: number }[]
): WorldState {
  const woodWallHP = new Map<string, number>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x] === TileType.WOOD_WALL) {
        woodWallHP.set(`${x},${y}`, WOOD_WALL_HP);
      }
    }
  }

  const powerUpTypes = Object.values(PowerUpType);
  const treasures: TreasureState[] = treasurePositions.map(pos => ({
    x: pos.x,
    y: pos.y,
    type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
    collected: false,
  }));

  return {
    tiles: tiles.map(row => [...row]),
    width,
    height,
    woodWallHP,
    burningTiles: new Map(),
    treasures,
  };
}
