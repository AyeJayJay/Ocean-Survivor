/*
 * DailyChallengeManager — deterministic daily challenge system.
 *
 * A challenge is picked each day from a pool using the current date as a seed
 * (so all players see the same challenge on any given day). Completion is
 * stored in SaveManager with the ISO date so the flag resets on the next day.
 */

import { saveManager } from "../save/SaveManager";

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  goal: number;
  /** Returns current progress toward the goal based on a run's data. */
  getRunProgress: (runData: RunData) => number;
}

export interface RunData {
  score: number;
  shellsCollected: number;
  survived: boolean; // true if player made it to game over without topping out early
  restorationReached: boolean;
}

// ── Challenge pool ────────────────────────────────────────────────────────────

const CHALLENGE_POOL: DailyChallenge[] = [
  {
    id: "collect_5_shells",
    title: "Shell Seeker",
    description: "Collect 5 shells in one run",
    icon: "🐚",
    goal: 5,
    getRunProgress: (r) => Math.min(r.shellsCollected, 5),
  },
  {
    id: "score_30",
    title: "Sprint",
    description: "Reach a score of 30",
    icon: "⚡",
    goal: 30,
    getRunProgress: (r) => Math.min(r.score, 30),
  },
  {
    id: "score_75",
    title: "Long Haul",
    description: "Reach a score of 75",
    icon: "🌊",
    goal: 75,
    getRunProgress: (r) => Math.min(r.score, 75),
  },
  {
    id: "collect_3_shells",
    title: "Shell Collector",
    description: "Collect 3 shells in one run",
    icon: "🐚",
    goal: 3,
    getRunProgress: (r) => Math.min(r.shellsCollected, 3),
  },
  {
    id: "restore_ocean",
    title: "Ocean Restorer",
    description: "Restore the ocean in one run",
    icon: "🪸",
    goal: 1,
    getRunProgress: (r) => r.restorationReached ? 1 : 0,
  },
  {
    id: "score_50",
    title: "Half Century",
    description: "Reach a score of 50",
    icon: "🏅",
    goal: 50,
    getRunProgress: (r) => Math.min(r.score, 50),
  },
  {
    id: "collect_8_shells",
    title: "Shell Master",
    description: "Collect 8 shells in one run",
    icon: "✨",
    goal: 8,
    getRunProgress: (r) => Math.min(r.shellsCollected, 8),
  },
];

// ── Seeded PRNG (Mulberry32) ──────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function dateSeed(iso: string): number {
  // Convert date string to a numeric seed
  return iso.replace(/-/g, "").split("").reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0);
}

// ── DailyChallengeManager ─────────────────────────────────────────────────────

class DailyChallengeManager {
  private _today: string;
  private _challenge: DailyChallenge;

  constructor() {
    this._today = todayISO();
    this._challenge = this.pickChallenge(this._today);
    this.initState();
  }

  private pickChallenge(date: string): DailyChallenge {
    const rng = mulberry32(dateSeed(date));
    const idx = Math.floor(rng() * CHALLENGE_POOL.length);
    return CHALLENGE_POOL[idx];
  }

  private initState(): void {
    const existing = saveManager.dailyChallenge;
    if (!existing || existing.date !== this._today) {
      // New day — reset
      saveManager.setDailyChallenge({
        date: this._today,
        challengeId: this._challenge.id,
        completed: false,
        progress: 0,
      });
    }
  }

  get challenge(): DailyChallenge { return this._challenge; }

  get isCompleted(): boolean {
    const dc = saveManager.dailyChallenge;
    return !!(dc && dc.date === this._today && dc.completed);
  }

  get progress(): number {
    const dc = saveManager.dailyChallenge;
    if (!dc || dc.date !== this._today) return 0;
    return dc.progress;
  }

  /**
   * Called at game-over with the run's data.
   * Returns true if the challenge was just completed for the first time today.
   */
  evaluateRun(runData: RunData): boolean {
    if (this.isCompleted) return false;

    const runProgress = this._challenge.getRunProgress(runData);
    const prevProgress = this.progress;
    const newProgress = Math.max(prevProgress, runProgress);
    const justCompleted = newProgress >= this._challenge.goal;

    saveManager.setDailyChallenge({
      date: this._today,
      challengeId: this._challenge.id,
      completed: justCompleted,
      progress: newProgress,
    });

    // We already confirmed !isCompleted at the top, so justCompleted means "first time"
    return justCompleted;
  }
}

export const dailyChallengeManager = new DailyChallengeManager();
