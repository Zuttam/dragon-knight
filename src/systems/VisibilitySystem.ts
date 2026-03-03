import { TILE_PROPERTIES, TileType } from '../config/tileProperties';

/**
 * Field-of-view system using recursive shadowcasting.
 * Reveals tiles visible from the knight's position.
 *
 * Uses flat Uint8Array for visible/explored data for performance:
 * - fill(0) reset instead of nested loops
 * - better CPU cache locality
 * - smaller memory footprint
 */
export class VisibilitySystem {
  width: number;
  height: number;
  private tiles: TileType[][];
  /** Flat visibility array: 1 = visible, 0 = not. Index = y * width + x */
  visible: Uint8Array;
  /** Flat explored array: 1 = explored, 0 = not. Index = y * width + x */
  explored: Uint8Array;
  private viewRange: number;
  revealAll: boolean = false;
  private exploredPerFloor: Map<number, Uint8Array> = new Map();

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

    this.visible = new Uint8Array(width * height);
    this.explored = new Uint8Array(width * height);
  }

  isVisible(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.visible[y * this.width + x] === 1;
  }

  isExplored(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.explored[y * this.width + x] === 1;
  }

  updateTiles(tiles: TileType[][]): void {
    this.tiles = tiles;
  }

  compute(originX: number, originY: number): void {
    // Reveal all mode: mark everything visible+explored
    if (this.revealAll) {
      this.visible.fill(1);
      this.explored.fill(1);
      return;
    }

    // Reset visibility (single call instead of nested loops)
    this.visible.fill(0);

    // Origin is always visible
    if (this.isInBounds(originX, originY)) {
      const idx = originY * this.width + originX;
      this.visible[idx] = 1;
      this.explored[idx] = 1;
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
          const idx = mapY * this.width + mapX;
          this.visible[idx] = 1;
          this.explored[idx] = 1;
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

  /**
   * Switch visibility state for a new floor.
   * Saves current explored state and loads/creates the target floor's state.
   */
  switchFloor(floorIndex: number, newWidth: number, newHeight: number, newTiles: TileType[][], currentFloorIndex: number): void {
    // Save current explored state
    this.exploredPerFloor.set(currentFloorIndex, this.explored);

    // Load or create target floor's explored state
    let targetExplored = this.exploredPerFloor.get(floorIndex);
    if (!targetExplored) {
      targetExplored = new Uint8Array(newWidth * newHeight);
      this.exploredPerFloor.set(floorIndex, targetExplored);
    }

    this.width = newWidth;
    this.height = newHeight;
    this.tiles = newTiles;
    this.explored = targetExplored;

    // Reset visible array to new dimensions
    this.visible = new Uint8Array(newWidth * newHeight);
  }
}
