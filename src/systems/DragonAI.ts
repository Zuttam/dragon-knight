import { DragonStateData, DragonAIState, entityTileX, entityTileY } from '../state/EntityState';
import { TileType } from '../config/tileProperties';
import { DRAGON_ALERT_DURATION, DRAGON_SEARCH_DURATION, DRAGON_FIRE_RANGE } from '../config/constants';
import { distance, angleBetween } from '../core/MathUtils';

export class DragonAI {
  update(
    dragon: DragonStateData,
    time: number,
    delta: number,
    playerDetected: boolean,
    playerPos?: { x: number; y: number }
  ): void {
    switch (dragon.aiState) {
      case DragonAIState.PATROL:
        this.doPatrol(dragon, delta);
        if (playerDetected && playerPos) {
          dragon.lastKnownPlayerPos = { ...playerPos };
          dragon.aiState = DragonAIState.ALERT;
          dragon.alertTimer = time + DRAGON_ALERT_DURATION;
          dragon.vx = 0;
          dragon.vy = 0;
        }
        break;

      case DragonAIState.ALERT:
        dragon.vx = 0;
        dragon.vy = 0;
        if (time >= dragon.alertTimer) {
          if (playerDetected && playerPos) {
            dragon.lastKnownPlayerPos = { ...playerPos };
            dragon.aiState = DragonAIState.ATTACK;
          } else {
            dragon.aiState = DragonAIState.SEARCH;
            dragon.searchTimer = time + DRAGON_SEARCH_DURATION;
          }
        }
        break;

      case DragonAIState.ATTACK:
        if (playerDetected && playerPos) {
          dragon.lastKnownPlayerPos = { ...playerPos };
          const targetX = playerPos.x + 0.5;
          const targetY = playerPos.y + 0.5;
          this.moveToward(dragon, targetX, targetY, dragon.speed * 1.2);
          dragon.fireBreathing = true;
        } else {
          dragon.aiState = DragonAIState.SEARCH;
          dragon.searchTimer = time + DRAGON_SEARCH_DURATION;
          dragon.fireBreathing = false;
        }
        break;

      case DragonAIState.SEARCH:
        if (playerDetected && playerPos) {
          dragon.lastKnownPlayerPos = { ...playerPos };
          dragon.aiState = DragonAIState.ATTACK;
          dragon.searchFiring = false;
        } else if (!dragon.searchFiring && dragon.lastKnownPlayerPos) {
          const targetX = dragon.lastKnownPlayerPos.x + 0.5;
          const targetY = dragon.lastKnownPlayerPos.y + 0.5;
          this.moveToward(dragon, targetX, targetY, dragon.speed * 0.8);
          const dist = distance(dragon.x, dragon.y, targetX, targetY);
          if (dist < 0.5) {
            dragon.lastKnownPlayerPos = null;
          }
        }

        if (time >= dragon.searchTimer) {
          dragon.aiState = DragonAIState.PATROL;
          dragon.fireBreathing = false;
          dragon.searchFiring = false;
        }
        break;
    }
  }

  /**
   * Handle dragon firing at wood walls during search state.
   */
  handleSearchFire(
    dragon: DragonStateData,
    tiles: TileType[][]
  ): void {
    if (dragon.aiState !== DragonAIState.SEARCH) {
      if (dragon.searchFiring) {
        dragon.fireBreathing = false;
        dragon.searchFiring = false;
      }
      return;
    }

    const lastPos = dragon.lastKnownPlayerPos;
    if (!lastPos) {
      dragon.fireBreathing = false;
      dragon.searchFiring = false;
      return;
    }

    const dtx = entityTileX(dragon);
    const dty = entityTileY(dragon);
    const woodWalls = this.findWoodWallsInPath(dtx, dty, lastPos.x, lastPos.y, tiles);

    if (woodWalls.length > 0) {
      const nearest = woodWalls[0];
      const targetX = nearest.x + 0.5;
      const targetY = nearest.y + 0.5;
      dragon.facingAngle = angleBetween(dragon.x, dragon.y, targetX, targetY);
      dragon.fireBreathing = true;
      dragon.searchFiring = true;
      dragon.vx = 0;
      dragon.vy = 0;
    } else {
      dragon.fireBreathing = false;
      dragon.searchFiring = false;
    }
  }

  private findWoodWallsInPath(
    x0: number, y0: number, x1: number, y1: number,
    tiles: TileType[][]
  ): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [];
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let cx = x0;
    let cy = y0;

    while (true) {
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; cx += sx; }
      if (e2 < dx) { err += dx; cy += sy; }
      if (cy < 0 || cy >= tiles.length || cx < 0 || cx >= tiles[0].length) break;
      const tile = tiles[cy][cx];
      if (tile === TileType.WOOD_WALL) {
        result.push({ x: cx, y: cy });
      } else if (tile === TileType.WALL) {
        break;
      }
    }
    return result;
  }

  private doPatrol(dragon: DragonStateData, delta: number): void {
    if (dragon.waypoints.length === 0) return;

    const wp = dragon.waypoints[dragon.currentWaypointIndex];
    const targetX = wp.x + 0.5;
    const targetY = wp.y + 0.5;
    const dist = distance(dragon.x, dragon.y, targetX, targetY);

    if (dist < 0.15) {
      dragon.currentWaypointIndex = (dragon.currentWaypointIndex + 1) % dragon.waypoints.length;
    } else {
      this.moveToward(dragon, targetX, targetY, dragon.speed);
    }
  }

  private moveToward(dragon: DragonStateData, tx: number, ty: number, speed: number): void {
    const angle = angleBetween(dragon.x, dragon.y, tx, ty);
    dragon.facingAngle = angle;
    dragon.vx = Math.cos(angle) * speed;
    dragon.vy = Math.sin(angle) * speed;
  }

  isFireBreathing(dragon: DragonStateData): boolean {
    return dragon.fireBreathing && (dragon.aiState === DragonAIState.ATTACK || dragon.aiState === DragonAIState.SEARCH);
  }

  getFireRange(): number {
    return DRAGON_FIRE_RANGE; // in tiles
  }
}
