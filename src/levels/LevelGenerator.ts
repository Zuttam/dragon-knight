import { LevelDefinition } from './LevelDefinition';
import { TileType } from '../config/tileProperties';

export function generateLevel(levelNum: number): LevelDefinition {
  const width = Math.min(20 + levelNum * 5, 50);
  const height = Math.min(15 + levelNum * 4, 40);

  const tiles: TileType[][] = [];

  // Fill with floor
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        tiles[y][x] = TileType.WALL;
      } else {
        tiles[y][x] = TileType.FLOOR;
      }
    }
  }

  const rng = seedRandom(levelNum * 1337);

  // Generate rooms using BSP-like approach
  const rooms: { x: number; y: number; w: number; h: number }[] = [];
  generateRooms(tiles, 1, 1, width - 2, height - 2, rooms, rng, 0);

  // Add shadow patches
  for (let i = 0; i < Math.floor(width * height * 0.05); i++) {
    const x = Math.floor(rng() * (width - 2)) + 1;
    const y = Math.floor(rng() * (height - 2)) + 1;
    if (tiles[y][x] === TileType.FLOOR) {
      tiles[y][x] = TileType.SHADOW;
      // Cluster shadows
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && tiles[ny][nx] === TileType.FLOOR && rng() < 0.4) {
          tiles[ny][nx] = TileType.SHADOW;
        }
      }
    }
  }

  // Add grass patches for level 4+
  if (levelNum >= 4) {
    for (let i = 0; i < Math.floor(width * height * 0.03); i++) {
      const x = Math.floor(rng() * (width - 2)) + 1;
      const y = Math.floor(rng() * (height - 2)) + 1;
      if (tiles[y][x] === TileType.FLOOR) {
        tiles[y][x] = TileType.GRASS;
      }
    }
  }

  // Add some wood walls
  for (let i = 0; i < Math.floor(levelNum * 2); i++) {
    const x = Math.floor(rng() * (width - 4)) + 2;
    const y = Math.floor(rng() * (height - 4)) + 2;
    if (tiles[y][x] === TileType.FLOOR) {
      const horizontal = rng() < 0.5;
      for (let j = 0; j < 3; j++) {
        const wx = horizontal ? x + j : x;
        const wy = horizontal ? y : y + j;
        if (wx < width - 1 && wy < height - 1 && tiles[wy][wx] === TileType.FLOOR) {
          tiles[wy][wx] = TileType.WOOD_WALL;
        }
      }
    }
  }

  // Add elevated sections (multi-floor) for level 5+
  if (levelNum >= 5) {
    addElevatedSections(tiles, width, height, rooms, rng, levelNum);
  }

  // Add lava patches for level 6+
  if (levelNum >= 6) {
    const lavaCount = Math.floor((levelNum - 5) * 3);
    for (let i = 0; i < lavaCount; i++) {
      const x = Math.floor(rng() * (width - 4)) + 2;
      const y = Math.floor(rng() * (height - 4)) + 2;
      if (tiles[y][x] === TileType.FLOOR) {
        tiles[y][x] = TileType.LAVA;
        // Small cluster
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (rng() < 0.3) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx > 1 && nx < width - 2 && ny > 1 && ny < height - 2 && tiles[ny][nx] === TileType.FLOOR) {
              tiles[ny][nx] = TileType.LAVA;
            }
          }
        }
      }
    }
  }

  // Place knight spawn in bottom-left area
  const knightSpawn = findFloorTile(tiles, 1, height - 4, 5, 3, rng);

  // Place dragon spawn in center-ish area
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const dragonSpawn = findFloorTile(tiles, cx - 3, cy - 3, 6, 6, rng);

  // Generate dragon waypoints
  const dragonWaypoints = generateWaypoints(tiles, dragonSpawn, width, height, rng, 4 + levelNum);

  // Place treasures
  const treasureCount = 3 + levelNum;
  const treasurePositions: { x: number; y: number }[] = [];
  for (let i = 0; i < treasureCount; i++) {
    const pos = findFloorTile(tiles, 2, 2, width - 4, height - 4, rng);
    const tooClose = treasurePositions.some(t => Math.abs(t.x - pos.x) + Math.abs(t.y - pos.y) < 4);
    if (!tooClose) {
      treasurePositions.push(pos);
    }
  }

  return {
    level: levelNum,
    name: `Castle Depths - Floor ${levelNum}`,
    width,
    height,
    tiles,
    knightSpawn,
    dragonSpawn,
    dragonWaypoints,
    treasurePositions,
    dragonHP: 50 + levelNum * 20,
    dragonSpeedMultiplier: 1.0 + levelNum * 0.15,
  };
}

function seedRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateRooms(
  tiles: TileType[][],
  x: number, y: number, w: number, h: number,
  rooms: { x: number; y: number; w: number; h: number }[],
  rng: () => number,
  depth: number
) {
  if (w < 6 || h < 6 || depth > 4) {
    rooms.push({ x, y, w, h });
    return;
  }

  const splitH = w > h ? true : h > w ? false : rng() < 0.5;

  if (splitH && w > 8) {
    const split = Math.floor(rng() * (w - 6)) + 3 + x;
    // Draw wall
    for (let wy = y; wy < y + h; wy++) {
      tiles[wy][split] = TileType.WALL;
    }
    // Add door
    const doorY = Math.floor(rng() * (h - 2)) + y + 1;
    tiles[doorY][split] = TileType.DOOR;

    generateRooms(tiles, x, y, split - x, h, rooms, rng, depth + 1);
    generateRooms(tiles, split + 1, y, x + w - split - 1, h, rooms, rng, depth + 1);
  } else if (!splitH && h > 8) {
    const split = Math.floor(rng() * (h - 6)) + 3 + y;
    for (let wx = x; wx < x + w; wx++) {
      tiles[split][wx] = TileType.WALL;
    }
    const doorX = Math.floor(rng() * (w - 2)) + x + 1;
    tiles[split][doorX] = TileType.DOOR;

    generateRooms(tiles, x, y, w, split - y, rooms, rng, depth + 1);
    generateRooms(tiles, x, split + 1, w, y + h - split - 1, rooms, rng, depth + 1);
  } else {
    rooms.push({ x, y, w, h });
  }
}

/**
 * Add elevated (second-floor) sections to rooms.
 * Picks some BSP rooms and raises them, connecting with stairs.
 */
function addElevatedSections(
  tiles: TileType[][],
  width: number, height: number,
  rooms: { x: number; y: number; w: number; h: number }[],
  rng: () => number,
  levelNum: number
): void {
  // Elevate ~30% of rooms (at least 1, up to a cap)
  const numElevated = Math.max(1, Math.min(Math.floor(rooms.length * 0.3), levelNum - 3));
  const shuffled = [...rooms].sort(() => rng() - 0.5);

  for (let i = 0; i < numElevated && i < shuffled.length; i++) {
    const room = shuffled[i];
    // Skip tiny rooms
    if (room.w < 4 || room.h < 4) continue;

    // Convert interior to elevated floor, border to elevated walls
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        if (x === room.x || x === room.x + room.w - 1 || y === room.y || y === room.y + room.h - 1) {
          // Only elevate the walls if they're already walls
          if (tiles[y][x] === TileType.WALL) {
            tiles[y][x] = TileType.ELEVATED_WALL;
          }
        } else if (tiles[y][x] === TileType.FLOOR || tiles[y][x] === TileType.SHADOW) {
          tiles[y][x] = TileType.ELEVATED_FLOOR;
        }
      }
    }

    // Place stairs at doors/entrances to this room (check all border tiles for doors)
    let stairsPlaced = false;
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (tiles[y][x] === TileType.DOOR) {
          tiles[y][x] = TileType.STAIRS;
          stairsPlaced = true;
        }
      }
    }

    // If no doors found (shouldn't happen), force a stairway on one edge
    if (!stairsPlaced) {
      const sx = room.x + 1 + Math.floor(rng() * Math.max(1, room.w - 2));
      const sy = room.y + room.h - 1;
      if (sy < height && sx < width) {
        tiles[sy][sx] = TileType.STAIRS;
      }
    }
  }
}

export function findFloorTile(
  tiles: TileType[][], sx: number, sy: number, w: number, h: number, rng: () => number
): { x: number; y: number } {
  for (let attempts = 0; attempts < 100; attempts++) {
    const x = Math.floor(rng() * w) + sx;
    const y = Math.floor(rng() * h) + sy;
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      if (tiles[y][x] === TileType.FLOOR || tiles[y][x] === TileType.SHADOW) {
        return { x, y };
      }
    }
  }
  // Fallback: scan for any floor tile in the area
  for (let y = Math.max(1, sy); y < Math.min(tiles.length - 1, sy + h); y++) {
    for (let x = Math.max(1, sx); x < Math.min(tiles[0].length - 1, sx + w); x++) {
      if (tiles[y][x] === TileType.FLOOR) return { x, y };
    }
  }
  return { x: 2, y: 2 };
}

export function generateWaypoints(
  tiles: TileType[][],
  start: { x: number; y: number },
  width: number, height: number,
  rng: () => number,
  count: number
): { x: number; y: number }[] {
  const waypoints = [start];
  for (let i = 0; i < count - 1; i++) {
    const pos = findFloorTile(tiles, 2, 2, width - 4, height - 4, rng);
    waypoints.push(pos);
  }
  return waypoints;
}
