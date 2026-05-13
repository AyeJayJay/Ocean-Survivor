import Phaser from "phaser";
import { SCENE, GAME_WIDTH, GAME_HEIGHT } from "../game/GameConfig";
import { emitSceneChange, emitGameState, emitGameOverAdRequest, onGameOverAd } from "../game/EventBus";
import { getSkinDef, SKIN_DEFS } from "../player/SkinDefs";
import { saveManager } from "../save/SaveManager";
import { soundManager } from "../audio/SoundManager";
import type { SkinId } from "../save/SaveManager";

interface GameOverData {
  score: number;
  bestScore: number;
  shellsCollected: number;
  newRecord: boolean;
  newlyUnlockedSkins: SkinId[];
  lifetimeShells: number;
}

/*
 * GameOverScene — displayed after the turtle dies and the player declines/skips
 * the revive ad. The React shell (App.tsx) triggers an interstitial ad check the
 * moment it detects this scene becoming active.
 *
 * Shows: score, new-record badge, lifetime shells, newly unlocked skin cards,
 * a skin selection picker (placeholder for full Task 3 screen), and nav buttons.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENE.GAME_OVER); }

  create(data: GameOverData): void {
    const {
      score = 0,
      bestScore = 0,
      shellsCollected = 0,
      newRecord = false,
      newlyUnlockedSkins = [],
      lifetimeShells = 0,
    } = data ?? {};

    const cx = GAME_WIDTH / 2;

    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.72);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Panel background — height grows with unlocks
    const hasUnlocks = newlyUnlockedSkins.length > 0;
    const unlockedSkins = saveManager.unlockedSkins;
    const hasSkinChoice = unlockedSkins.length > 1;
    const panelW = 360;
    let panelH = 340; // base height includes skin picker row
    if (hasUnlocks) panelH += newlyUnlockedSkins.length * 36;

    const panelX = cx - panelW / 2;
    // Clamp panel top so it never goes above y=20
    const panelY = Math.max(20, GAME_HEIGHT / 2 - panelH / 2);

    overlay.fillStyle(0x021020, 0.94);
    overlay.fillRoundedRect(panelX, panelY, panelW, panelH, 18);
    overlay.lineStyle(1.5, 0x204060, 0.7);
    overlay.strokeRoundedRect(panelX, panelY, panelW, panelH, 18);

    // ── Title ────────────────────────────────────────────────────────────────
    this.add.text(cx, panelY + 36, "GAME OVER", {
      fontSize: "30px", fontFamily: "Arial Black, sans-serif",
      color: "#ff6060", stroke: "#300000", strokeThickness: 4,
    }).setOrigin(0.5);

    // ── Score ────────────────────────────────────────────────────────────────
    this.add.text(cx, panelY + 88, score.toString(), {
      fontSize: "64px", fontFamily: "Arial Black, sans-serif",
      color: "#ffffff", stroke: "#000000", strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(cx, panelY + 150, "SCORE", {
      fontSize: "13px", fontFamily: "Arial, sans-serif",
      color: "rgba(160,200,240,0.6)", letterSpacing: 3,
    }).setOrigin(0.5);

    // New record badge
    if (newRecord) {
      this.add.text(cx, panelY + 175, "✨  NEW RECORD!", {
        fontSize: "16px", fontFamily: "Arial, sans-serif",
        color: "#ffd84a", stroke: "#4a2800", strokeThickness: 3,
      }).setOrigin(0.5);
    } else {
      this.add.text(cx, panelY + 175, `Best: ${bestScore}`, {
        fontSize: "14px", fontFamily: "Arial, sans-serif",
        color: "rgba(200,220,255,0.55)",
      }).setOrigin(0.5);
    }

    // ── Shell count ───────────────────────────────────────────────────────────
    let shellY = panelY + 200;
    if (shellsCollected > 0) {
      this.add.text(cx, shellY, `🐚  ${shellsCollected} shell${shellsCollected !== 1 ? "s" : ""} collected`, {
        fontSize: "13px", fontFamily: "Arial, sans-serif",
        color: "#ffd84a",
      }).setOrigin(0.5);
      shellY += 18;
    }
    this.add.text(cx, shellY, `Lifetime: ${lifetimeShells} 🐚`, {
      fontSize: "12px", fontFamily: "Arial, sans-serif",
      color: "rgba(255,216,74,0.55)",
    }).setOrigin(0.5);

    // ── Newly unlocked skin cards ─────────────────────────────────────────────
    let unlockY = panelY + 232;

    if (hasUnlocks) {
      this.add.text(cx, unlockY, "🎉  NEW SKIN UNLOCKED!", {
        fontSize: "13px", fontFamily: "Arial Black, sans-serif",
        color: "#80ffcc", stroke: "#003020", strokeThickness: 3,
      }).setOrigin(0.5);
      unlockY += 22;

      for (let i = 0; i < newlyUnlockedSkins.length; i++) {
        const skinId = newlyUnlockedSkins[i];
        const skinDef = getSkinDef(skinId);
        const rowY = unlockY + i * 36;

        const cardG = this.add.graphics();
        cardG.fillStyle(0x00ffaa, 0.08);
        cardG.fillRoundedRect(panelX + 20, rowY - 10, panelW - 40, 28, 8);
        cardG.lineStyle(1, 0x00ffaa, 0.3);
        cardG.strokeRoundedRect(panelX + 20, rowY - 10, panelW - 40, 28, 8);

        this.add.text(cx, rowY + 4, skinDef.name, {
          fontSize: "14px", fontFamily: "Arial, sans-serif",
          color: "#80ffcc", stroke: "#003020", strokeThickness: 2,
        }).setOrigin(0.5);

        this.tweens.add({
          targets: cardG, alpha: { from: 0, to: 1 },
          duration: 400, delay: i * 150, ease: "Power2",
        });
      }

      unlockY += newlyUnlockedSkins.length * 36 + 8;
    }

    // ── Skin selection picker (placeholder for full Task 3 screen) ────────────
    //
    // Shows current skin with ◄ ► arrows to cycle through unlocked skins.
    // The selection is persisted immediately via saveManager.selectSkin().

    const skinPickerY = panelY + panelH - 100;

    this.add.text(cx, skinPickerY - 14, "SKIN", {
      fontSize: "10px", fontFamily: "Arial, sans-serif",
      color: "rgba(160,200,240,0.5)", letterSpacing: 3,
    }).setOrigin(0.5);

    // Current skin index tracker (mutable closure)
    let currentIdx = unlockedSkins.indexOf(saveManager.selectedSkin);
    if (currentIdx < 0) currentIdx = 0;

    const skinNameText = this.add.text(cx, skinPickerY + 8, getSkinDef(unlockedSkins[currentIdx]).name, {
      fontSize: "14px", fontFamily: "Arial, sans-serif",
      color: "#c0e8ff",
    }).setOrigin(0.5);

    if (hasSkinChoice) {
      // Left arrow
      const leftArrow = this.add.text(panelX + 32, skinPickerY + 8, "◄", {
        fontSize: "18px", fontFamily: "Arial, sans-serif",
        color: "#4a9fdf",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      leftArrow.on("pointerdown", () => {
        currentIdx = (currentIdx - 1 + unlockedSkins.length) % unlockedSkins.length;
        const id = unlockedSkins[currentIdx] as SkinId;
        saveManager.selectSkin(id);
        skinNameText.setText(getSkinDef(id).name);
      });
      leftArrow.on("pointerover",  () => leftArrow.setStyle({ color: "#80c8ff" }));
      leftArrow.on("pointerout",   () => leftArrow.setStyle({ color: "#4a9fdf" }));

      // Right arrow
      const rightArrow = this.add.text(panelX + panelW - 32, skinPickerY + 8, "►", {
        fontSize: "18px", fontFamily: "Arial, sans-serif",
        color: "#4a9fdf",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      rightArrow.on("pointerdown", () => {
        currentIdx = (currentIdx + 1) % unlockedSkins.length;
        const id = unlockedSkins[currentIdx] as SkinId;
        saveManager.selectSkin(id);
        skinNameText.setText(getSkinDef(id).name);
      });
      rightArrow.on("pointerover",  () => rightArrow.setStyle({ color: "#80c8ff" }));
      rightArrow.on("pointerout",   () => rightArrow.setStyle({ color: "#4a9fdf" }));

      // Unlock hint text
      this.add.text(cx, skinPickerY + 26, "◄  choose skin  ►", {
        fontSize: "10px", fontFamily: "Arial, sans-serif",
        color: "rgba(100,160,220,0.4)",
      }).setOrigin(0.5);
    } else {
      // Only one skin — show a subtle hint
      this.add.text(cx, skinPickerY + 24, "unlock more skins by playing!", {
        fontSize: "10px", fontFamily: "Arial, sans-serif",
        color: "rgba(100,160,220,0.35)",
      }).setOrigin(0.5);
    }

    // ── Buttons ───────────────────────────────────────────────────────────────

    const btnY = panelY + panelH - 46;

    const playBtn = this.add.text(cx - 78, btnY, "▶  PLAY AGAIN", {
      fontSize: "14px", fontFamily: "Arial, sans-serif",
      color: "#ffffff", backgroundColor: "#1a6e40",
      padding: { x: 16, y: 10 }, stroke: "#0a3018", strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    playBtn.on("pointerdown", () => {
      soundManager.playTap();
      this.cameras.main.fade(200, 0, 0, 0, false, (_: unknown, progress: number) => {
        if (progress >= 1) this.scene.start(SCENE.GAME);
      });
    });
    playBtn.on("pointerover", () => playBtn.setStyle({ color: "#80ffc0" }));
    playBtn.on("pointerout",  () => playBtn.setStyle({ color: "#ffffff" }));

    const menuBtn = this.add.text(cx + 78, btnY, "⌂  MENU", {
      fontSize: "14px", fontFamily: "Arial, sans-serif",
      color: "#c0d8ff", backgroundColor: "#102840",
      padding: { x: 16, y: 10 }, stroke: "#061428", strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on("pointerdown", () => {
      soundManager.playTap();
      this.cameras.main.fade(220, 0, 0, 0, false, (_: unknown, progress: number) => {
        if (progress >= 1) this.scene.start(SCENE.MAIN_MENU);
      });
    });
    menuBtn.on("pointerover", () => menuBtn.setStyle({ color: "#80c8ff" }));
    menuBtn.on("pointerout",  () => menuBtn.setStyle({ color: "#c0d8ff" }));

    // ── Rewarded ad offer ─────────────────────────────────────────────────────
    // Offer the player a free continue via a rewarded ad.

    const watchAdBtn = this.add.text(cx, btnY - 46, "❤️  Watch Ad — Free Continue", {
      fontSize: "13px", fontFamily: "Arial, sans-serif",
      color: "#80d4ff", backgroundColor: "#0a2040",
      padding: { x: 14, y: 9 },
      stroke: "#041020", strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    watchAdBtn.on("pointerover", () => watchAdBtn.setStyle({ color: "#c0eaff" }));
    watchAdBtn.on("pointerout",  () => watchAdBtn.setStyle({ color: "#80d4ff" }));

    watchAdBtn.on("pointerdown", () => {
      soundManager.playTap();
      watchAdBtn.setInteractive(false);
      watchAdBtn.setAlpha(0.5);
      emitGameOverAdRequest();
    });

    // Listen for ad result
    const offAdResult = onGameOverAd((payload) => {
      if (payload.type !== "result") return;
      offAdResult(); // one-shot
      if (payload.rewarded) {
        // Rewarded: start a fresh run
        this.cameras.main.fade(200, 0, 0, 0, false, (_: unknown, p: number) => {
          if (p >= 1) this.scene.start(SCENE.GAME);
        });
      } else {
        // Declined: re-enable button
        watchAdBtn.setInteractive(true);
        watchAdBtn.setAlpha(1);
      }
    });

    // Clean up listener when scene shuts down
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => offAdResult());

    // Tell React this scene is active (triggers interstitial check in App.tsx)
    emitSceneChange({ scene: "GameOver" });
    emitGameState({ state: "idle", score, bestScore, reviveAvailable: false, shellsThisRun: shellsCollected });
  }
}
