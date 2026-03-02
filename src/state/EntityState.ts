export enum PowerUpType {
  HEAL = 'heal',
  ATTACK_BOOST = 'attack_boost',
  SPEED_BOOST = 'speed_boost',
  SHADOW_CLOAK = 'shadow_cloak',
  FIRE_RESIST = 'fire_resist',
  HP_BOOST = 'hp_boost',
}

export interface ActivePowerUp {
  type: PowerUpType;
  expiresAt: number;
  multiplier: number;
}

export enum DragonAIState {
  SLEEP = 'SLEEP',
  PATROL = 'PATROL',
  ALERT = 'ALERT',
  ATTACK = 'ATTACK',
  SEARCH = 'SEARCH',
}

export interface KnightState {
  x: number;  // world position (tile-unit float)
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHP: number;
  speed: number;
  baseSpeed: number;
  attackPower: number;
  baseAttackPower: number;
  facingAngle: number;
  isMoving: boolean;
  isAttacking: boolean;
  attackHitProcessed: boolean;
  attackCooldown: number;
  isCloaked: boolean;
  hasFireResist: boolean;
  fireResistMultiplier: number;
  activePowerUps: ActivePowerUp[];

  // Joystick input from mobile
  joystickForceX: number;
  joystickForceY: number;
  mobileAttackPressed: boolean;
}

export interface DragonStateData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHP: number;
  speed: number;
  baseSpeed: number;
  speedMultiplier: number;
  facingAngle: number;
  fovRange: number;
  fovAngle: number;
  aiState: DragonAIState;
  waypoints: { x: number; y: number }[];
  currentWaypointIndex: number;
  alertTimer: number;
  searchTimer: number;
  lastKnownPlayerPos: { x: number; y: number } | null;
  fireDamageMultiplier: number;
  fireBreathing: boolean;
  searchFiring: boolean;
  hasBeenRevealed: boolean;
  currentPath: { x: number; y: number }[] | null;
  currentPathIndex: number;
  waypointStuckTimer: number;
  lastPathTarget: { x: number; y: number } | null;
  lastPathComputeTime: number;
}

export function createKnightState(tileX: number, tileY: number, maxHP: number, baseAttack: number): KnightState {
  return {
    x: tileX + 0.5,
    y: tileY + 0.5,
    vx: 0,
    vy: 0,
    hp: maxHP,
    maxHP,
    speed: 5, // tiles per second
    baseSpeed: 5,
    attackPower: baseAttack,
    baseAttackPower: baseAttack,
    facingAngle: 0,
    isMoving: false,
    isAttacking: false,
    attackHitProcessed: false,
    attackCooldown: 0,
    isCloaked: false,
    hasFireResist: false,
    fireResistMultiplier: 1,
    activePowerUps: [],
    joystickForceX: 0,
    joystickForceY: 0,
    mobileAttackPressed: false,
  };
}

export function createDragonState(
  tileX: number, tileY: number,
  hp: number,
  waypoints: { x: number; y: number }[],
  speedMultiplier: number,
  fovRange: number,
  fovAngle: number,
  fireDamageMultiplier: number = 1.0,
  initialState: DragonAIState = DragonAIState.SLEEP
): DragonStateData {
  return {
    x: tileX + 0.5,
    y: tileY + 0.5,
    vx: 0,
    vy: 0,
    hp,
    maxHP: hp,
    speed: 2.5 * speedMultiplier, // tiles per second
    baseSpeed: 2.5,
    speedMultiplier,
    facingAngle: 0,
    fovRange,
    fovAngle,
    aiState: initialState,
    waypoints,
    currentWaypointIndex: 0,
    alertTimer: 0,
    searchTimer: 0,
    lastKnownPlayerPos: null,
    fireDamageMultiplier,
    fireBreathing: false,
    searchFiring: false,
    hasBeenRevealed: false,
    currentPath: null,
    currentPathIndex: 0,
    waypointStuckTimer: 0,
    lastPathTarget: null,
    lastPathComputeTime: 0,
  };
}

// ── Wizard ──────────────────────────────────────────────────

export enum WizardDialogStatus {
  HIDDEN = 'HIDDEN',
  REVEALED = 'REVEALED',
  AVAILABLE = 'AVAILABLE',
  DRAGON_NEARBY = 'DRAGON_NEARBY',
  CHATTING = 'CHATTING',
  COMPLETED = 'COMPLETED',
}

export interface WizardState {
  x: number;
  y: number;
  dialogStatus: WizardDialogStatus;
  riddleAnswered: boolean;
  riddleDifficulty: number; // based on level
}

export function createWizardState(tileX: number, tileY: number, level: number): WizardState {
  return {
    x: tileX + 0.5,
    y: tileY + 0.5,
    dialogStatus: WizardDialogStatus.HIDDEN,
    riddleAnswered: false,
    riddleDifficulty: Math.min(level, 10),
  };
}

export function entityTileX(e: { x: number }): number {
  return Math.floor(e.x);
}

export function entityTileY(e: { y: number }): number {
  return Math.floor(e.y);
}

export function takeDamage(e: { hp: number }, amount: number): void {
  e.hp = Math.max(0, e.hp - amount);
}

export function heal(e: { hp: number; maxHP: number }, amount: number): void {
  e.hp = Math.min(e.maxHP, e.hp + amount);
}

export function isAlive(e: { hp: number }): boolean {
  return e.hp > 0;
}
