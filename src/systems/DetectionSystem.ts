import { TileType, TILE_PROPERTIES } from '../config/tileProperties';
import { SHADOW_DETECTION_MULTIPLIER, DRAGON_NOISE_DETECT_RANGE } from '../config/constants';
import { distance, normalizeAngle } from '../core/MathUtils';

export class DetectionSystem {
  private tiles: TileType[][];

  constructor(tiles: TileType[][]) {
    this.tiles = tiles;
  }

  updateTiles(tiles: TileType[][]): void {
    this.tiles = tiles;
  }

  /**
   * Check if the dragon can see the knight via its FOV cone.
   * All positions in tile units.
   */
  canDetect(
    dragonX: number, dragonY: number, dragonAngle: number,
    knightX: number, knightY: number,
    fovRange: number, fovAngle: number,
    knightCloaked: boolean
  ): boolean {
    if (knightCloaked) return false;

    const dist = distance(dragonX, dragonY, knightX, knightY);

    // Check if knight is on a shadow tile (halve detection range)
    const knightTileX = Math.floor(knightX);
    const knightTileY = Math.floor(knightY);
    let effectiveRange = fovRange;

    if (this.isValidTile(knightTileX, knightTileY)) {
      const tile = this.tiles[knightTileY][knightTileX];
      if (TILE_PROPERTIES[tile].reducesDetection) {
        effectiveRange *= SHADOW_DETECTION_MULTIPLIER;
      }
    }

    if (dist > effectiveRange) return false;

    // Angle check (is knight within FOV cone?)
    const angleToKnight = Math.atan2(knightY - dragonY, knightX - dragonX);
    const angleDiff = normalizeAngle(angleToKnight - dragonAngle);

    if (Math.abs(angleDiff) > fovAngle) return false;

    // Line-of-sight check (Bresenham in tile space)
    if (!this.hasLineOfSight(dragonX, dragonY, knightX, knightY)) return false;

    return true;
  }

  /**
   * Check if the knight is making noise (moving) within hearing range through walls.
   * All positions in tile units.
   */
  canHearNoise(
    dragonX: number, dragonY: number,
    knightX: number, knightY: number,
    knightMoving: boolean
  ): boolean {
    if (!knightMoving) return false;
    const dist = distance(dragonX, dragonY, knightX, knightY);
    return dist <= DRAGON_NOISE_DETECT_RANGE;
  }

  /**
   * Bresenham line-of-sight check between two tile-unit positions.
   */
  hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    let tx0 = Math.floor(x0);
    let ty0 = Math.floor(y0);
    const tx1 = Math.floor(x1);
    const ty1 = Math.floor(y1);

    const dx = Math.abs(tx1 - tx0);
    const dy = Math.abs(ty1 - ty0);
    const sx = tx0 < tx1 ? 1 : -1;
    const sy = ty0 < ty1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (tx0 === tx1 && ty0 === ty1) break;

      if (this.isValidTile(tx0, ty0)) {
        const tile = this.tiles[ty0][tx0];
        if (TILE_PROPERTIES[tile].blocksLOS) return false;
      }

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        tx0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        ty0 += sy;
      }
    }

    return true;
  }

  /**
   * Get FOV cone polygon points for rendering (in tile units).
   */
  getFOVConePoints(
    x: number, y: number, angle: number,
    range: number, fovAngle: number,
    segments: number = 12
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [{ x, y }];

    for (let i = 0; i <= segments; i++) {
      const a = angle - fovAngle + (2 * fovAngle * i) / segments;
      let dist = range;
      for (let d = 1; d <= range; d += 0.5) {
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d;
        const tx = Math.floor(px);
        const ty = Math.floor(py);
        if (this.isValidTile(tx, ty) && TILE_PROPERTIES[this.tiles[ty][tx]].blocksLOS) {
          dist = d;
          break;
        }
      }
      points.push({
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist,
      });
    }

    return points;
  }

  private isValidTile(x: number, y: number): boolean {
    return y >= 0 && y < this.tiles.length && x >= 0 && x < this.tiles[0].length;
  }
}
