import Phaser from "phaser";
import { SCENE, GAME_WIDTH, GAME_HEIGHT, LS_HIGH_SCORE } from "../game/GameConfig";
import { emitSceneChange, emitGameState } from "../game/EventBus";

interface GameOverData {
  score: number;
  bestScore: number;
  shellsCollected: number;
  newRecord: boolean;
}

/*
 * GameOverScene — displayed after the turtle dies and the player declines/skips
 * the revive ad. The React shell (App.tsx) triggers an interstitial ad check the
 * moment it detects this scene becoming active.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENE.GAME_OVER); }

  create(data: GameOverData): void {
    const { score = 0, bestScore = 0, shellsCollected = 0, newRecord = false } = data ?? {};

    const cx = GAME_WIDTH / 2;

    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.72);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Panel background
    const panelW = 360;
    const panelH = 320;
    const panelX = cx - panelW / 2;
    const panelY = GAME_HEIGHT / 2 - panelH / 2;
    overlay.fillStyle(0x021020, 0.94);
    overlay.fillRoundedRect(panelX, panelY, panelW, panelH, 18);
    overlay.lineStyle(1.5, 0x204060, 0.7);
    overlay.strokeRoundedRect(panelX, panelY, panelW, panelH, 18);

    // Title
    this.add.text(cx, panelY + 36, "GAME OVER", {
      fontSize: "30px", fontFamily: "Arial Black, sans-serif",
      color: "#ff6060", stroke: "#300000", strokeThickness: 4,
    }).setOrigin(0.5);

    // Score
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

    // Shell count
    if (shellsCollected > 0) {
      this.add.text(cx, panelY + 200, `🐚  ${shellsCollected} shell${shellsCollected !== 1 ? "s" : ""} collected`, {
        fontSize: "13px", fontFamily: "Arial, sans-serif",
        color: "#ffd84a",
      }).setOrigin(0.5);
    }

    // Play Again button
    const playBtn = this.add.text(cx - 78, panelY + 258, "▶  PLAY AGAIN", {
      fontSize: "14px", fontFamily: "Arial, sans-serif",
      color: "#ffffff", backgroundColor: "#1a6e40",
      padding: { x: 16, y: 10 }, stroke: "#0a3018", strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    playBtn.on("pointerdown", () => {
      this.cameras.main.fade(200, 0, 0, 0, false, (_: unknown, progress: number) => {
        if (progress >= 1) this.scene.start(SCENE.GAME);
      });
    });
    playBtn.on("pointerover", () => playBtn.setStyle({ color: "#80ffc0" }));
    playBtn.on("pointerout",  () => playBtn.setStyle({ color: "#ffffff" }));

    // Menu button
    const menuBtn = this.add.text(cx + 78, panelY + 258, "⌂  MENU", {
      fontSize: "14px", fontFamily: "Arial, sans-serif",
      color: "#c0d8ff", backgroundColor: "#102840",
      padding: { x: 16, y: 10 }, stroke: "#061428", strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on("pointerdown", () => {
      this.cameras.main.fade(220, 0, 0, 0, false, (_: unknown, progress: number) => {
        if (progress >= 1) this.scene.start(SCENE.MAIN_MENU);
      });
    });
    menuBtn.on("pointerover", () => menuBtn.setStyle({ color: "#80c8ff" }));
    menuBtn.on("pointerout",  () => menuBtn.setStyle({ color: "#c0d8ff" }));

    // Tell React this scene is active (triggers interstitial check in App.tsx)
    emitSceneChange({ scene: "GameOver" });
    emitGameState({ state: "idle", score, bestScore, reviveAvailable: false, shellsThisRun: shellsCollected });
  }
}
