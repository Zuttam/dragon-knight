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
} from '../config/constants';

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

  applyPowerUp(knight: KnightState, type: PowerUpType, time: number): void {
    switch (type) {
      case PowerUpType.HEAL:
        heal(knight, POWERUP_HEAL_AMOUNT);
        break;

      case PowerUpType.ATTACK_BOOST:
        knight.activePowerUps.push({
          type: PowerUpType.ATTACK_BOOST,
          expiresAt: time + 10000,
          multiplier: POWERUP_ATTACK_BOOST,
        });
        break;

      case PowerUpType.SPEED_BOOST:
        knight.activePowerUps.push({
          type: PowerUpType.SPEED_BOOST,
          expiresAt: time + 8000,
          multiplier: POWERUP_SPEED_BOOST,
        });
        break;

      case PowerUpType.SHADOW_CLOAK:
        knight.activePowerUps.push({
          type: PowerUpType.SHADOW_CLOAK,
          expiresAt: time + POWERUP_CLOAK_DURATION,
          multiplier: 1,
        });
        break;

      case PowerUpType.FIRE_RESIST:
        knight.activePowerUps.push({
          type: PowerUpType.FIRE_RESIST,
          expiresAt: time + POWERUP_FIRE_RESIST_DURATION,
          multiplier: POWERUP_FIRE_RESIST_MULTIPLIER,
        });
        break;

      case PowerUpType.HP_BOOST:
        knight.maxHP += POWERUP_HP_BOOST_AMOUNT;
        heal(knight, POWERUP_HP_BOOST_AMOUNT);
        break;
    }
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
