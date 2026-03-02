import { TileType } from '../config/tileProperties';

export interface LevelDefinition {
  level: number;
  name: string;
  width: number;
  height: number;
  tiles: TileType[][];
  knightSpawn: { x: number; y: number };
  dragonSpawn: { x: number; y: number };
  dragonWaypoints: { x: number; y: number }[];
  treasurePositions: { x: number; y: number }[];
  dragonHP: number;
  dragonSpeedMultiplier: number;
  dragonFireDamageMultiplier: number;
  torchPositions?: { x: number; y: number; lit: boolean }[];
  wizardSpawn?: { x: number; y: number };
  dragonStartsPatrolling?: boolean;
}
