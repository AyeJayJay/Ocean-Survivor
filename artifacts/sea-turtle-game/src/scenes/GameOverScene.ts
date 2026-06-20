import Phaser from "phaser";
import { SCENE, GAME_WIDTH, GAME_HEIGHT } from "../game/GameConfig";
import {
  emitSceneChange, emitGameState,
  emitShowScoreCard, emitOpenLeaderboard,
} from "../game/EventBus";
import { getSkinDef } from "../player/SkinDefs";
import { saveManager } from "../save/SaveManager";
import { soundManager } from "../audio/SoundManager";
import { OceanMusicManager } from "../audio/OceanMusicManager";
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
 * Panel slides up from +80px on entrance. Score counts up from 0 to the final
 * value over ~900ms. Buttons stagger in after the panel lands.
 *
 * The "Watch Ad — Free Continue" button has been intentionally removed:
 * the React layer (App.tsx showDeathButtons) is the single source of truth
 * for all ad-gated actions, preventing duplicated prompts.
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

    // ── Full-screen overlay (stays fixed — not in the slide-up container) ──────

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // ── Panel dimensions ───────────────────────────────────────────────────────

    const hasUnlocks  = newlyUnlockedSkins.length > 0;
    const unlockedSkins = saveManager.unlockedSkins;
    const hasSkinChoice = unlockedSkins.length > 1;
    const panelW = 360;
    let   panelH = 360; // base — includes skin picker + share/leaderboard row
    if (hasUnlocks) panelH += newlyUnlockedSkins.length * 36;

    const panelX = cx - panelW / 2;
    const panelY = Math.max(20, GAME_HEIGHT / 2 - panelH / 2);

    // ── Slide-up container ─────────────────────────────────────────────────────
    // All panel elements are added to this container. It starts 80 px below its
    // final position and tweens up so the panel appears to rise from the ocean.

    const container = this.add.container(0, 80).setDepth(10);
    container.setAlpha(0);

    this.tweens.add({
      targets: container,
      y: 0,
      alpha: 1,
      duration: 420,
      ease: "Back.easeOut",
      easeParams: [1.3],
    });

    // ── Panel background ───────────────────────────────────────────────────────

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x021020, 0.96);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 18);
    panelBg.lineStyle(1.5, 0x2a5070, 0.8);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 18);
    container.add(panelBg);

    // Subtle inner glow stripe at top of panel
    const glow = this.add.graphics();
    glow.fillStyle(0x1060a0, 0.15);
    glow.fillRoundedRect(panelX + 2, panelY + 2, panelW - 4, 60, { tl: 16, tr: 16, bl: 0, br: 0 });
    container.add(glow);

    // ── "GAME OVER" title ──────────────────────────────────────────────────────

    const titleText = this.add.text(cx, panelY + 38, "GAME OVER", {
      fontSize: "34px",
      fontFamily: "'Bangers', 'Arial Black', Impact, sans-serif",
      color: "#ff5050",
      stroke: "#300000",
      strokeThickness: 4,
      letterSpacing: 3,
    }).setOrigin(0.5);
    container.add(titleText);

    // Brief scale-punch on entrance
    this.tweens.add({
      targets: titleText,
      scaleX: 1.08, scaleY: 1.08,
      duration: 300,
      delay: 350,
      yoyo: true,
      ease: "Sine.easeOut",
    });

    // ── Score (counts up from 0) ───────────────────────────────────────────────

    const scoreDisplay = this.add.text(cx, panelY + 94, "0", {
      fontSize: "68px",
      fontFamily: "'Bangers', 'Arial Black', Impact, sans-serif",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5,
      letterSpacing: 2,
    }).setOrigin(0.5);
    container.add(scoreDisplay);

    const countDuration = Math.min(950, 120 + score * 4);
    this.tweens.addCounter({
      from: 0,
      to: score,
      duration: countDuration,
      ease: "Power2",
      onUpdate: (tween) => {
        scoreDisplay.setText(Math.floor(tween.getValue() ?? 0).toString());
      },
    });

    const scoreLbl = this.add.text(cx, panelY + 158, "SCORE", {
      fontSize: "11px", fontFamily: "'Nunito', Arial, sans-serif",
      color: "rgba(160,200,240,0.55)", letterSpacing: 4,
    }).setOrigin(0.5);
    container.add(scoreLbl);

    // ── New record badge or personal best ──────────────────────────────────────

    let statsY = panelY + 180;

    if (newRecord) {
      const badge = this.add.text(cx, statsY, "✨  NEW RECORD!", {
        fontSize: "17px", fontFamily: "'Bangers', 'Arial Black', Impact, sans-serif",
        color: "#ffd84a", stroke: "#4a2800", strokeThickness: 3, letterSpacing: 2,
      }).setOrigin(0.5).setScale(0.8);
      container.add(badge);
      this.tweens.add({
        targets: badge,
        scaleX: 1, scaleY: 1,
        duration: 320,
        delay: countDuration * 0.7,
        ease: "Back.easeOut",
        easeParams: [2.5],
      });
      statsY += 22;
    } else {
      const bestLbl = this.add.text(cx, statsY, `Best: ${bestScore}`, {
        fontSize: "14px", fontFamily: "'Nunito', Arial, sans-serif",
        color: "rgba(200,220,255,0.5)",
      }).setOrigin(0.5);
      container.add(bestLbl);
      statsY += 20;

      // "X points from your best" — motivating gap indicator
      const gap = bestScore - score;
      if (gap > 3 && bestScore > 0) {
        const gapLbl = this.add.text(cx, statsY, `${gap} away from your best`, {
          fontSize: "11px", fontFamily: "'Nunito', Arial, sans-serif",
          color: "rgba(120,180,255,0.45)",
        }).setOrigin(0.5);
        container.add(gapLbl);
        statsY += 16;
      }
    }

    // ── Shells ─────────────────────────────────────────────────────────────────

    let shellY = statsY + 4;
    if (shellsCollected > 0) {
      const shellRun = this.add.text(cx, shellY, `🐚  ${shellsCollected} shell${shellsCollected !== 1 ? "s" : ""} collected`, {
        fontSize: "13px", fontFamily: "'Nunito', Arial, sans-serif",
        color: "#ffd84a",
      }).setOrigin(0.5);
      container.add(shellRun);
      shellY += 18;
    }
    const shellLife = this.add.text(cx, shellY, `Lifetime: ${lifetimeShells} 🐚`, {
      fontSize: "12px", fontFamily: "'Nunito', Arial, sans-serif",
      color: "rgba(255,216,74,0.5)",
    }).setOrigin(0.5);
    container.add(shellLife);

    // ── Newly unlocked skin cards ──────────────────────────────────────────────

    let unlockY = panelY + 232;

    if (hasUnlocks) {
      const unlockTitle = this.add.text(cx, unlockY, "🎉  NEW SKIN UNLOCKED!", {
        fontSize: "13px", fontFamily: "'Bangers', Arial Black, sans-serif",
        color: "#80ffcc", stroke: "#003020", strokeThickness: 3, letterSpacing: 1,
      }).setOrigin(0.5);
      container.add(unlockTitle);
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
        container.add(cardG);

        const skinName = this.add.text(cx, rowY + 4, skinDef.name, {
          fontSize: "14px", fontFamily: "'Nunito', Arial, sans-serif",
          color: "#80ffcc", stroke: "#003020", strokeThickness: 2,
        }).setOrigin(0.5);
        container.add(skinName);

        this.tweens.add({
          targets: [cardG, skinName],
          alpha: { from: 0, to: 1 },
          duration: 400,
          delay: 300 + i * 160,
          ease: "Power2",
        });
      }

      unlockY += newlyUnlockedSkins.length * 36 + 8;
    }

    // ── Skin selection picker ──────────────────────────────────────────────────

    const skinPickerY = panelY + panelH - 100;

    const skinLbl = this.add.text(cx, skinPickerY - 14, "SKIN", {
      fontSize: "10px", fontFamily: "'Nunito', Arial, sans-serif",
      color: "rgba(160,200,240,0.5)", letterSpacing: 3,
    }).setOrigin(0.5);
    container.add(skinLbl);

    let currentIdx = unlockedSkins.indexOf(saveManager.selectedSkin);
    if (currentIdx < 0) currentIdx = 0;

    const skinNameText = this.add.text(cx, skinPickerY + 8, getSkinDef(unlockedSkins[currentIdx]).name, {
      fontSize: "14px", fontFamily: "'Nunito', Arial, sans-serif",
      color: "#c0e8ff",
    }).setOrigin(0.5);
    container.add(skinNameText);

    if (hasSkinChoice) {
      const leftArrow = this.add.text(panelX + 32, skinPickerY + 8, "◄", {
        fontSize: "20px", fontFamily: "'Nunito', Arial, sans-serif", color: "#4a9fdf",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      container.add(leftArrow);

      leftArrow.on("pointerdown", () => {
        currentIdx = (currentIdx - 1 + unlockedSkins.length) % unlockedSkins.length;
        const id = unlockedSkins[currentIdx] as SkinId;
        saveManager.selectSkin(id);
        skinNameText.setText(getSkinDef(id).name);
      });
      leftArrow.on("pointerover",  () => leftArrow.setStyle({ color: "#80c8ff" }));
      leftArrow.on("pointerout",   () => leftArrow.setStyle({ color: "#4a9fdf" }));

      const rightArrow = this.add.text(panelX + panelW - 32, skinPickerY + 8, "►", {
        fontSize: "20px", fontFamily: "'Nunito', Arial, sans-serif", color: "#4a9fdf",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      container.add(rightArrow);

      rightArrow.on("pointerdown", () => {
        currentIdx = (currentIdx + 1) % unlockedSkins.length;
        const id = unlockedSkins[currentIdx] as SkinId;
        saveManager.selectSkin(id);
        skinNameText.setText(getSkinDef(id).name);
      });
      rightArrow.on("pointerover",  () => rightArrow.setStyle({ color: "#80c8ff" }));
      rightArrow.on("pointerout",   () => rightArrow.setStyle({ color: "#4a9fdf" }));

      const hintTxt = this.add.text(cx, skinPickerY + 26, "◄  choose skin  ►", {
        fontSize: "10px", fontFamily: "'Nunito', Arial, sans-serif",
        color: "rgba(100,160,220,0.4)",
      }).setOrigin(0.5);
      container.add(hintTxt);
    } else {
      const unlockHint = this.add.text(cx, skinPickerY + 24, "unlock more skins by playing!", {
        fontSize: "10px", fontFamily: "'Nunito', Arial, sans-serif",
        color: "rgba(100,160,220,0.35)",
      }).setOrigin(0.5);
      container.add(unlockHint);
    }

    // ── Main buttons — PLAY AGAIN / MENU ──────────────────────────────────────

    const btnY = panelY + panelH - 84;

    const playBtn = this.add.text(cx - 80, btnY, "▶  PLAY AGAIN", {
      fontSize: "14px", fontFamily: "'Nunito', 'Arial Black', sans-serif",
      fontStyle: "bold",
      color: "#ffffff", backgroundColor: "#1a6e40",
      padding: { x: 16, y: 10 }, stroke: "#0a3018", strokeThickness: 2,
    }).setOrigin(0.5).setScale(0).setInteractive({ useHandCursor: true });
    container.add(playBtn);

    this.tweens.add({
      targets: playBtn,
      scaleX: 1, scaleY: 1,
      duration: 340,
      delay: 420,
      ease: "Back.easeOut",
      easeParams: [2.2],
    });

    playBtn.on("pointerdown", () => {
      soundManager.playTap();
      this.cameras.main.fade(200, 0, 0, 0, false, (_: unknown, p: number) => {
        if (p >= 1) this.scene.start(SCENE.GAME);
      });
    });
    playBtn.on("pointerover", () => playBtn.setStyle({ color: "#80ffc0" }));
    playBtn.on("pointerout",  () => playBtn.setStyle({ color: "#ffffff" }));

    const menuBtn = this.add.text(cx + 80, btnY, "⌂  MENU", {
      fontSize: "14px", fontFamily: "'Nunito', 'Arial Black', sans-serif",
      fontStyle: "bold",
      color: "#c0d8ff", backgroundColor: "#102840",
      padding: { x: 16, y: 10 }, stroke: "#061428", strokeThickness: 2,
    }).setOrigin(0.5).setScale(0).setInteractive({ useHandCursor: true });
    container.add(menuBtn);

    this.tweens.add({
      targets: menuBtn,
      scaleX: 1, scaleY: 1,
      duration: 340,
      delay: 490,
      ease: "Back.easeOut",
      easeParams: [2.2],
    });

    menuBtn.on("pointerdown", () => {
      soundManager.playTap();
      this.cameras.main.fade(220, 0, 0, 0, false, (_: unknown, p: number) => {
        if (p >= 1) this.scene.start(SCENE.MAIN_MENU);
      });
    });
    menuBtn.on("pointerover", () => menuBtn.setStyle({ color: "#80c8ff" }));
    menuBtn.on("pointerout",  () => menuBtn.setStyle({ color: "#c0d8ff" }));

    // ── Share + Leaderboard row ────────────────────────────────────────────────

    const shareBtn = this.add.text(cx - 80, btnY + 46, "📤  SHARE", {
      fontSize: "13px", fontFamily: "'Nunito', Arial, sans-serif",
      fontStyle: "bold",
      color: "#80d8ff", backgroundColor: "#0a1e38",
      padding: { x: 18, y: 9 }, stroke: "#041020", strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });
    container.add(shareBtn);

    this.tweens.add({ targets: shareBtn, alpha: 1, duration: 280, delay: 600 });

    shareBtn.on("pointerdown", () => {
      soundManager.playTap();
      emitShowScoreCard({ score, bestScore, shellsCollected, newRecord });
    });
    shareBtn.on("pointerover",  () => shareBtn.setStyle({ color: "#c0eeff" }));
    shareBtn.on("pointerout",   () => shareBtn.setStyle({ color: "#80d8ff" }));

    const lbBtn = this.add.text(cx + 80, btnY + 46, "🏆  SCORES", {
      fontSize: "13px", fontFamily: "'Nunito', Arial, sans-serif",
      fontStyle: "bold",
      color: "#ffd84a", backgroundColor: "#1a1200",
      padding: { x: 18, y: 9 }, stroke: "#0a0800", strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });
    container.add(lbBtn);

    this.tweens.add({ targets: lbBtn, alpha: 1, duration: 280, delay: 660 });

    lbBtn.on("pointerdown", () => {
      soundManager.playTap();
      emitOpenLeaderboard();
    });
    lbBtn.on("pointerover",  () => lbBtn.setStyle({ color: "#ffe880" }));
    lbBtn.on("pointerout",   () => lbBtn.setStyle({ color: "#ffd84a" }));

    // ── Notify React (triggers interstitial check + hides death buttons) ───────

    OceanMusicManager.getInstance().setMenuTrack();
    emitSceneChange({ scene: "GameOver" });
    emitGameState({ state: "idle", score, bestScore, reviveAvailable: false, shellsThisRun: shellsCollected });
  }
}
