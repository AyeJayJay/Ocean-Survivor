/*
 * GameConfig — shared constants for Ocean Survivor
 *
 * All scene files import from here so tuning any value (physics, sizing,
 * difficulty) requires only one change. Units are pixels and milliseconds
 * unless otherwise noted.
 */

// ── Canvas dimensions ─────────────────────────────────────────────────────────
export const GAME_WIDTH  = 480;
export const GAME_HEIGHT = 854;   // ~9:18 portrait ratio, looks great on mobile

// ── Player ────────────────────────────────────────────────────────────────────
export const PLAYER_X          = 110;
export const PLAYER_RADIUS     = 18;   // collision radius
export const GRAVITY_Y         = 1700; // px/s² (Arcade physics world gravity is 0; we apply per-body)
export const JUMP_VELOCITY     = -560; // px/s (negative = upward)
export const MAX_FALL_VELOCITY = 750;  // px/s clamp

// ── Obstacles ─────────────────────────────────────────────────────────────────
export const OBSTACLE_WIDTH    = 78;   // px, horizontal thickness of each pillar
export const INITIAL_GAP       = 205;  // vertical gap between top/bottom pillars
export const MIN_GAP           = 148;  // gap stops shrinking below this
export const GAP_SHRINK_RATE   = 0.25; // gap reduction per obstacle cleared
export const INITIAL_SPEED     = 188;  // px/s scroll speed
export const MAX_SPEED         = 340;  // px/s max scroll speed
export const SPEED_RAMP        = 7;    // px/s² ramp (per second of play)
export const OBSTACLE_SPACING  = 310;  // px between obstacle pairs (x-axis)
export const SPAWN_MARGIN      = 120;  // min px from top/bottom edge for gapY center

// ── Shells (collectibles) ─────────────────────────────────────────────────────
export const SHELL_RADIUS      = 14;   // visual + collision radius
export const SHELL_INTERVAL_MS = 5000; // ms between shell spawns
export const SHELL_SPEED_RATIO = 0.85; // shells move slightly slower than obstacles

// ── Scoring ───────────────────────────────────────────────────────────────────
// Distance-based: score increments continuously as the turtle swims.
// Every SCORE_DIST_DIVISOR pixels traveled = +1 point.
export const SCORE_DIST_DIVISOR = 15; // px per score point (~12.5 pts/s at start)
// Gap shrinks every GAP_SHRINK_INTERVAL obstacle pairs cleared
export const GAP_SHRINK_INTERVAL = 1; // shrink every cleared pair

// ── LocalStorage keys ─────────────────────────────────────────────────────────
export const LS_HIGH_SCORE = "os_high_score"; // legacy key — SaveManager migrates from this
export const LS_SAVE_KEY   = "os_save_v1";    // versioned save managed by SaveManager

// ── Scene keys ────────────────────────────────────────────────────────────────
export const SCENE = {
  BOOT:      "BootScene",
  PRELOAD:   "PreloadScene",
  MAIN_MENU: "MainMenuScene",
  GAME:      "GameScene",
  GAME_OVER: "GameOverScene",
} as const;

// ── Texture keys ──────────────────────────────────────────────────────────────
export const TEX = {
  PIXEL: "pixel",
} as const;

// ── Obstacle types ────────────────────────────────────────────────────────────
export const OBSTACLE_TYPES = [
  "plastic_bag",
  "fishing_net",
  "oil_blob",
  "soda_rings",
  "jellyfish",
  "shark",
  "fishing_hook",
  "boat",
] as const;

export type ObstacleType = (typeof OBSTACLE_TYPES)[number];
