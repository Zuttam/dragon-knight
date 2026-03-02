// Camera
export const TILT_FACTOR = 1.229;

// Knight
export const KNIGHT_MAX_HP = 100;
export const KNIGHT_BASE_ATTACK = 10;
export const KNIGHT_SURPRISE_MULTIPLIER = 3;

// Dragon
export const DRAGON_MAX_HP = 50;
export const DRAGON_FOV_RANGE = 6; // tiles
export const DRAGON_FOV_ANGLE = Math.PI / 3; // 60 degrees total (30 each side)
export const DRAGON_FIRE_DAMAGE_PER_SEC = 20;
export const DRAGON_FIRE_RANGE = 4; // tiles
export const DRAGON_ALERT_DURATION = 800; // ms
export const DRAGON_SEARCH_DURATION = 4000; // ms
export const DRAGON_NOISE_DETECT_RANGE = 3; // tiles, through walls
export const DRAGON_WAYPOINT_TIMEOUT = 5000; // ms, skip unreachable waypoint
export const DRAGON_REPATH_INTERVAL = 500; // ms, repath frequency in ATTACK

// Shadow
export const SHADOW_DETECTION_MULTIPLIER = 0.5;

// Power-ups
export const POWERUP_HEAL_AMOUNT = 30;
export const POWERUP_ATTACK_BOOST = 1.5;
export const POWERUP_SPEED_BOOST = 1.4;
export const POWERUP_CLOAK_DURATION = 5000; // ms
export const POWERUP_FIRE_RESIST_DURATION = 8000; // ms
export const POWERUP_FIRE_RESIST_MULTIPLIER = 0.3;
export const POWERUP_HP_BOOST_AMOUNT = 20;

// Wood wall
export const WOOD_WALL_HP = 3;
export const BURNING_WOOD_DURATION = 3000; // ms
export const BURNING_WOOD_DAMAGE_PER_SEC = 15;

// Dragon visibility
export const DRAGON_VISIBILITY_FADE_START = 6; // tiles
export const DRAGON_VISIBILITY_FADE_END = 10; // tiles

// Wizard
export const WIZARD_INTERACTION_RANGE = 2;        // tiles to trigger dialog
export const WIZARD_DRAGON_SAFETY_RANGE = 8;      // min dragon distance for wizard to engage
export const WIZARD_SPAWN_MIN_DIST_KNIGHT = 8;    // min distance from knight spawn
export const WIZARD_SPAWN_MIN_DIST_DRAGON = 10;   // min distance from dragon spawn
export const WIZARD_VISIBILITY_RANGE = 5;         // shimmer visible range
export const WIZARD_SPAWN_CHANCE = 0.65;          // 65% chance per level
export const WIZARD_HEAL_AMOUNT = 80;
export const WIZARD_ATTACK_BOOST = 2.5;
export const WIZARD_SPEED_BOOST = 1.8;
export const WIZARD_CLOAK_DURATION = 15000;       // ms
export const WIZARD_FIRE_RESIST_DURATION = 20000; // ms
export const WIZARD_HP_BOOST_AMOUNT = 50;
export const WIZARD_REWARD_DURATION = 20000;      // how long boosted power-ups last

// LLM Models
export const MODELS_BY_PROVIDER: Record<string, { id: string; label: string }[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { id: 'claude-sonnet-4-5-20250514', label: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'gpt-5.2', label: 'GPT-5.2' },
    { id: 'gpt-5', label: 'GPT-5' },
    { id: 'gpt-5-mini', label: 'GPT-5 Mini' },
    { id: 'gpt-5-nano', label: 'GPT-5 Nano' },
  ],
};
