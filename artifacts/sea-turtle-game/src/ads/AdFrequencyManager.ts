/*
 * AdFrequencyManager — centralized ad exposure tracking for Sea Turtle Dash
 *
 * Frequency config is driven by the user's assigned A/B variant so that
 * each cohort experiences different ad cadences. All results are logged
 * to the analytics module for downstream analysis.
 *
 * Rules enforced (per variant — see ABTest.ts for exact values):
 *  - New users (first N sessions): lower cap, longer cooldown
 *  - Regular users: higher cap, standard cooldown
 *  - After a rewarded ad is fully watched: grace period before any interstitial
 *  - Rewarded ads are never frequency-capped (player opts in voluntarily)
 */

import { getVariant } from "../analytics/ABTest";
import type { FrequencyConfig } from "../analytics/types";

const LS_TOTAL_SESSIONS = "stg_total_sessions";

export interface AdDecision {
  allowed: boolean;
  reason?: string; // debug only, never shown to users
}

class AdFrequencyManager {
  private readonly config: FrequencyConfig;
  private readonly sessionStart = Date.now();
  private readonly totalSessions: number;
  private readonly isNewUser: boolean;

  private interstitialsThisSession = 0;
  private lastInterstitialTime = 0;
  private lastRewardedTime = 0;

  constructor() {
    this.config = getVariant().adConfig;

    const stored = parseInt(localStorage.getItem(LS_TOTAL_SESSIONS) ?? "0", 10);
    this.totalSessions = stored + 1;
    localStorage.setItem(LS_TOTAL_SESSIONS, String(this.totalSessions));

    this.isNewUser = this.totalSessions <= this.config.newUserSessionThreshold;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Check whether an interstitial is permitted right now.
   * Does NOT record the impression — call recordInterstitial() if you proceed.
   */
  canShowInterstitial(): AdDecision {
    const now = Date.now();
    const cooldown = this.isNewUser
      ? this.config.newUserInterstitialCooldownMs
      : this.config.interstitialCooldownMs;
    const cap = this.isNewUser
      ? this.config.newUserMaxInterstitialsPerSession
      : this.config.maxInterstitialsPerSession;

    if (this.interstitialsThisSession >= cap) {
      return { allowed: false, reason: `session cap reached (${cap})` };
    }

    const sinceLastInterstitial = now - this.lastInterstitialTime;
    if (sinceLastInterstitial < cooldown) {
      const wait = Math.ceil((cooldown - sinceLastInterstitial) / 1000);
      return { allowed: false, reason: `cooldown: ${wait}s remaining` };
    }

    const sinceRewarded = now - this.lastRewardedTime;
    if (this.lastRewardedTime > 0 && sinceRewarded < this.config.rewardedGracePeriodMs) {
      const wait = Math.ceil((this.config.rewardedGracePeriodMs - sinceRewarded) / 1000);
      return { allowed: false, reason: `rewarded grace: ${wait}s remaining` };
    }

    return { allowed: true };
  }

  /** Call immediately after showing an interstitial. */
  recordInterstitial(): void {
    this.lastInterstitialTime = Date.now();
    this.interstitialsThisSession++;
  }

  /** Call when a rewarded ad is fully watched (reward granted). */
  recordRewardedAd(): void {
    this.lastRewardedTime = Date.now();
  }

  // ── Read-only state ───────────────────────────────────────────────────────

  get sessionAgeMs(): number { return Date.now() - this.sessionStart; }
  get isFirstSession(): boolean { return this.totalSessions === 1; }
  get sessionNumber(): number { return this.totalSessions; }
  get interstitialCount(): number { return this.interstitialsThisSession; }
  get newUser(): boolean { return this.isNewUser; }
}

// Singleton — one instance for the lifetime of the page
export const adFrequencyManager = new AdFrequencyManager();
