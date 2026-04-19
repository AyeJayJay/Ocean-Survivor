/*
 * ABTest — A/B test variant assignment for Sea Turtle Dash
 *
 * Each user is assigned to exactly one variant on first load and stays there
 * for life (stored in localStorage). Variants control ad frequency config and
 * (future) UI treatments. Adding a new variant:
 *   1. Add an entry to AB_VARIANTS below.
 *   2. Adjust the weight in VARIANT_WEIGHTS (must sum to 1.0).
 *   3. Deploy — new users will be assigned; existing users keep their variant.
 */

import type { FrequencyConfig } from "./types";

// ─── Variant definitions ──────────────────────────────────────────────────────

export interface ABVariant {
  id:          string;
  name:        string;
  description: string;
  adConfig:    FrequencyConfig;
  // UI treatments — add fields here as new treatments are tested
  rewardedButtonStyle: "prominent" | "subtle";
}

export const AB_VARIANTS: Readonly<Record<string, ABVariant>> = {
  control: {
    id:          "control",
    name:        "Control",
    description: "Current production settings — baseline for comparison",
    adConfig: {
      interstitialCooldownMs:           150_000, // 2.5 min
      newUserInterstitialCooldownMs:    300_000, // 5 min
      maxInterstitialsPerSession:       3,
      newUserMaxInterstitialsPerSession: 1,
      rewardedGracePeriodMs:            180_000, // 3 min
      newUserSessionThreshold:          3,
    },
    rewardedButtonStyle: "prominent",
  },

  relaxed: {
    id:          "relaxed",
    name:        "Relaxed Ads",
    description: "Fewer, less frequent interstitials — tests if lower ad load improves retention",
    adConfig: {
      interstitialCooldownMs:           240_000, // 4 min
      newUserInterstitialCooldownMs:    480_000, // 8 min
      maxInterstitialsPerSession:       2,
      newUserMaxInterstitialsPerSession: 1,
      rewardedGracePeriodMs:            300_000, // 5 min
      newUserSessionThreshold:          4,
    },
    rewardedButtonStyle: "prominent",
  },

  aggressive: {
    id:          "aggressive",
    name:        "Higher Frequency",
    description: "More frequent interstitials — tests revenue ceiling vs churn tradeoff",
    adConfig: {
      interstitialCooldownMs:           120_000, // 2 min
      newUserInterstitialCooldownMs:    240_000, // 4 min
      maxInterstitialsPerSession:       5,
      newUserMaxInterstitialsPerSession: 2,
      rewardedGracePeriodMs:            120_000, // 2 min
      newUserSessionThreshold:          2,
    },
    rewardedButtonStyle: "subtle",
  },
};

// Probability weights — must sum to 1.0
const VARIANT_WEIGHTS: Record<string, number> = {
  control:    0.34,
  relaxed:    0.33,
  aggressive: 0.33,
};

// ─── Assignment ───────────────────────────────────────────────────────────────

const LS_AB_VARIANT = "stg_ab_variant";

function assignVariant(): string {
  const r = Math.random();
  let cumulative = 0;
  for (const [id, weight] of Object.entries(VARIANT_WEIGHTS)) {
    cumulative += weight;
    if (r < cumulative) return id;
  }
  return "control"; // fallback
}

let _variant: ABVariant | null = null;

/** Returns the user's assigned variant — stable across the session. */
export function getVariant(): ABVariant {
  if (_variant) return _variant;

  const stored = localStorage.getItem(LS_AB_VARIANT);
  const id = (stored && AB_VARIANTS[stored]) ? stored : assignVariant();

  // Persist for future sessions
  if (!stored) localStorage.setItem(LS_AB_VARIANT, id);

  _variant = AB_VARIANTS[id] ?? AB_VARIANTS.control;
  return _variant;
}
