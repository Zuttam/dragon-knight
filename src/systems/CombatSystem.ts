import { KnightState, DragonStateData, DragonAIState, takeDamage } from '../state/EntityState';
import { KNIGHT_SURPRISE_MULTIPLIER, DRAGON_FIRE_DAMAGE_PER_SEC, DRAGON_FIRE_RANGE } from '../config/constants';
import { distance } from '../core/MathUtils';

export class CombatSystem {
  /**
   * Process a knight attack on the dragon.
   * Returns the damage dealt (0 if attack missed).
   */
  knightAttack(knight: KnightState, dragon: DragonStateData): number {
    if (!knight.isAttacking || knight.attackHitProcessed) return 0;

    const dist = distance(knight.x, knight.y, dragon.x, dragon.y);
    if (dist > 2) return 0; // 2 tile range

    let damage = knight.attackPower;

    // Surprise attack multiplier (dragon is unaware)
    if (dragon.aiState === DragonAIState.SLEEP || dragon.aiState === DragonAIState.PATROL || dragon.aiState === DragonAIState.SEARCH) {
      damage *= KNIGHT_SURPRISE_MULTIPLIER;
    }

    takeDamage(dragon, damage);
    knight.attackHitProcessed = true;
    return damage;
  }

  /**
   * Process dragon fire breath damage on the knight.
   * Returns damage dealt this frame.
   */
  dragonFireDamage(dragon: DragonStateData, knight: KnightState, delta: number): number {
    if (!dragon.fireBreathing || (dragon.aiState !== DragonAIState.ATTACK && dragon.aiState !== DragonAIState.SEARCH)) return 0;

    const dist = distance(dragon.x, dragon.y, knight.x, knight.y);
    if (dist > DRAGON_FIRE_RANGE) return 0;

    // Check if knight is in fire cone (narrower than FOV)
    const angleToKnight = Math.atan2(knight.y - dragon.y, knight.x - dragon.x);
    let angleDiff = angleToKnight - dragon.facingAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (Math.abs(angleDiff) > Math.PI / 6) return 0; // 30deg fire cone

    let damage = DRAGON_FIRE_DAMAGE_PER_SEC * dragon.fireDamageMultiplier * (delta / 1000);

    if (knight.hasFireResist) {
      damage *= knight.fireResistMultiplier;
    }

    takeDamage(knight, damage);
    return damage;
  }
}
