/*
 * EventBus — typed window CustomEvent bridge between Phaser and React
 *
 * Phaser scenes are isolated from the React component tree. This module
 * provides a thin event channel so each side can stay decoupled:
 *
 *   Phaser → React  :  emitGame(...)   — state, death, trash collected, etc.
 *   React  → Phaser :  emitCommand(…)  — revive, restart, etc.
 *
 * Both sides listen with listenGame / listenCommand and unsubscribe with
 * the returned cleanup functions.
 */

// ── Game events (Phaser → React) ──────────────────────────────────────────────

export type GameUIState = "idle" | "playing" | "dead";

export interface GameStatePayload {
  state: GameUIState;
  score: number;
  bestScore: number;
  reviveAvailable: boolean; // true if the run hasn't used a revive yet
  shellsThisRun: number;
}

export interface ScenePayload {
  scene: "MainMenu" | "Game" | "GameOver";
}

// ── Command events (React → Phaser) ───────────────────────────────────────────

export interface ReviveCommandPayload {
  revived: boolean; // true = revive granted, false = declined
}

// ── Event name constants ───────────────────────────────────────────────────────

const EV = {
  GAME_STATE:   "os:game-state",   // Phaser → React
  SCENE_CHANGE: "os:scene-change", // Phaser → React
  COMMAND:      "os:command",      // React  → Phaser
} as const;

// ── Emit helpers ──────────────────────────────────────────────────────────────

export function emitGameState(payload: GameStatePayload): void {
  window.dispatchEvent(new CustomEvent(EV.GAME_STATE, { detail: payload }));
}

export function emitSceneChange(payload: ScenePayload): void {
  window.dispatchEvent(new CustomEvent(EV.SCENE_CHANGE, { detail: payload }));
}

export function emitReviveCommand(payload: ReviveCommandPayload): void {
  window.dispatchEvent(new CustomEvent(EV.COMMAND, { detail: { type: "revive", ...payload } }));
}

export function emitRestartCommand(): void {
  window.dispatchEvent(new CustomEvent(EV.COMMAND, { detail: { type: "restart" } }));
}

// ── Listen helpers (return cleanup function) ──────────────────────────────────

export function onGameState(cb: (p: GameStatePayload) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<GameStatePayload>).detail);
  window.addEventListener(EV.GAME_STATE, handler);
  return () => window.removeEventListener(EV.GAME_STATE, handler);
}

export function onSceneChange(cb: (p: ScenePayload) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<ScenePayload>).detail);
  window.addEventListener(EV.SCENE_CHANGE, handler);
  return () => window.removeEventListener(EV.SCENE_CHANGE, handler);
}

export function onCommand(cb: (detail: Record<string, unknown>) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<Record<string, unknown>>).detail);
  window.addEventListener(EV.COMMAND, handler);
  return () => window.removeEventListener(EV.COMMAND, handler);
}
