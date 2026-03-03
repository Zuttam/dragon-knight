import { LevelDefinition } from './LevelDefinition';
import { TileType, TILE_PROPERTIES } from '../config/tileProperties';
import { computeMinLevelSize } from './LevelScaler';
import {
  WIZARD_SPAWN_CHANCE,
  WIZARD_SPAWN_MIN_DIST_KNIGHT,
  WIZARD_SPAWN_MIN_DIST_DRAGON,
  WOOD_WALL_HP,
} from '../config/constants';
import { isReachable } from '../systems/Pathfinding';
import { distance } from '../core/MathUtils';
import { FurnitureType, FurnitureState, RoomType, BLOCKING_FURNITURE, FloorData, StairConnection, TreasureState } from '../state/WorldState';
import { PowerUpType } from '../state/EntityState';

export function generateLevel(levelNum: number): LevelDefinition {
  const minSize = computeMinLevelSize();
  const width = Math.max(Math.min(20 + levelNum * 5, 50), minSize.width);
  const height = Math.max(Math.min(15 + levelNum * 4, 40), minSize.height);

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

  // Assign room types early (needed for courtyard grass placement)
  const roomInfos: RoomInfo[] = rooms.map(r => ({
    ...r,
    roomType: assignRoomType(r, rng),
  }));

  // Add grass only in courtyard rooms for level 4+
  if (levelNum >= 4) {
    for (const room of roomInfos) {
      if (room.roomType !== RoomType.COURTYARD) continue;
      for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
          if (x > 0 && x < width - 1 && y > 0 && y < height - 1 && tiles[y][x] === TileType.FLOOR) {
            tiles[y][x] = TileType.GRASS;
          }
        }
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

  // Add elevated sections (visual only) for level 5+
  if (levelNum >= 5) {
    addElevatedSections(tiles, width, height, rooms, rng, levelNum);
  }

  // Generate second floor for all procedural levels
  const secondFloorResult = generateSecondFloor(tiles, width, height, rooms, rng, levelNum);

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

  // Place torches on walls adjacent to floor tiles
  const torchPositions = generateTorchPositions(tiles, width, height, rooms, rng);

  // Wizard spawn (65% chance, prefer shadow tiles far from knight/dragon)
  let wizardSpawn: { x: number; y: number } | undefined;
  if (rng() < WIZARD_SPAWN_CHANCE) {
    wizardSpawn = findWizardSpawn(tiles, knightSpawn, dragonSpawn, width, height, rng);
  }

  // Generate furniture
  const furniturePositions = generateFurniture(
    tiles, width, height, roomInfos, rng,
    knightSpawn, dragonSpawn, treasurePositions, torchPositions
  );

  // Validate reachability with furniture blocking — remove blocking furniture that breaks paths
  validateFurnitureReachability(
    furniturePositions, tiles, width, height,
    knightSpawn, dragonSpawn, treasurePositions
  );

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
    dragonHP: 80 + levelNum * 25,
    dragonSpeedMultiplier: 0.75 + levelNum * 0.15,
    dragonFireDamageMultiplier: Math.min(0.5 + levelNum * 0.2, 2.0),
    torchPositions,
    wizardSpawn,
    dragonStartsPatrolling: false,
    furniturePositions,
    additionalFloors: secondFloorResult ? [secondFloorResult.floor] : undefined,
    stairs: secondFloorResult?.stairs,
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
        } else if (tiles[y][x] === TileType.FLOOR) {
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
      if (tiles[y][x] === TileType.FLOOR) {
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
    const prev = waypoints[waypoints.length - 1];
    let added = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      const pos = findFloorTile(tiles, 2, 2, width - 4, height - 4, rng);
      if (isReachable(prev.x, prev.y, pos.x, pos.y, tiles, width, height)) {
        waypoints.push(pos);
        added = true;
        break;
      }
    }
    if (!added) {
      // If no reachable waypoint found, duplicate previous to keep patrol moving
      waypoints.push({ ...prev });
    }
  }
  return waypoints;
}

function findWizardSpawn(
  tiles: TileType[][],
  knightSpawn: { x: number; y: number },
  dragonSpawn: { x: number; y: number },
  width: number, height: number,
  rng: () => number
): { x: number; y: number } | undefined {
  const candidates: { x: number; y: number }[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y][x] !== TileType.FLOOR) continue;
      const distKnight = distance(x, y, knightSpawn.x, knightSpawn.y);
      const distDragon = distance(x, y, dragonSpawn.x, dragonSpawn.y);
      if (distKnight >= WIZARD_SPAWN_MIN_DIST_KNIGHT && distDragon >= WIZARD_SPAWN_MIN_DIST_DRAGON) {
        candidates.push({ x, y });
      }
    }
  }

  if (candidates.length === 0) return undefined;

  const pick = candidates[Math.floor(rng() * candidates.length)];
  return { x: pick.x, y: pick.y };
}

function generateTorchPositions(
  tiles: TileType[][],
  width: number, height: number,
  rooms: { x: number; y: number; w: number; h: number }[],
  rng: () => number
): { x: number; y: number; lit: boolean }[] {
  const torches: { x: number; y: number; lit: boolean }[] = [];
  const used = new Set<string>();

  // Find wall tiles adjacent to floor tiles (candidates for torches)
  const candidates: { x: number; y: number }[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y][x] !== TileType.WALL) continue;
      // Check if adjacent to a floor tile
      const neighbors = [
        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
      ];
      const hasFloor = neighbors.some(([nx, ny]) =>
        nx >= 0 && nx < width && ny >= 0 && ny < height &&
        TILE_PROPERTIES[tiles[ny][nx]].walkable
      );
      if (hasFloor) {
        candidates.push({ x, y });
      }
    }
  }

  // Place roughly 2 torches per room
  const targetCount = rooms.length * 2 + 2;
  // Shuffle candidates
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const c of candidates) {
    if (torches.length >= targetCount) break;
    const key = `${c.x},${c.y}`;
    if (used.has(key)) continue;

    // Ensure not too close to another torch
    const tooClose = torches.some(t => Math.abs(t.x - c.x) + Math.abs(t.y - c.y) < 3);
    if (tooClose) continue;

    used.add(key);
    torches.push({ x: c.x, y: c.y, lit: rng() < 0.7 });
  }

  return torches;
}

// ── Furniture Generation ─────────────────────────────────────────

interface RoomInfo {
  x: number; y: number; w: number; h: number;
  roomType: RoomType;
}

const FURNITURE_PALETTES: Record<RoomType, { type: FurnitureType; count: [number, number]; wallAdj: boolean }[]> = {
  [RoomType.THRONE_ROOM]: [
    { type: FurnitureType.RUG, count: [1, 1], wallAdj: false },
    { type: FurnitureType.BANNER, count: [2, 3], wallAdj: true },
    { type: FurnitureType.ARMOR_STAND, count: [1, 2], wallAdj: true },
    { type: FurnitureType.CHANDELIER, count: [1, 1], wallAdj: false },
    { type: FurnitureType.CHAIR, count: [1, 1], wallAdj: false },
    { type: FurnitureType.FIREPLACE, count: [0, 1], wallAdj: true },
  ],
  [RoomType.BEDROOM]: [
    { type: FurnitureType.BED, count: [1, 1], wallAdj: false },
    { type: FurnitureType.WARDROBE, count: [1, 1], wallAdj: true },
    { type: FurnitureType.TABLE, count: [1, 1], wallAdj: false },
    { type: FurnitureType.CHAIR, count: [1, 1], wallAdj: false },
    { type: FurnitureType.RUG, count: [0, 1], wallAdj: false },
    { type: FurnitureType.FIREPLACE, count: [0, 1], wallAdj: true },
  ],
  [RoomType.LIBRARY]: [
    { type: FurnitureType.BOOKSHELF, count: [2, 3], wallAdj: true },
    { type: FurnitureType.TABLE, count: [1, 1], wallAdj: false },
    { type: FurnitureType.CHAIR, count: [1, 2], wallAdj: false },
    { type: FurnitureType.CHANDELIER, count: [1, 1], wallAdj: false },
  ],
  [RoomType.STORAGE]: [
    { type: FurnitureType.BARREL, count: [2, 4], wallAdj: true },
    { type: FurnitureType.CRATE, count: [1, 3], wallAdj: true },
    { type: FurnitureType.TABLE, count: [0, 1], wallAdj: false },
    { type: FurnitureType.CAULDRON, count: [0, 1], wallAdj: false },
  ],
  [RoomType.ARMORY]: [
    { type: FurnitureType.ARMOR_STAND, count: [2, 3], wallAdj: true },
    { type: FurnitureType.WEAPON_RACK, count: [1, 2], wallAdj: true },
    { type: FurnitureType.BARREL, count: [0, 1], wallAdj: true },
    { type: FurnitureType.CRATE, count: [0, 1], wallAdj: true },
    { type: FurnitureType.BANNER, count: [1, 1], wallAdj: true },
  ],
  [RoomType.DINING_HALL]: [
    { type: FurnitureType.TABLE, count: [1, 2], wallAdj: false },
    { type: FurnitureType.CHAIR, count: [2, 4], wallAdj: false },
    { type: FurnitureType.BENCH, count: [1, 2], wallAdj: false },
    { type: FurnitureType.CHANDELIER, count: [1, 1], wallAdj: false },
    { type: FurnitureType.BANNER, count: [0, 1], wallAdj: true },
  ],
  [RoomType.COMMON]: [
    { type: FurnitureType.TABLE, count: [1, 1], wallAdj: false },
    { type: FurnitureType.CHAIR, count: [1, 2], wallAdj: false },
    { type: FurnitureType.BENCH, count: [0, 1], wallAdj: false },
    { type: FurnitureType.BARREL, count: [0, 1], wallAdj: true },
    { type: FurnitureType.WEAPON_RACK, count: [0, 1], wallAdj: true },
  ],
  [RoomType.COURTYARD]: [
    { type: FurnitureType.BARREL, count: [0, 1], wallAdj: true },
    { type: FurnitureType.BENCH, count: [0, 1], wallAdj: false },
    { type: FurnitureType.CRATE, count: [0, 1], wallAdj: true },
  ],
  [RoomType.KITCHEN]: [
    { type: FurnitureType.CAULDRON, count: [1, 2], wallAdj: false },
    { type: FurnitureType.FIREPLACE, count: [1, 1], wallAdj: true },
    { type: FurnitureType.TABLE, count: [1, 1], wallAdj: false },
    { type: FurnitureType.BARREL, count: [1, 2], wallAdj: true },
    { type: FurnitureType.CRATE, count: [0, 2], wallAdj: true },
  ],
  [RoomType.GREAT_HALL]: [
    { type: FurnitureType.FIREPLACE, count: [1, 1], wallAdj: true },
    { type: FurnitureType.BENCH, count: [2, 3], wallAdj: false },
    { type: FurnitureType.TABLE, count: [1, 1], wallAdj: false },
    { type: FurnitureType.RUG, count: [1, 1], wallAdj: false },
    { type: FurnitureType.CHANDELIER, count: [1, 1], wallAdj: false },
    { type: FurnitureType.BANNER, count: [1, 2], wallAdj: true },
    { type: FurnitureType.CHAIR, count: [0, 1], wallAdj: false },
  ],
};

function assignRoomType(room: { w: number; h: number }, rng: () => number): RoomType {
  const area = room.w * room.h;
  if (area >= 40) {
    const r = rng();
    if (r < 0.30) return RoomType.THRONE_ROOM;
    if (r < 0.55) return RoomType.GREAT_HALL;
    if (r < 0.80) return RoomType.DINING_HALL;
    return RoomType.COURTYARD;
  } else if (area >= 30) {
    const r = rng();
    if (r < 0.20) return RoomType.LIBRARY;
    if (r < 0.35) return RoomType.DINING_HALL;
    if (r < 0.55) return RoomType.BEDROOM;
    if (r < 0.70) return RoomType.GREAT_HALL;
    if (r < 0.85) return RoomType.KITCHEN;
    return RoomType.COURTYARD;
  } else if (area >= 16) {
    const r = rng();
    if (r < 0.25) return RoomType.BEDROOM;
    if (r < 0.45) return RoomType.ARMORY;
    if (r < 0.65) return RoomType.KITCHEN;
    if (r < 0.85) return RoomType.COMMON;
    return RoomType.STORAGE;
  } else {
    const r = rng();
    if (r < 0.40) return RoomType.STORAGE;
    if (r < 0.70) return RoomType.COMMON;
    return RoomType.KITCHEN;
  }
}

function generateFurniture(
  tiles: TileType[][],
  width: number, height: number,
  roomInfos: RoomInfo[],
  rng: () => number,
  knightSpawn: { x: number; y: number },
  dragonSpawn: { x: number; y: number },
  treasures: { x: number; y: number }[],
  torches: { x: number; y: number }[]
): FurnitureState[] {
  const furniture: FurnitureState[] = [];
  const occupied = new Set<string>();

  // Build exclusion zones: spawns, treasures, torches, doors
  const excluded = new Set<string>();
  excluded.add(`${knightSpawn.x},${knightSpawn.y}`);
  excluded.add(`${dragonSpawn.x},${dragonSpawn.y}`);
  for (const t of treasures) excluded.add(`${t.x},${t.y}`);
  for (const t of torches) excluded.add(`${t.x},${t.y}`);

  // Exclude door tiles and 1-tile around doors
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x] === TileType.DOOR) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            excluded.add(`${x + dx},${y + dy}`);
          }
        }
      }
    }
  }

  const isWalkable = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && y < height && TILE_PROPERTIES[tiles[y][x]].walkable;

  const isWall = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && y < height &&
    (tiles[y][x] === TileType.WALL || tiles[y][x] === TileType.ELEVATED_WALL);

  const canPlace = (x: number, y: number) => {
    const key = `${x},${y}`;
    return isWalkable(x, y) && !excluded.has(key) && !occupied.has(key);
  };

  for (const room of roomInfos) {
    const area = room.w * room.h;
    const maxItems = Math.floor(area * 0.15);
    let placed = 0;

    const palette = FURNITURE_PALETTES[room.roomType];

    for (const entry of palette) {
      if (placed >= maxItems) break;
      const count = entry.count[0] + Math.floor(rng() * (entry.count[1] - entry.count[0] + 1));

      for (let c = 0; c < count && placed < maxItems; c++) {
        const variant = Math.floor(rng() * 3);
        let result: { x: number; y: number; rotation: number } | null = null;

        if (entry.type === FurnitureType.CHANDELIER) {
          // Place at room center
          const cx = room.x + Math.floor(room.w / 2);
          const cy = room.y + Math.floor(room.h / 2);
          if (canPlace(cx, cy)) {
            result = { x: cx, y: cy, rotation: 0 };
          }
        } else if (entry.type === FurnitureType.BANNER || entry.type === FurnitureType.FIREPLACE) {
          // Wall-mounted furniture goes on wall tiles adjacent to floor
          result = findWallPlacement(room, tiles, width, height, excluded, occupied, torches, rng);
        } else if (entry.wallAdj) {
          // Wall-adjacent floor tiles
          result = findWallAdjacentFloor(room, tiles, width, height, canPlace, occupied, rng, isWall);
        } else {
          // Interior floor tiles (1+ tile from walls)
          result = findInteriorFloor(room, canPlace, occupied, rng, isWall);
        }

        if (result) {
          furniture.push({
            x: result.x, y: result.y,
            type: entry.type,
            rotation: result.rotation,
            variant,
          });
          occupied.add(`${result.x},${result.y}`);
          placed++;
        }
      }
    }
  }

  return furniture;
}

function findWallPlacement(
  room: RoomInfo,
  tiles: TileType[][],
  width: number, height: number,
  excluded: Set<string>,
  occupied: Set<string>,
  torches: { x: number; y: number }[],
  rng: () => number
): { x: number; y: number; rotation: number } | null {
  const candidates: { x: number; y: number; rotation: number }[] = [];
  const torchSet = new Set(torches.map(t => `${t.x},${t.y}`));

  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (tiles[y][x] !== TileType.WALL) continue;
      const key = `${x},${y}`;
      if (excluded.has(key) || occupied.has(key) || torchSet.has(key)) continue;

      // Check adjacent walkable tile for orientation
      const dirs = [
        { dx: 0, dy: -1, angle: 0 },
        { dx: 1, dy: 0, angle: -Math.PI / 2 },
        { dx: 0, dy: 1, angle: Math.PI },
        { dx: -1, dy: 0, angle: Math.PI / 2 },
      ];
      for (const dir of dirs) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && TILE_PROPERTIES[tiles[ny][nx]].walkable) {
          candidates.push({ x, y, rotation: dir.angle });
          break;
        }
      }
    }
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)];
}

function findWallAdjacentFloor(
  room: RoomInfo,
  tiles: TileType[][],
  width: number, height: number,
  canPlace: (x: number, y: number) => boolean,
  occupied: Set<string>,
  rng: () => number,
  isWall: (x: number, y: number) => boolean
): { x: number; y: number; rotation: number } | null {
  const candidates: { x: number; y: number; rotation: number }[] = [];
  const dirs = [
    { dx: 0, dy: -1, angle: Math.PI },    // wall is north, face south
    { dx: 1, dy: 0, angle: -Math.PI / 2 }, // wall is east, face west
    { dx: 0, dy: 1, angle: 0 },            // wall is south, face north
    { dx: -1, dy: 0, angle: Math.PI / 2 }, // wall is west, face east
  ];

  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (!canPlace(x, y)) continue;
      for (const dir of dirs) {
        if (isWall(x + dir.dx, y + dir.dy)) {
          candidates.push({ x, y, rotation: dir.angle });
          break;
        }
      }
    }
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)];
}

function findInteriorFloor(
  room: RoomInfo,
  canPlace: (x: number, y: number) => boolean,
  occupied: Set<string>,
  rng: () => number,
  isWall: (x: number, y: number) => boolean
): { x: number; y: number; rotation: number } | null {
  const candidates: { x: number; y: number }[] = [];

  for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
    for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
      if (!canPlace(x, y)) continue;
      // Ensure not adjacent to a wall
      const adjWall = isWall(x - 1, y) || isWall(x + 1, y) || isWall(x, y - 1) || isWall(x, y + 1);
      if (!adjWall) {
        candidates.push({ x, y });
      }
    }
  }

  if (candidates.length === 0) {
    // Fallback: allow wall-adjacent interior tiles
    for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
      for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
        if (canPlace(x, y)) candidates.push({ x, y });
      }
    }
  }

  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(rng() * candidates.length)];
  const rotation = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2][Math.floor(rng() * 4)];
  return { x: pick.x, y: pick.y, rotation };
}

/**
 * Generate a second floor for the level.
 * Picks ~30% of rooms, carves them on floor 1, places stairs on both floors.
 */
function generateSecondFloor(
  mainTiles: TileType[][],
  width: number, height: number,
  rooms: { x: number; y: number; w: number; h: number }[],
  rng: () => number,
  levelNum: number
): { floor: FloorData; stairs: StairConnection[] } | null {
  if (rooms.length < 2) return null;

  // Pick ~30% of rooms for the second floor (min 1)
  const numFloor1Rooms = Math.max(1, Math.floor(rooms.length * 0.3));
  const shuffled = [...rooms].sort(() => rng() - 0.5);
  const selectedRooms = shuffled.slice(0, numFloor1Rooms).filter(r => r.w >= 4 && r.h >= 4);

  if (selectedRooms.length === 0) return null;

  // Create floor 1 tile grid (mostly walls)
  const floor1Tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) {
    floor1Tiles[y] = new Array(width).fill(TileType.WALL);
  }

  // Carve selected rooms as floor tiles on floor 1
  for (const room of selectedRooms) {
    for (let y = room.y; y < room.y + room.h && y < height; y++) {
      for (let x = room.x; x < room.x + room.w && x < width; x++) {
        if (x > room.x && x < room.x + room.w - 1 && y > room.y && y < room.y + room.h - 1) {
          floor1Tiles[y][x] = TileType.FLOOR;
        }
      }
    }
  }

  // Place stairs connecting floors at room edges near doors
  const stairs: StairConnection[] = [];
  for (const room of selectedRooms) {
    // Find a door or floor tile on the border of this room on the main floor
    let stairPlaced = false;
    for (let y = room.y; y < room.y + room.h && !stairPlaced; y++) {
      for (let x = room.x; x < room.x + room.w && !stairPlaced; x++) {
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        const isEdge = x === room.x || x === room.x + room.w - 1 || y === room.y || y === room.y + room.h - 1;
        if (!isEdge) continue;
        if (mainTiles[y][x] === TileType.DOOR || mainTiles[y][x] === TileType.FLOOR) {
          // Place stair on main floor
          mainTiles[y][x] = TileType.STAIRS;

          // Place corresponding stair on floor 1 — find interior tile adjacent to edge
          let f1x = x, f1y = y;
          // Move one tile inward from the edge
          if (x === room.x) f1x = x + 1;
          else if (x === room.x + room.w - 1) f1x = x - 1;
          if (y === room.y) f1y = y + 1;
          else if (y === room.y + room.h - 1) f1y = y - 1;

          if (f1x > 0 && f1x < width - 1 && f1y > 0 && f1y < height - 1) {
            floor1Tiles[f1y][f1x] = TileType.STAIRS;

            stairs.push({
              fromFloor: 0, fromX: x, fromY: y,
              toFloor: 1, toX: f1x, toY: f1y,
            });
            stairs.push({
              fromFloor: 1, fromX: f1x, fromY: f1y,
              toFloor: 0, toX: x, toY: y,
            });
            stairPlaced = true;
          }
        }
      }
    }
  }

  if (stairs.length === 0) return null;

  // Place treasures on floor 1 (1-2 per selected room)
  const floor1Treasures: TreasureState[] = [];
  const powerUpTypes = Object.values(PowerUpType);
  for (const room of selectedRooms) {
    const count = 1 + Math.floor(rng() * 2);
    for (let c = 0; c < count; c++) {
      const pos = findFloorTile(floor1Tiles, room.x + 1, room.y + 1, Math.max(1, room.w - 2), Math.max(1, room.h - 2), rng);
      if (floor1Tiles[pos.y]?.[pos.x] === TileType.FLOOR) {
        floor1Treasures.push({
          x: pos.x, y: pos.y,
          type: powerUpTypes[Math.floor(rng() * powerUpTypes.length)],
          collected: false,
        });
      }
    }
  }

  // Build wood wall HP for floor 1
  const floor1WoodWallHP = new Map<string, number>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (floor1Tiles[y][x] === TileType.WOOD_WALL) {
        floor1WoodWallHP.set(`${x},${y}`, WOOD_WALL_HP);
      }
    }
  }

  const floor1Data: FloorData = {
    tiles: floor1Tiles,
    width,
    height,
    furniture: [],
    torches: [],
    treasures: floor1Treasures,
    woodWallHP: floor1WoodWallHP,
    burningTiles: new Map(),
    furnitureBlocked: new Set(),
    wardrobeHP: new Map(),
    brokenFurniture: new Set(),
  };

  return { floor: floor1Data, stairs };
}

/**
 * Remove blocking furniture that would make knight→dragon or knight→treasures unreachable.
 */
function validateFurnitureReachability(
  furniture: FurnitureState[],
  tiles: TileType[][],
  width: number, height: number,
  knightSpawn: { x: number; y: number },
  dragonSpawn: { x: number; y: number },
  treasures: { x: number; y: number }[]
): void {
  // Build blocked set from blocking furniture
  const blocked = new Set<string>();
  for (const f of furniture) {
    if (BLOCKING_FURNITURE.has(f.type)) {
      blocked.add(`${f.x},${f.y}`);
    }
  }

  // Check all critical paths
  const targets = [dragonSpawn, ...treasures];
  const toRemove = new Set<number>();

  for (const target of targets) {
    if (isReachable(knightSpawn.x, knightSpawn.y, target.x, target.y, tiles, width, height, blocked)) {
      continue;
    }

    // Path blocked — remove blocking furniture one at a time until reachable
    for (let i = furniture.length - 1; i >= 0; i--) {
      if (toRemove.has(i)) continue;
      const f = furniture[i];
      if (!BLOCKING_FURNITURE.has(f.type)) continue;
      const key = `${f.x},${f.y}`;
      blocked.delete(key);
      toRemove.add(i);
      if (isReachable(knightSpawn.x, knightSpawn.y, target.x, target.y, tiles, width, height, blocked)) {
        break;
      }
    }
  }

  // Remove furniture entries in reverse order to preserve indices
  const sorted = [...toRemove].sort((a, b) => b - a);
  for (const idx of sorted) {
    furniture.splice(idx, 1);
  }
}
