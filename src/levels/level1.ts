import { LevelDefinition } from './LevelDefinition';
import { TileType as T } from '../config/tileProperties';

// 20x15 grid - Tutorial level with basic walls and shadows
const tiles: T[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,2,2,1,0,0,0,0,0,0,0,1],
  [1,1,1,0,0,1,0,0,0,2,2,0,0,0,1,0,0,1,1,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,1,1,0,0,1,0,0,1,0,0,1,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,1,2,2,1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,2,2,1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export const level1: LevelDefinition = {
  level: 1,
  name: 'The Entrance Hall',
  width: 20,
  height: 15,
  tiles,
  knightSpawn: { x: 1, y: 13 },
  dragonSpawn: { x: 10, y: 4 },
  dragonWaypoints: [
    { x: 10, y: 4 },
    { x: 16, y: 4 },
    { x: 16, y: 10 },
    { x: 10, y: 10 },
  ],
  treasurePositions: [
    { x: 3, y: 2 },
    { x: 17, y: 7 },
    { x: 9, y: 11 },
  ],
  dragonHP: 75,
  dragonSpeedMultiplier: 0.75,
  dragonFireDamageMultiplier: 0.5,
  torchPositions: [
    { x: 5, y: 1, lit: true },
    { x: 14, y: 1, lit: false },
    { x: 5, y: 7, lit: true },
    { x: 14, y: 7, lit: false },
  ],
};
