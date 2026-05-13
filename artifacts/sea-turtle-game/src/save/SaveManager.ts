/*
 * SaveManager — versioned localStorage persistence
 *
 * Single source of truth for all player progress:
 *   high score, lifetime shells, games played, unlocked skins, selected skin,
 *   completed achievements, daily challenge state.
 */

export type SkinId = "baby" | "green_sea" | "glowing" | "golden" | "cyber" | "coral";

export interface DailyChallengeState {
  date: string;       // ISO date "YYYY-MM-DD"
  challengeId: string;
  completed: boolean;
  progress: number;   // current progress toward goal
}

export interface SaveData {
  version: number;
  highScore: number;
  lifetimeShells: number;
  gamesPlayed: number;
  unlockedSkins: SkinId[];
  selectedSkin: SkinId;
  hasReachedRestorationMilestone: boolean;
  completedAchievements: string[];  // achievement IDs
  achievementProgress: Record<string, number>; // achievement ID → numeric progress
  dailyChallenge: DailyChallengeState | null;
  musicMuted: boolean;
  sfxMuted: boolean;
  bestRunShells: number; // max shells collected in a single run
}

const SAVE_KEY = "os_save_v2";
const LEGACY_V1_KEY = "os_save_v1";
const LEGACY_HS_KEY = "os_high_score";
const CURRENT_VERSION = 2;

const DEFAULT_SAVE: SaveData = {
  version: CURRENT_VERSION,
  highScore: 0,
  lifetimeShells: 0,
  gamesPlayed: 0,
  unlockedSkins: ["baby"],
  selectedSkin: "baby",
  hasReachedRestorationMilestone: false,
  completedAchievements: [],
  achievementProgress: {},
  dailyChallenge: null,
  musicMuted: false,
  sfxMuted: false,
  bestRunShells: 0,
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
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        if (parsed.version === CURRENT_VERSION) {
          return { ...DEFAULT_SAVE, ...parsed };
        }
      }

      // Migrate from v1
      const v1Raw = localStorage.getItem(LEGACY_V1_KEY);
      if (v1Raw) {
        const v1 = JSON.parse(v1Raw) as Partial<SaveData>;
        return {
          ...DEFAULT_SAVE,
          highScore: v1.highScore ?? 0,
          lifetimeShells: v1.lifetimeShells ?? 0,
          gamesPlayed: v1.gamesPlayed ?? 0,
          unlockedSkins: (v1.unlockedSkins as SkinId[]) ?? ["baby"],
          selectedSkin: (v1.selectedSkin as SkinId) ?? "baby",
          hasReachedRestorationMilestone: v1.hasReachedRestorationMilestone ?? false,
        };
      }

      // Migrate from legacy hs key
      const legacy = parseInt(localStorage.getItem(LEGACY_HS_KEY) ?? "0", 10);
      const base = { ...DEFAULT_SAVE };
      if (legacy > 0) base.highScore = legacy;
      return base;
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
  get completedAchievements(): string[] { return [...this.data.completedAchievements]; }
  get achievementProgress(): Record<string, number> { return { ...this.data.achievementProgress }; }
  get dailyChallenge(): DailyChallengeState | null { return this.data.dailyChallenge; }
  get musicMuted(): boolean { return this.data.musicMuted; }
  get sfxMuted(): boolean { return this.data.sfxMuted; }
  get bestRunShells(): number { return this.data.bestRunShells; }

  // ── Mutations ──────────────────────────────────────────────────────────────

  recordGameOver(score: number, sessionShells: number): void {
    if (score > this.data.highScore) this.data.highScore = score;
    this.data.lifetimeShells += sessionShells;
    this.data.gamesPlayed += 1;
    if (sessionShells > this.data.bestRunShells) {
      this.data.bestRunShells = sessionShells;
    }
    this.commit();
  }

  setRestorationMilestone(): void {
    if (!this.data.hasReachedRestorationMilestone) {
      this.data.hasReachedRestorationMilestone = true;
      this.commit();
    }
  }

  unlockSkin(id: SkinId): void {
    if (!this.data.unlockedSkins.includes(id)) {
      this.data.unlockedSkins.push(id);
      this.commit();
    }
  }

  selectSkin(id: SkinId): void {
    if (this.data.unlockedSkins.includes(id)) {
      this.data.selectedSkin = id;
      this.commit();
    }
  }

  completeAchievement(id: string): boolean {
    if (this.data.completedAchievements.includes(id)) return false;
    this.data.completedAchievements.push(id);
    this.commit();
    return true;
  }

  setAchievementProgress(id: string, progress: number): void {
    this.data.achievementProgress[id] = progress;
    this.commit();
  }

  setDailyChallenge(state: DailyChallengeState): void {
    this.data.dailyChallenge = state;
    this.commit();
  }

  setMusicMuted(muted: boolean): void {
    this.data.musicMuted = muted;
    this.commit();
  }

  setSfxMuted(muted: boolean): void {
    this.data.sfxMuted = muted;
    this.commit();
  }

  // ── Unlock evaluation ──────────────────────────────────────────────────────

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
