import { LevelDefinition } from './LevelDefinition';
import { TileType as T } from '../config/tileProperties';
import { FurnitureType } from '../state/WorldState';

// 20x15 grid - Tutorial level with basic walls
const tiles: T[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,1],
  [1,1,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1,1,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,1,1,0,0,1,0,0,1,0,0,1,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,1],
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
    { x: 5, y: 2, lit: true },
    { x: 14, y: 1, lit: true },
    { x: 14, y: 2, lit: true },
    { x: 8, y: 3, lit: true },
    { x: 11, y: 3, lit: false },
    { x: 5, y: 6, lit: true },
    { x: 14, y: 6, lit: true },
    { x: 8, y: 9, lit: true },
    { x: 11, y: 9, lit: false },
  ],
  wizardSpawn: { x: 17, y: 13 },
  furniturePositions: [
    { x: 2, y: 8, type: FurnitureType.TABLE, rotation: 0, variant: 0 },
    { x: 3, y: 8, type: FurnitureType.CHAIR, rotation: Math.PI, variant: 0 },
    { x: 16, y: 2, type: FurnitureType.BARREL, rotation: 0, variant: 0 },
    { x: 5, y: 5, type: FurnitureType.BANNER, rotation: -Math.PI / 2, variant: 0 },
  ],
};
