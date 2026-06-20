/*
 * SettingsScene — sound/music toggles, credits, and privacy policy placeholder.
 */

import Phaser from "phaser";
import { SCENE, GAME_WIDTH, GAME_HEIGHT } from "../game/GameConfig";
import { emitSceneChange, emitPrivacyPolicy, emitAdPreferences, emitAbout } from "../game/EventBus";
import { soundManager } from "../audio/SoundManager";
import { OceanMusicManager } from "../audio/OceanMusicManager";
import { saveManager } from "../save/SaveManager";

export class SettingsScene extends Phaser.Scene {
  private fromScene: string = SCENE.MAIN_MENU;

  constructor() { super(SCENE.SETTINGS); }

  init(data: { from?: string }): void {
    this.fromScene = data?.from ?? SCENE.MAIN_MENU;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x010c1a, 0x010c1a, 0x021828, 0x021828, 1, 1, 1, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title
    this.add.text(cx, 58, "SETTINGS", {
      fontSize: "28px", fontFamily: "'Bangers', 'Arial Black', Impact, sans-serif",
      color: "#00e8ff", stroke: "#002a40", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10);

    // Panel
    const panelW = 380;
    const panelX = cx - panelW / 2;
    const panelY = 100;

    // ── Audio section ─────────────────────────────────────────────────────────

    this.sectionLabel(cx, panelY + 28, "AUDIO");

    // SFX toggle
    this.buildToggle(
      cx, panelY + 80, "Sound Effects",
      () => !saveManager.sfxMuted,
      (on) => {
        soundManager.setSfxMuted(!on);
        if (on) soundManager.playTap();
      }
    );

    // Music toggle
    this.buildToggle(
      cx, panelY + 150, "Ocean Music",
      () => !saveManager.musicMuted,
      (on) => {
        soundManager.setMusicMuted(!on);
        OceanMusicManager.getInstance().setMuted(!on);
        if (on) soundManager.startMusic();
      }
    );

    // ── Credits section ───────────────────────────────────────────────────────

    this.sectionLabel(cx, panelY + 228, "CREDITS");

    const credits = [
      "Ocean Survivor",
      "A game about cleaning up our ocean",
      "",
      "Built with Phaser 3 & React",
      "All art & audio procedurally generated",
    ];

    credits.forEach((line, i) => {
      this.add.text(cx, panelY + 268 + i * 22, line, {
        fontSize: i === 0 ? "14px" : "12px",
        fontFamily: "'Nunito', Arial, sans-serif",
        color: i === 0 ? "#c0e8ff" : "rgba(140,180,220,0.65)",
        align: "center",
      }).setOrigin(0.5).setDepth(10);
    });

    // ── Privacy section ───────────────────────────────────────────────────────

    this.sectionLabel(cx, panelY + 400, "PRIVACY & DATA");

    const privacyText = [
      "Progress saved on your device only — no account needed.",
      "Ads may use device identifiers. Change anytime below.",
    ];

    privacyText.forEach((line, i) => {
      this.add.text(cx, panelY + 438 + i * 22, line, {
        fontSize: "11px", fontFamily: "'Nunito', Arial, sans-serif",
        color: "rgba(120,160,200,0.55)",
        align: "center",
        wordWrap: { width: 340 },
      }).setOrigin(0.5).setDepth(10);
    });

    // ── Ad preferences button ─────────────────────────────────────────────────

    const consentBtn = this.add.text(cx, panelY + 496, "🎯  Manage Ad Preferences", {
      fontSize: "13px", fontFamily: "'Nunito', Arial, sans-serif",
      color: "#4090b0",
      align: "center",
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });

    consentBtn.on("pointerdown", () => {
      soundManager.playTap();
      emitAdPreferences();
    });
    consentBtn.on("pointerover", () => consentBtn.setStyle({ color: "#60c0d8" }));
    consentBtn.on("pointerout",  () => consentBtn.setStyle({ color: "#4090b0" }));

    // ── Privacy Policy link ───────────────────────────────────────────────────

    const privacyBtn = this.add.text(cx, panelY + 534, "📋  Privacy Policy", {
      fontSize: "12px", fontFamily: "'Nunito', Arial, sans-serif",
      color: "#3a7090",
      align: "center",
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });

    privacyBtn.on("pointerdown", () => {
      soundManager.playTap();
      emitPrivacyPolicy();
    });
    privacyBtn.on("pointerover", () => privacyBtn.setStyle({ color: "#50a0c0" }));
    privacyBtn.on("pointerout",  () => privacyBtn.setStyle({ color: "#3a7090" }));

    // ── About & Terms link ────────────────────────────────────────────────────

    const aboutBtn = this.add.text(cx, panelY + 566, "ℹ️  About & Terms", {
      fontSize: "12px", fontFamily: "'Nunito', Arial, sans-serif",
      color: "#3a7090",
      align: "center",
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });

    aboutBtn.on("pointerdown", () => {
      soundManager.playTap();
      emitAbout();
    });
    aboutBtn.on("pointerover", () => aboutBtn.setStyle({ color: "#50a0c0" }));
    aboutBtn.on("pointerout",  () => aboutBtn.setStyle({ color: "#3a7090" }));

    // ── Back button ──────────────────────────────────────────────────────────

    const backBtn = this.add.text(cx, GAME_HEIGHT - 60, "◄  BACK", {
      fontSize: "16px", fontFamily: "'Nunito', Arial, sans-serif",
      color: "#c0d8ff", backgroundColor: "#102840",
      padding: { x: 20, y: 11 }, stroke: "#061428", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });

    backBtn.on("pointerdown", () => {
      soundManager.playTap();
      if (this.fromScene === SCENE.GAME) {
        // Return to the paused GameScene without restarting it
        this.scene.stop();
        this.scene.resume(SCENE.GAME);
      } else {
        this.cameras.main.fade(200, 0, 0, 0, false, (_: unknown, p: number) => {
          if (p >= 1) this.scene.start(this.fromScene);
        });
      }
    });
    backBtn.on("pointerover", () => backBtn.setStyle({ color: "#80c8ff" }));
    backBtn.on("pointerout",  () => backBtn.setStyle({ color: "#c0d8ff" }));

    emitSceneChange({ scene: "Settings" });
  }

  private sectionLabel(x: number, y: number, label: string): void {
    this.add.text(x, y, label, {
      fontSize: "11px", fontFamily: "'Nunito', Arial, sans-serif",
      color: "rgba(100,160,210,0.6)",
      letterSpacing: 3,
    }).setOrigin(0.5).setDepth(10);

    const lineG = this.add.graphics().setDepth(9);
    lineG.lineStyle(1, 0x1e3a60, 0.6);
    lineG.beginPath();
    lineG.moveTo(x - 150, y + 14);
    lineG.lineTo(x + 150, y + 14);
    lineG.strokePath();
  }

  private buildToggle(
    cx: number, y: number,
    label: string,
    getState: () => boolean,
    onToggle: (newState: boolean) => void
  ): void {
    this.add.text(cx - 80, y, label, {
      fontSize: "15px", fontFamily: "'Nunito', Arial, sans-serif",
      color: "#c0d8ff",
    }).setOrigin(0, 0.5).setDepth(10);

    const toggleW = 52;
    const toggleH = 28;
    const toggleX = cx + 100;
    const toggleY = y;

    const trackGfx = this.add.graphics().setDepth(10);
    const thumbGfx = this.add.graphics().setDepth(11);

    const redraw = () => {
      const on = getState();
      trackGfx.clear();
      trackGfx.fillStyle(on ? 0x00a060 : 0x2a3050, 1);
      trackGfx.fillRoundedRect(toggleX - toggleW / 2, toggleY - toggleH / 2, toggleW, toggleH, toggleH / 2);

      thumbGfx.clear();
      thumbGfx.fillStyle(0xffffff, 1);
      const thumbX = on ? toggleX + toggleW / 2 - toggleH / 2 : toggleX - toggleW / 2 + toggleH / 2;
      thumbGfx.fillCircle(thumbX, toggleY, toggleH / 2 - 2);
    };

    redraw();

    const hitZone = this.add.zone(toggleX - toggleW / 2, toggleY - toggleH / 2, toggleW + 20, toggleH + 16)
      .setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(15);

    hitZone.on("pointerdown", () => {
      const newState = !getState();
      onToggle(newState);
      redraw();
    });
  }

  private showToast(msg: string): void {
    const toast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 130, msg, {
      fontSize: "13px", fontFamily: "'Nunito', Arial, sans-serif",
      color: "#ffffff", backgroundColor: "rgba(0,0,0,0.7)",
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    this.tweens.add({
      targets: toast, alpha: 1, duration: 200,
      onComplete: () => {
        this.tweens.add({ targets: toast, alpha: 0, delay: 1800, duration: 400,
          onComplete: () => toast.destroy(),
        });
      },
    });
  }
}
