import { KnightState, DragonStateData, DragonAIState, createKnightState, createDragonState } from './EntityState';
import { WorldState, createWorldState } from './WorldState';
import { LevelDefinition } from '../levels/LevelDefinition';
import {
  KNIGHT_MAX_HP, KNIGHT_BASE_ATTACK,
  DRAGON_FOV_RANGE, DRAGON_FOV_ANGLE,
} from '../config/constants';
import type { SupportedLanguage, AgeRange } from '../save/SaveSystem';
import type { WizardState } from './EntityState';

export interface GameSessionState {
  knight: KnightState;
  dragon: DragonStateData;
  world: WorldState;
  level: number;
  levelName: string;
  playerName: string;
  totalTreasures: number;
  time: number; // current game time in ms
  paused: boolean;
  language: SupportedLanguage;
  ageRange: AgeRange;
  wizard: WizardState | null;
}

export function createGameSession(
  levelDef: LevelDefinition,
  playerName: string,
  totalTreasures: number,
  knightMaxHP: number = KNIGHT_MAX_HP,
  knightBaseAttack: number = KNIGHT_BASE_ATTACK,
  language: SupportedLanguage = 'en',
  ageRange: AgeRange = 'adult',
  wizard: WizardState | null = null
): GameSessionState {
  return {
    knight: createKnightState(levelDef.knightSpawn.x, levelDef.knightSpawn.y, knightMaxHP, knightBaseAttack),
    dragon: createDragonState(
      levelDef.dragonSpawn.x, levelDef.dragonSpawn.y,
      levelDef.dragonHP,
      levelDef.dragonWaypoints,
      levelDef.dragonSpeedMultiplier,
      DRAGON_FOV_RANGE, DRAGON_FOV_ANGLE,
      levelDef.dragonFireDamageMultiplier,
      levelDef.dragonStartsPatrolling ? DragonAIState.PATROL : DragonAIState.SLEEP
    ),
    world: createWorldState(levelDef.tiles, levelDef.width, levelDef.height, levelDef.treasurePositions, levelDef.torchPositions),
    level: levelDef.level,
    levelName: levelDef.name,
    playerName,
    totalTreasures,
    time: 0,
    paused: false,
    language,
    ageRange,
    wizard,
  };
}
