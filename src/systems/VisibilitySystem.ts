import { TILE_PROPERTIES, TileType } from '../config/tileProperties';

/**
 * Field-of-view system using recursive shadowcasting.
 * Reveals tiles visible from the knight's position.
 */
export class VisibilitySystem {
  private width: number;
  private height: number;
  private tiles: TileType[][];
  visible: boolean[][];
  explored: boolean[][];
  private viewRange: number;

  private static readonly MULTIPLIERS = [
    [1, 0, 0, -1, -1, 0, 0, 1],
    [0, 1, -1, 0, 0, -1, 1, 0],
    [0, 1, 1, 0, 0, -1, -1, 0],
    [1, 0, 0, 1, -1, 0, 0, -1],
  ];

  constructor(width: number, height: number, tiles: TileType[][], viewRange: number = 8) {
    this.width = width;
    this.height = height;
    this.tiles = tiles;
    this.viewRange = viewRange;

    this.visible = [];
    this.explored = [];
    for (let y = 0; y < height; y++) {
      this.visible[y] = new Array(width).fill(false);
      this.explored[y] = new Array(width).fill(false);
    }
  }

  updateTiles(tiles: TileType[][]): void {
    this.tiles = tiles;
  }

  compute(originX: number, originY: number): void {
    // Reset visibility
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.visible[y][x] = false;
      }
    }

    // Origin is always visible
    if (this.isInBounds(originX, originY)) {
      this.visible[originY][originX] = true;
      this.explored[originY][originX] = true;
    }

    // Cast shadows in 8 octants
    for (let octant = 0; octant < 8; octant++) {
      this.castShadow(originX, originY, 1, 1.0, 0.0, octant);
    }
  }

  private castShadow(
    cx: number, cy: number,
    row: number,
    startSlope: number, endSlope: number,
    octant: number
  ): void {
    if (startSlope < endSlope) return;

    const xx = VisibilitySystem.MULTIPLIERS[0][octant];
    const xy = VisibilitySystem.MULTIPLIERS[1][octant];
    const yx = VisibilitySystem.MULTIPLIERS[2][octant];
    const yy = VisibilitySystem.MULTIPLIERS[3][octant];

    let nextStartSlope = startSlope;

    for (let i = row; i <= this.viewRange; i++) {
      let blocked = false;

      for (let dx = -i; dx <= 0; dx++) {
        const dy = -i;
        const mapX = cx + dx * xx + dy * xy;
        const mapY = cy + dx * yx + dy * yy;

        const leftSlope = (dx - 0.5) / (dy + 0.5);
        const rightSlope = (dx + 0.5) / (dy - 0.5);

        if (startSlope < rightSlope) continue;
        if (endSlope > leftSlope) break;

        // Calculate distance
        const distSq = dx * dx + dy * dy;
        if (distSq > this.viewRange * this.viewRange) continue;

        if (this.isInBounds(mapX, mapY)) {
          this.visible[mapY][mapX] = true;
          this.explored[mapY][mapX] = true;
        }

        if (blocked) {
          if (this.isOpaque(mapX, mapY)) {
            nextStartSlope = rightSlope;
          } else {
            blocked = false;
            startSlope = nextStartSlope;
          }
        } else if (this.isOpaque(mapX, mapY) && i < this.viewRange) {
          blocked = true;
          this.castShadow(cx, cy, i + 1, startSlope, leftSlope, octant);
          nextStartSlope = rightSlope;
        }
      }

      if (blocked) break;
    }
  }

  private isOpaque(x: number, y: number): boolean {
    if (!this.isInBounds(x, y)) return true;
    return TILE_PROPERTIES[this.tiles[y][x]].blocksLOS;
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
}
