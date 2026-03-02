import { TileType, TILE_PROPERTIES } from '../config/tileProperties';

interface Point {
  x: number;
  y: number;
}

/**
 * BFS pathfinding on the tile grid.
 * Returns an array of tile positions from start to goal (inclusive), or null if unreachable.
 * Uses 4-directional movement consistent with MovementSystem.canMoveTo.
 */
export function findPath(
  startX: number, startY: number,
  goalX: number, goalY: number,
  tiles: TileType[][], width: number, height: number
): Point[] | null {
  if (startX === goalX && startY === goalY) return [{ x: goalX, y: goalY }];

  if (!isWalkable(goalX, goalY, tiles, width, height)) return null;

  const key = (x: number, y: number) => y * width + x;
  const visited = new Set<number>();
  const parent = new Map<number, number>();

  const startKey = key(startX, startY);
  const goalKey = key(goalX, goalY);

  visited.add(startKey);
  const queue: number[] = [startKey];
  let head = 0;

  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];

  while (head < queue.length) {
    const cur = queue[head++];
    const cx = cur % width;
    const cy = (cur - cx) / width;

    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const nk = key(nx, ny);
      if (visited.has(nk)) continue;
      if (!TILE_PROPERTIES[tiles[ny][nx]].walkable) continue;

      visited.add(nk);
      parent.set(nk, cur);

      if (nk === goalKey) {
        return reconstructPath(parent, startKey, goalKey, width);
      }

      queue.push(nk);
    }
  }

  return null;
}

/**
 * Quick reachability check (BFS without path reconstruction).
 */
export function isReachable(
  startX: number, startY: number,
  goalX: number, goalY: number,
  tiles: TileType[][], width: number, height: number
): boolean {
  if (startX === goalX && startY === goalY) return true;
  if (!isWalkable(goalX, goalY, tiles, width, height)) return false;

  const key = (x: number, y: number) => y * width + x;
  const visited = new Set<number>();
  const goalKey = key(goalX, goalY);

  visited.add(key(startX, startY));
  const queue: number[] = [key(startX, startY)];
  let head = 0;

  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];

  while (head < queue.length) {
    const cur = queue[head++];
    const cx = cur % width;
    const cy = (cur - cx) / width;

    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const nk = key(nx, ny);
      if (visited.has(nk)) continue;
      if (!TILE_PROPERTIES[tiles[ny][nx]].walkable) continue;

      if (nk === goalKey) return true;
      visited.add(nk);
      queue.push(nk);
    }
  }

  return false;
}

function isWalkable(x: number, y: number, tiles: TileType[][], width: number, height: number): boolean {
  if (x < 0 || x >= width || y < 0 || y >= height) return false;
  return TILE_PROPERTIES[tiles[y][x]].walkable;
}

function reconstructPath(
  parent: Map<number, number>,
  startKey: number, goalKey: number,
  width: number
): Point[] {
  const path: Point[] = [];
  let cur = goalKey;
  while (cur !== startKey) {
    const cx = cur % width;
    const cy = (cur - cx) / width;
    path.push({ x: cx, y: cy });
    cur = parent.get(cur)!;
  }
  const sx = startKey % width;
  const sy = (startKey - sx) / width;
  path.push({ x: sx, y: sy });
  path.reverse();
  return path;
}
