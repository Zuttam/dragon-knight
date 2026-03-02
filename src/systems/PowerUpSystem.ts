import { KnightState, PowerUpType, ActivePowerUp, heal } from '../state/EntityState';
import { TreasureState } from '../state/WorldState';
import { distance } from '../core/MathUtils';
import {
  POWERUP_HEAL_AMOUNT,
  POWERUP_ATTACK_BOOST,
  POWERUP_SPEED_BOOST,
  POWERUP_CLOAK_DURATION,
  POWERUP_FIRE_RESIST_DURATION,
  POWERUP_FIRE_RESIST_MULTIPLIER,
  POWERUP_HP_BOOST_AMOUNT,
  WIZARD_HEAL_AMOUNT,
  WIZARD_ATTACK_BOOST,
  WIZARD_SPEED_BOOST,
  WIZARD_CLOAK_DURATION,
  WIZARD_FIRE_RESIST_DURATION,
  WIZARD_HP_BOOST_AMOUNT,
  WIZARD_REWARD_DURATION,
} from '../config/constants';

interface PowerUpOverrides {
  healAmount?: number;
  attackMultiplier?: number;
  attackDuration?: number;
  speedMultiplier?: number;
  speedDuration?: number;
  cloakDuration?: number;
  fireResistDuration?: number;
  hpBoostAmount?: number;
}

export class PowerUpSystem {
  checkCollection(knight: KnightState, treasures: TreasureState[], time: number): TreasureState | null {
    for (const treasure of treasures) {
      if (treasure.collected) continue;

      const dist = distance(knight.x, knight.y, treasure.x + 0.5, treasure.y + 0.5);
      if (dist < 0.75) {
        treasure.collected = true;
        this.applyPowerUp(knight, treasure.type, time);
        return treasure;
      }
    }
    return null;
  }

  applyPowerUp(knight: KnightState, type: PowerUpType, time: number, overrides?: PowerUpOverrides): void {
    const healAmt = overrides?.healAmount ?? POWERUP_HEAL_AMOUNT;
    const attackBoost = overrides?.attackMultiplier ?? POWERUP_ATTACK_BOOST;
    const attackDuration = overrides?.attackDuration ?? 10000;
    const speedBoost = overrides?.speedMultiplier ?? POWERUP_SPEED_BOOST;
    const speedDuration = overrides?.speedDuration ?? 8000;
    const cloakDuration = overrides?.cloakDuration ?? POWERUP_CLOAK_DURATION;
    const fireResistDuration = overrides?.fireResistDuration ?? POWERUP_FIRE_RESIST_DURATION;
    const hpBoostAmt = overrides?.hpBoostAmount ?? POWERUP_HP_BOOST_AMOUNT;

    switch (type) {
      case PowerUpType.HEAL:
        heal(knight, healAmt);
        break;

      case PowerUpType.ATTACK_BOOST:
        knight.activePowerUps.push({
          type: PowerUpType.ATTACK_BOOST,
          expiresAt: time + attackDuration,
          multiplier: attackBoost,
        });
        break;

      case PowerUpType.SPEED_BOOST:
        knight.activePowerUps.push({
          type: PowerUpType.SPEED_BOOST,
          expiresAt: time + speedDuration,
          multiplier: speedBoost,
        });
        break;

      case PowerUpType.SHADOW_CLOAK:
        knight.activePowerUps.push({
          type: PowerUpType.SHADOW_CLOAK,
          expiresAt: time + cloakDuration,
          multiplier: 1,
        });
        break;

      case PowerUpType.FIRE_RESIST:
        knight.activePowerUps.push({
          type: PowerUpType.FIRE_RESIST,
          expiresAt: time + fireResistDuration,
          multiplier: POWERUP_FIRE_RESIST_MULTIPLIER,
        });
        break;

      case PowerUpType.HP_BOOST:
        knight.maxHP += hpBoostAmt;
        heal(knight, hpBoostAmt);
        break;
    }
  }

  private static WIZARD_OVERRIDES: PowerUpOverrides = {
    healAmount: WIZARD_HEAL_AMOUNT,
    attackMultiplier: WIZARD_ATTACK_BOOST,
    attackDuration: WIZARD_REWARD_DURATION,
    speedMultiplier: WIZARD_SPEED_BOOST,
    speedDuration: WIZARD_REWARD_DURATION,
    cloakDuration: WIZARD_CLOAK_DURATION,
    fireResistDuration: WIZARD_FIRE_RESIST_DURATION,
    hpBoostAmount: WIZARD_HP_BOOST_AMOUNT,
  };

  /**
   * Apply an enhanced wizard-tier power-up reward.
   * Randomly picks a type, applies 2-3x stronger values.
   * Returns the chosen type for floating text display.
   */
  applyWizardReward(knight: KnightState, time: number, level: number): PowerUpType {
    const types = [
      PowerUpType.HEAL,
      PowerUpType.ATTACK_BOOST,
      PowerUpType.SPEED_BOOST,
      PowerUpType.SHADOW_CLOAK,
      PowerUpType.FIRE_RESIST,
      PowerUpType.HP_BOOST,
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    this.applyPowerUp(knight, type, time, PowerUpSystem.WIZARD_OVERRIDES);
    return type;
  }

  updateKnightPowerUps(knight: KnightState, time: number): void {
    let speedMult = 1;
    let attackMult = 1;
    knight.isCloaked = false;
    knight.hasFireResist = false;
    knight.fireResistMultiplier = 1;

    knight.activePowerUps = knight.activePowerUps.filter(p => {
      if (p.expiresAt > 0 && time > p.expiresAt) return false;
      return true;
    });

    for (const pu of knight.activePowerUps) {
      switch (pu.type) {
        case PowerUpType.SPEED_BOOST:
          speedMult = pu.multiplier;
          break;
        case PowerUpType.ATTACK_BOOST:
          attackMult = pu.multiplier;
          break;
        case PowerUpType.SHADOW_CLOAK:
          knight.isCloaked = true;
          break;
        case PowerUpType.FIRE_RESIST:
          knight.hasFireResist = true;
          knight.fireResistMultiplier = pu.multiplier;
          break;
      }
    }

    knight.speed = knight.baseSpeed * speedMult;
    knight.attackPower = knight.baseAttackPower * attackMult;
  }
}

export { PowerUpType } from '../state/EntityState';
export type { TreasureState } from '../state/WorldState';
