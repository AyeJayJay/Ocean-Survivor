/*
 * SaveManager — versioned localStorage persistence
 *
 * Single source of truth for all player progress:
 *   high score, lifetime shells, games played, unlocked skins, selected skin.
 *
 * Schema is versioned. If a newer save is detected the defaults are used and
 * the old high-score key (os_high_score) is migrated automatically.
 */

export type SkinId = "baby" | "green_sea" | "glowing" | "golden" | "cyber" | "coral";

export interface SaveData {
  version: number;
  highScore: number;
  lifetimeShells: number;
  gamesPlayed: number;
  unlockedSkins: SkinId[];
  selectedSkin: SkinId;
  hasReachedRestorationMilestone: boolean;
}

const SAVE_KEY = "os_save_v1";
const LEGACY_HS_KEY = "os_high_score";
const CURRENT_VERSION = 1;

const DEFAULT_SAVE: SaveData = {
  version: CURRENT_VERSION,
  highScore: 0,
  lifetimeShells: 0,
  gamesPlayed: 0,
  unlockedSkins: ["baby"],
  selectedSkin: "baby",
  hasReachedRestorationMilestone: false,
};

class SaveManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  // ── Load / Save ────────────────────────────────────────────────────────────

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        // Migrate from legacy key if present
        const legacy = parseInt(localStorage.getItem(LEGACY_HS_KEY) ?? "0", 10);
        const base = { ...DEFAULT_SAVE };
        if (legacy > 0) base.highScore = legacy;
        return base;
      }
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (parsed.version !== CURRENT_VERSION) {
        const migrated = { ...DEFAULT_SAVE };
        if (typeof parsed.highScore === "number") migrated.highScore = parsed.highScore;
        return migrated;
      }
      // Merge with defaults so new fields added in future versions always exist
      return { ...DEFAULT_SAVE, ...parsed };
    } catch {
      return { ...DEFAULT_SAVE };
    }
  }

  private commit(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // localStorage unavailable (private browsing, storage quota, etc.)
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get highScore(): number { return this.data.highScore; }
  get lifetimeShells(): number { return this.data.lifetimeShells; }
  get gamesPlayed(): number { return this.data.gamesPlayed; }
  get unlockedSkins(): SkinId[] { return [...this.data.unlockedSkins]; }
  get selectedSkin(): SkinId { return this.data.selectedSkin; }
  get hasReachedRestorationMilestone(): boolean {
    return this.data.hasReachedRestorationMilestone;
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  /** Call once at game-over with the final run results. */
  recordGameOver(score: number, sessionShells: number): void {
    if (score > this.data.highScore) this.data.highScore = score;
    this.data.lifetimeShells += sessionShells;
    this.data.gamesPlayed += 1;
    this.commit();
  }

  /** Call when the player reaches the restoration milestone during a run. */
  setRestorationMilestone(): void {
    if (!this.data.hasReachedRestorationMilestone) {
      this.data.hasReachedRestorationMilestone = true;
      this.commit();
    }
  }

  /** Permanently unlock a skin. No-op if already unlocked. */
  unlockSkin(id: SkinId): void {
    if (!this.data.unlockedSkins.includes(id)) {
      this.data.unlockedSkins.push(id);
      this.commit();
    }
  }

  /** Change the active skin (must be unlocked). */
  selectSkin(id: SkinId): void {
    if (this.data.unlockedSkins.includes(id)) {
      this.data.selectedSkin = id;
      this.commit();
    }
  }

  // ── Unlock evaluation ──────────────────────────────────────────────────────

  /**
   * Returns IDs of skins that are newly satisfied but not yet in unlockedSkins.
   * Does NOT mutate state — call unlockSkin() for each result to commit them.
   * Call this AFTER recordGameOver() so the thresholds are evaluated on
   * up-to-date data.
   */
  checkNewUnlocks(): SkinId[] {
    const already = new Set(this.data.unlockedSkins);
    const newly: SkinId[] = [];

    const check = (id: SkinId, cond: boolean) => {
      if (!already.has(id) && cond) newly.push(id);
    };

    check("green_sea", this.data.highScore >= 50);
    check("glowing",   this.data.highScore >= 150);
    check("golden",    this.data.lifetimeShells >= 500);
    check("cyber",     this.data.gamesPlayed >= 10);
    check("coral",     this.data.hasReachedRestorationMilestone);

    return newly;
  }
}

export const saveManager = new SaveManager();
