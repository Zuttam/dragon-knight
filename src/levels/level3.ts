import { LevelDefinition } from './LevelDefinition';
import { TileType as T } from '../config/tileProperties';
import { FloorData, StairConnection } from '../state/WorldState';
import { PowerUpType } from '../state/EntityState';

// 30x20 grid - Wooden walls (destructible by fire)
// Stair at (12,3) leads to floor 1 (room above the central area)
const tiles: T[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,4,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,4,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,4,4,4,0,0,0,0,0,0,1],
  [1,0,0,0,4,0,0,0,0,3,0,0,11,0,0,0,3,0,0,0,4,0,4,0,0,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,1,1,0,0,1,0,0,0,4,0,4,0,0,1,0,1,0,1],
  [1,4,4,4,4,0,0,0,0,1,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,4,4,0,0,4,4,0,0,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,4,0,0,0,0,4,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,4,0,0,0,0,4,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,4,0,0,0,0,4,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,4,1,0,4,4,0,0,4,4,0,0,1,1,0,1],
  [1,4,4,0,0,4,4,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,3,0,0,0,0,0,0,0,0,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,4,4,0,0,0,0,1,0,0,1,0,0,0,0,0,0,1,0,0,4,4,4,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,1,0,0,4,0,4,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Floor 1: Small room above the central area
const floor1Tiles: T[][] = [];
for (let y = 0; y < 20; y++) {
  floor1Tiles[y] = new Array(30).fill(T.WALL);
}
// Carve a room at (10,1)-(15,5)
for (let y = 2; y <= 4; y++) {
  for (let x = 11; x <= 14; x++) {
    floor1Tiles[y][x] = T.FLOOR;
  }
}
// Stair entrance at (12,4) on floor 1
floor1Tiles[4][12] = T.STAIRS;

const floor1: FloorData = {
  tiles: floor1Tiles,
  width: 30,
  height: 20,
  furniture: [],
  torches: [],
  treasures: [
    { x: 13, y: 2, type: PowerUpType.SPEED_BOOST, collected: false },
    { x: 11, y: 3, type: PowerUpType.HEAL, collected: false },
  ],
  woodWallHP: new Map(),
  burningTiles: new Map(),
  furnitureBlocked: new Set(),
  wardrobeHP: new Map(),
  brokenFurniture: new Set(),
};

const level3Stairs: StairConnection[] = [
  { fromFloor: 0, fromX: 12, fromY: 3, toFloor: 1, toX: 12, toY: 4 },
  { fromFloor: 1, fromX: 12, fromY: 4, toFloor: 0, toX: 12, toY: 3 },
];

export const level3: LevelDefinition = {
  level: 3,
  name: 'The Burning Keep',
  width: 30,
  height: 20,
  tiles,
  knightSpawn: { x: 1, y: 18 },
  dragonSpawn: { x: 14, y: 9 },
  dragonWaypoints: [
    { x: 14, y: 9 },
    { x: 20, y: 5 },
    { x: 27, y: 5 },
    { x: 27, y: 14 },
    { x: 20, y: 14 },
    { x: 14, y: 14 },
    { x: 7, y: 14 },
    { x: 7, y: 5 },
  ],
  treasurePositions: [
    { x: 13, y: 5 },
    { x: 7, y: 8 },
    { x: 21, y: 2 },
    { x: 10, y: 15 },
    { x: 23, y: 16 },
    { x: 27, y: 12 },
  ],
  dragonHP: 140,
  dragonSpeedMultiplier: 1.15,
  dragonFireDamageMultiplier: 1.0,
  torchPositions: [
    { x: 9, y: 1, lit: true },
    { x: 9, y: 4, lit: true },
    { x: 16, y: 1, lit: true },
    { x: 12, y: 5, lit: false },
    { x: 16, y: 5, lit: true },
    { x: 25, y: 3, lit: true },
    { x: 6, y: 7, lit: true },
    { x: 9, y: 7, lit: true },
    { x: 26, y: 7, lit: true },
    { x: 26, y: 11, lit: false },
    { x: 12, y: 11, lit: true },
    { x: 16, y: 14, lit: true },
    { x: 9, y: 14, lit: true },
    { x: 9, y: 16, lit: false },
  ],
  wizardSpawn: { x: 20, y: 14 },
  additionalFloors: [floor1],
  stairs: level3Stairs,
};
