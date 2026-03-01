import { TileType, TILE_PROPERTIES } from '../config/tileProperties';

export class MovementSystem {
  /**
   * Move an entity by velocity, checking grid-based tile collision.
   * Positions are in tile units (float).
   */
  move(
    entity: { x: number; y: number; vx: number; vy: number },
    delta: number,
    tiles: TileType[][],
    width: number,
    height: number
  ): void {
    const dt = delta / 1000;
    const newX = entity.x + entity.vx * dt;
    const newY = entity.y + entity.vy * dt;

    // Entity radius in tile units (half-size for AABB)
    const r = 0.35;

    // Check X movement
    if (this.canMoveTo(newX, entity.y, r, tiles, width, height)) {
      entity.x = newX;
    }

    // Check Y movement
    if (this.canMoveTo(entity.x, newY, r, tiles, width, height)) {
      entity.y = newY;
    }

    // World bounds
    entity.x = Math.max(r, Math.min(width - r, entity.x));
    entity.y = Math.max(r, Math.min(height - r, entity.y));
  }

  private canMoveTo(
    x: number, y: number, r: number,
    tiles: TileType[][],
    width: number, height: number
  ): boolean {
    // Check all tiles the entity AABB overlaps
    const minTX = Math.floor(x - r);
    const maxTX = Math.floor(x + r);
    const minTY = Math.floor(y - r);
    const maxTY = Math.floor(y + r);

    for (let ty = minTY; ty <= maxTY; ty++) {
      for (let tx = minTX; tx <= maxTX; tx++) {
        if (tx < 0 || tx >= width || ty < 0 || ty >= height) return false;
        if (!TILE_PROPERTIES[tiles[ty][tx]].walkable) return false;
      }
    }
    return true;
  }
}
