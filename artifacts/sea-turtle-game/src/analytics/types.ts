/*
 * Shared types used by both Analytics.ts and AdFrequencyManager.ts
 * to avoid circular imports.
 */

export interface FrequencyConfig {
  interstitialCooldownMs: number;
  newUserInterstitialCooldownMs: number;
  maxInterstitialsPerSession: number;
  newUserMaxInterstitialsPerSession: number;
  rewardedGracePeriodMs: number;
  newUserSessionThreshold: number;
}

export type AnalyticsEventType =
  | "session_start"
  | "game_start"
  | "game_over"
  | "game_revived"
  | "theme_reached"
  | "interstitial_impression"
  | "interstitial_dismissed"
  | "interstitial_suppressed"
  | "rewarded_preroll_shown"
  | "rewarded_declined"
  | "rewarded_started"
  | "rewarded_skipped"
  | "rewarded_completed"
  | "rewarded_game_over_preroll_shown"
  | "rewarded_game_over_completed"
  | "banner_impression"
  | "interstitial_cta_click"
  | "ad_consent_accepted"
  | "ad_consent_declined";
