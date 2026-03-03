import { DragonStateData, DragonAIState, entityTileX, entityTileY } from '../state/EntityState';
import { TileType } from '../config/tileProperties';
import {
  DRAGON_ALERT_DURATION, DRAGON_SEARCH_DURATION, DRAGON_FIRE_RANGE,
  DRAGON_WAYPOINT_TIMEOUT, DRAGON_REPATH_INTERVAL,
} from '../config/constants';
import { distance, angleBetween } from '../core/MathUtils';
import { findPath } from './Pathfinding';

const PATH_NODE_THRESHOLD = 0.3; // tiles — close enough to advance to next path node

export class DragonAI {
  update(
    dragon: DragonStateData,
    time: number,
    delta: number,
    playerDetected: boolean,
    playerPos?: { x: number; y: number },
    tiles?: TileType[][],
    worldWidth?: number,
    worldHeight?: number,
    furnitureBlocked?: Set<string>,
  ): void {
    const prevState = dragon.aiState;

    switch (dragon.aiState) {
      case DragonAIState.SLEEP:
        dragon.vx = 0;
        dragon.vy = 0;
        break;

      case DragonAIState.PATROL:
        this.doPatrol(dragon, time, delta, tiles, worldWidth, worldHeight, furnitureBlocked);
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
        // Face toward last known player position so visual detection works after noise alert
        if (dragon.lastKnownPlayerPos) {
          dragon.facingAngle = angleBetween(
            dragon.x, dragon.y,
            dragon.lastKnownPlayerPos.x + 0.5, dragon.lastKnownPlayerPos.y + 0.5,
          );
        }
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
        this.doAttack(dragon, time, delta, playerDetected, playerPos, tiles, worldWidth, worldHeight, furnitureBlocked);
        break;

      case DragonAIState.SEARCH:
        this.doSearch(dragon, time, delta, playerDetected, playerPos, tiles, worldWidth, worldHeight, furnitureBlocked);
        break;
    }

    // Clear path on state transitions
    if (dragon.aiState !== prevState) {
      this.clearPath(dragon);
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

  // ── PATROL ─────────────────────────────────────────────────

  private doPatrol(
    dragon: DragonStateData, time: number, delta: number,
    tiles?: TileType[][], worldWidth?: number, worldHeight?: number,
    furnitureBlocked?: Set<string>,
  ): void {
    if (dragon.waypoints.length === 0) return;

    const wp = dragon.waypoints[dragon.currentWaypointIndex];
    const targetX = wp.x + 0.5;
    const targetY = wp.y + 0.5;
    const dist = distance(dragon.x, dragon.y, targetX, targetY);

    if (dist < 0.15) {
      this.advanceWaypoint(dragon);
      return;
    }

    // Stuck timeout — skip unreachable waypoints
    if (dragon.waypointStuckTimer === 0) {
      dragon.waypointStuckTimer = time;
    }
    if (time - dragon.waypointStuckTimer > DRAGON_WAYPOINT_TIMEOUT) {
      this.advanceWaypoint(dragon);
      return;
    }

    // Use BFS path-following if tiles are available
    if (tiles && worldWidth && worldHeight) {
      this.followPathToTile(dragon, wp.x, wp.y, dragon.speed, tiles, worldWidth, worldHeight, time, furnitureBlocked);
    } else {
      this.moveToward(dragon, targetX, targetY, dragon.speed);
    }
  }

  private advanceWaypoint(dragon: DragonStateData): void {
    dragon.currentWaypointIndex = (dragon.currentWaypointIndex + 1) % dragon.waypoints.length;
    this.clearPath(dragon);
    dragon.waypointStuckTimer = 0;
  }

  // ── ATTACK ─────────────────────────────────────────────────

  private doAttack(
    dragon: DragonStateData, time: number, delta: number,
    playerDetected: boolean,
    playerPos?: { x: number; y: number },
    tiles?: TileType[][], worldWidth?: number, worldHeight?: number,
    furnitureBlocked?: Set<string>,
  ): void {
    if (playerDetected && playerPos) {
      dragon.lastKnownPlayerPos = { ...playerPos };
      const playerWorldX = playerPos.x + 0.5;
      const playerWorldY = playerPos.y + 0.5;

      dragon.fireBreathing = true;

      if (tiles && worldWidth && worldHeight) {
        // Repath when target moves >2 tiles or on interval
        const needsRepath = !dragon.lastPathTarget
          || distance(playerPos.x, playerPos.y, dragon.lastPathTarget.x, dragon.lastPathTarget.y) > 2
          || (time - dragon.lastPathComputeTime > DRAGON_REPATH_INTERVAL);

        if (needsRepath) {
          this.clearPath(dragon);
        }

        this.followPathToTile(dragon, playerPos.x, playerPos.y, dragon.speed * 1.2, tiles, worldWidth, worldHeight, time, furnitureBlocked);
      } else {
        this.moveToward(dragon, playerWorldX, playerWorldY, dragon.speed * 1.2);
      }

      // Face the player directly (not the path node) so fire breath aims correctly
      // Set this AFTER followPathToTile which overwrites facingAngle via moveToward
      dragon.facingAngle = angleBetween(dragon.x, dragon.y, playerWorldX, playerWorldY);
    } else {
      dragon.aiState = DragonAIState.SEARCH;
      dragon.searchTimer = time + DRAGON_SEARCH_DURATION;
      dragon.fireBreathing = false;
    }
  }

  // ── SEARCH ─────────────────────────────────────────────────

  private doSearch(
    dragon: DragonStateData, time: number, delta: number,
    playerDetected: boolean,
    playerPos?: { x: number; y: number },
    tiles?: TileType[][], worldWidth?: number, worldHeight?: number,
    furnitureBlocked?: Set<string>,
  ): void {
    if (playerDetected && playerPos) {
      dragon.lastKnownPlayerPos = { ...playerPos };
      dragon.aiState = DragonAIState.ATTACK;
      dragon.searchFiring = false;
      return;
    }

    if (!dragon.searchFiring && dragon.lastKnownPlayerPos) {
      const targetX = dragon.lastKnownPlayerPos.x + 0.5;
      const targetY = dragon.lastKnownPlayerPos.y + 0.5;

      if (tiles && worldWidth && worldHeight) {
        this.followPathToTile(
          dragon, dragon.lastKnownPlayerPos.x, dragon.lastKnownPlayerPos.y,
          dragon.speed * 0.8, tiles, worldWidth, worldHeight, time, furnitureBlocked,
        );
      } else {
        this.moveToward(dragon, targetX, targetY, dragon.speed * 0.8);
      }

      const dist = distance(dragon.x, dragon.y, targetX, targetY);
      if (dist < 0.5) {
        dragon.lastKnownPlayerPos = null;
        this.clearPath(dragon);
      }
    }

    if (time >= dragon.searchTimer) {
      dragon.aiState = DragonAIState.PATROL;
      dragon.fireBreathing = false;
      dragon.searchFiring = false;
    }
  }

  // ── Path following ─────────────────────────────────────────

  private followPathToTile(
    dragon: DragonStateData,
    goalTileX: number, goalTileY: number,
    speed: number,
    tiles: TileType[][], worldWidth: number, worldHeight: number,
    time: number,
    furnitureBlocked?: Set<string>,
  ): void {
    // Compute path if we don't have one
    if (!dragon.currentPath) {
      const startX = entityTileX(dragon);
      const startY = entityTileY(dragon);
      const path = findPath(startX, startY, goalTileX, goalTileY, tiles, worldWidth, worldHeight, furnitureBlocked);
      if (!path) {
        // No path — fall back to direct movement
        this.moveToward(dragon, goalTileX + 0.5, goalTileY + 0.5, speed);
        return;
      }
      dragon.currentPath = path;
      dragon.currentPathIndex = 0;
      dragon.lastPathTarget = { x: goalTileX, y: goalTileY };
      dragon.lastPathComputeTime = time;
    }

    // Follow the path node by node
    const path = dragon.currentPath;
    let idx = dragon.currentPathIndex;

    // Skip nodes we've already passed
    while (idx < path.length - 1) {
      const node = path[idx];
      const nodeX = node.x + 0.5;
      const nodeY = node.y + 0.5;
      if (distance(dragon.x, dragon.y, nodeX, nodeY) < PATH_NODE_THRESHOLD) {
        idx++;
      } else {
        break;
      }
    }
    dragon.currentPathIndex = idx;

    if (idx < path.length) {
      const node = path[idx];
      this.moveToward(dragon, node.x + 0.5, node.y + 0.5, speed);
    }
  }

  private clearPath(dragon: DragonStateData): void {
    dragon.currentPath = null;
    dragon.currentPathIndex = 0;
  }

  // ── Helpers ────────────────────────────────────────────────

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
    return DRAGON_FIRE_RANGE;
  }
}
