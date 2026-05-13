/*
 * AchievementManager — defines and evaluates ~10 achievements.
 *
 * Achievements are evaluated at game-over against the updated SaveManager data.
 * Newly completed achievements are returned so callers can show toasts and
 * play the fanfare sound.
 */

import { saveManager } from "../save/SaveManager";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxProgress: number;
  getProgress: () => number;
}

// ── Achievement definitions ───────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_swim",
    name: "First Swim",
    description: "Play your first game",
    icon: "🐢",
    maxProgress: 1,
    getProgress: () => Math.min(saveManager.gamesPlayed, 1),
  },
  {
    id: "shell_hunter",
    name: "Shell Hunter",
    description: "Collect 10 shells in a single run",
    icon: "🐚",
    maxProgress: 10,
    getProgress: () => Math.min(saveManager.bestRunShells, 10),
  },
  {
    id: "shell_hoarder",
    name: "Shell Hoarder",
    description: "Collect 100 shells total",
    icon: "🐚",
    maxProgress: 100,
    getProgress: () => Math.min(saveManager.lifetimeShells, 100),
  },
  {
    id: "speed_demon",
    name: "Speed Demon",
    description: "Reach a score of 50",
    icon: "⚡",
    maxProgress: 50,
    getProgress: () => Math.min(saveManager.highScore, 50),
  },
  {
    id: "ocean_guardian",
    name: "Ocean Guardian",
    description: "Reach a score of 150",
    icon: "🌊",
    maxProgress: 150,
    getProgress: () => Math.min(saveManager.highScore, 150),
  },
  {
    id: "veteran_survivor",
    name: "Veteran Survivor",
    description: "Reach a score of 300",
    icon: "🏆",
    maxProgress: 300,
    getProgress: () => Math.min(saveManager.highScore, 300),
  },
  {
    id: "restoration_hero",
    name: "Restoration Hero",
    description: "Restore the ocean in a single run",
    icon: "🪸",
    maxProgress: 1,
    getProgress: () => saveManager.hasReachedRestorationMilestone ? 1 : 0,
  },
  {
    id: "dedicated_diver",
    name: "Dedicated Diver",
    description: "Play 10 games",
    icon: "🤿",
    maxProgress: 10,
    getProgress: () => Math.min(saveManager.gamesPlayed, 10),
  },
  {
    id: "marathon_swimmer",
    name: "Marathon Swimmer",
    description: "Play 25 games",
    icon: "🏅",
    maxProgress: 25,
    getProgress: () => Math.min(saveManager.gamesPlayed, 25),
  },
  {
    id: "golden_collector",
    name: "Golden Collector",
    description: "Collect 500 shells total",
    icon: "✨",
    maxProgress: 500,
    getProgress: () => Math.min(saveManager.lifetimeShells, 500),
  },
];

// ── AchievementManager ────────────────────────────────────────────────────────

class AchievementManager {
  /**
   * Evaluate all achievements and persist newly completed ones.
   * Returns the list of newly completed achievements (for toasts/sounds).
   */
  evaluate(): Achievement[] {
    const newly: Achievement[] = [];

    for (const ach of ACHIEVEMENTS) {
      const progress = ach.getProgress();

      // Update numeric progress in save
      saveManager.setAchievementProgress(ach.id, progress);

      // Check completion
      if (progress >= ach.maxProgress) {
        const isNew = saveManager.completeAchievement(ach.id);
        if (isNew) newly.push(ach);
      }
    }

    return newly;
  }

  isCompleted(id: string): boolean {
    return saveManager.completedAchievements.includes(id);
  }

  getProgressFraction(ach: Achievement): number {
    const progress = saveManager.achievementProgress[ach.id] ?? ach.getProgress();
    return Math.min(progress / ach.maxProgress, 1);
  }
}

export const achievementManager = new AchievementManager();
