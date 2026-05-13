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

export type SceneName =
  | "MainMenu"
  | "Game"
  | "GameOver"
  | "SkinSelect"
  | "Settings"
  | "Achievement";

export interface ScenePayload {
  scene: SceneName;
  from?: SceneName; // where did we come from (for back button)
}

export interface AchievementToastPayload {
  id: string;
  name: string;
  icon: string;
}

// ── Command events (React → Phaser) ───────────────────────────────────────────

export interface ReviveCommandPayload {
  revived: boolean; // true = revive granted, false = declined
}

// ── Event name constants ───────────────────────────────────────────────────────

const EV = {
  GAME_STATE:         "os:game-state",        // Phaser → React
  SCENE_CHANGE:       "os:scene-change",      // Phaser → React
  COMMAND:            "os:command",           // React  → Phaser
  ACHIEVEMENT_TOAST:  "os:achievement-toast", // Phaser → React
  GAME_OVER_AD:       "os:game-over-ad",      // bidirectional (request + result)
  PRIVACY_POLICY:     "os:privacy-policy",    // Phaser → React (open /privacy route)
  AD_PREFERENCES:     "os:ad-preferences",   // Phaser → React (re-show consent modal)
  ABOUT:              "os:about",             // Phaser → React (open /about route)
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

export function emitAchievementToast(payload: AchievementToastPayload): void {
  window.dispatchEvent(new CustomEvent(EV.ACHIEVEMENT_TOAST, { detail: payload }));
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

export function onAchievementToast(cb: (p: AchievementToastPayload) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<AchievementToastPayload>).detail);
  window.addEventListener(EV.ACHIEVEMENT_TOAST, handler);
  return () => window.removeEventListener(EV.ACHIEVEMENT_TOAST, handler);
}

// ── Game-over rewarded ad (bidirectional) ─────────────────────────────────────

export interface GameOverAdPayload { type: "request" | "result"; rewarded?: boolean; }

/** GameOverScene → React: ask for a rewarded ad to unlock a free replay. */
export function emitGameOverAdRequest(): void {
  window.dispatchEvent(new CustomEvent(EV.GAME_OVER_AD, { detail: { type: "request" } }));
}

/** React → GameOverScene: notify whether the ad was completed. */
export function emitGameOverAdResult(payload: { rewarded: boolean }): void {
  window.dispatchEvent(new CustomEvent(EV.GAME_OVER_AD, { detail: { type: "result", ...payload } }));
}

export function onGameOverAd(cb: (p: GameOverAdPayload) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<GameOverAdPayload>).detail);
  window.addEventListener(EV.GAME_OVER_AD, handler);
  return () => window.removeEventListener(EV.GAME_OVER_AD, handler);
}

// ── Privacy policy (Phaser → React) ─────────────────────────────────────────

/** SettingsScene → React: open the in-app privacy policy overlay. */
export function emitPrivacyPolicy(): void {
  window.dispatchEvent(new CustomEvent(EV.PRIVACY_POLICY));
}

export function onPrivacyPolicy(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EV.PRIVACY_POLICY, handler);
  return () => window.removeEventListener(EV.PRIVACY_POLICY, handler);
}

// ── Ad preferences (Phaser → React) ─────────────────────────────────────────

/** SettingsScene → React: re-show the AdConsentModal so the user can change
 *  their personalized / non-personalized ad preference. */
export function emitAdPreferences(): void {
  window.dispatchEvent(new CustomEvent(EV.AD_PREFERENCES));
}

export function onAdPreferences(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EV.AD_PREFERENCES, handler);
  return () => window.removeEventListener(EV.AD_PREFERENCES, handler);
}

// ── About screen (Phaser → React) ────────────────────────────────────────────

/** SettingsScene → React: navigate to the About & Terms screen. */
export function emitAbout(): void {
  window.dispatchEvent(new CustomEvent(EV.ABOUT));
}

export function onAbout(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EV.ABOUT, handler);
  return () => window.removeEventListener(EV.ABOUT, handler);
}
