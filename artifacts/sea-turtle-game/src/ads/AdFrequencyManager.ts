/*
 * AdFrequencyManager — centralized ad exposure tracking for Sea Turtle Dash
 *
 * Rules enforced:
 *  - New users (first 3 sessions): max 1 interstitial per session, 5-min cooldown
 *  - Regular users: max 3 interstitials per session, 2.5-min cooldown
 *  - After a rewarded ad is fully watched: 3-min grace period before any interstitial
 *  - Rewarded ads are never frequency-capped (player opts in voluntarily)
 *
 * Persistence: session count stored in localStorage so "new user" rules apply
 * correctly across visits. All other state is in-memory per session.
 */

const LS_TOTAL_SESSIONS = "stg_total_sessions";
const NEW_USER_SESSION_THRESHOLD = 3; // sessions 1–3 are "new user"

interface FrequencyConfig {
  interstitialCooldownMs: number;
  newUserInterstitialCooldownMs: number;
  maxInterstitialsPerSession: number;
  newUserMaxInterstitialsPerSession: number;
  rewardedGracePeriodMs: number;
}

const DEFAULT_CONFIG: FrequencyConfig = {
  interstitialCooldownMs:        150_000, // 2.5 min  — returning users
  newUserInterstitialCooldownMs: 300_000, // 5 min    — new users
  maxInterstitialsPerSession:    3,       //           — returning users
  newUserMaxInterstitialsPerSession: 1,   //           — new users (1 max)
  rewardedGracePeriodMs:         180_000, // 3 min after watching a rewarded ad
};

export interface AdDecision {
  allowed: boolean;
  reason?: string; // debug info, never shown to users
}

class AdFrequencyManager {
  private readonly config: FrequencyConfig;
  private readonly sessionStart = Date.now();
  private readonly totalSessions: number;
  private readonly isNewUser: boolean;

  private interstitialsThisSession = 0;
  private lastInterstitialTime = 0;
  private lastRewardedTime = 0;

  constructor(config: FrequencyConfig = DEFAULT_CONFIG) {
    this.config = config;

    const stored = parseInt(localStorage.getItem(LS_TOTAL_SESSIONS) ?? "0", 10);
    this.totalSessions = stored + 1;
    localStorage.setItem(LS_TOTAL_SESSIONS, String(this.totalSessions));

    this.isNewUser = this.totalSessions <= NEW_USER_SESSION_THRESHOLD;
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

  get sessionAgeMs(): number {
    return Date.now() - this.sessionStart;
  }

  get isFirstSession(): boolean {
    return this.totalSessions === 1;
  }

  get sessionNumber(): number {
    return this.totalSessions;
  }

  get interstitialCount(): number {
    return this.interstitialsThisSession;
  }
}

// Singleton — one instance for the lifetime of the page
export const adFrequencyManager = new AdFrequencyManager();
