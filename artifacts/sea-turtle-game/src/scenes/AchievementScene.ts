/*
 * AchievementScene — lists all achievements with progress bars and completion badges.
 * Supports pointer-drag scrolling so all 10 achievements are reachable on any canvas size.
 */

import Phaser from "phaser";
import { SCENE, GAME_WIDTH, GAME_HEIGHT } from "../game/GameConfig";
import { emitSceneChange } from "../game/EventBus";
import { ACHIEVEMENTS, achievementManager } from "../progression/AchievementManager";
import { soundManager } from "../audio/SoundManager";

// ── Layout constants ─────────────────────────────────────────────────────────
const HEADER_H   = 108;  // space taken by title + summary
const FOOTER_H   = 68;   // space taken by back button
const MASK_TOP   = HEADER_H;
const MASK_H     = GAME_HEIGHT - HEADER_H - FOOTER_H;
const ROW_H      = 70;
const ROW_GAP    = 8;
const ROW_SPAN   = ROW_H + ROW_GAP;
const ROW_W      = 400;
const LIST_PAD_TOP  = 6;
const LIST_PAD_BOT  = 6;

export class AchievementScene extends Phaser.Scene {
  private fromScene: string = SCENE.MAIN_MENU;

  constructor() { super(SCENE.ACHIEVEMENT); }

  init(data: { from?: string }): void {
    this.fromScene = data?.from ?? SCENE.MAIN_MENU;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    // ── Background ────────────────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x010c1a, 0x010c1a, 0x021828, 0x021828, 1, 1, 1, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add.text(cx, 52, "ACHIEVEMENTS", {
      fontSize: "26px", fontFamily: "Arial Black, sans-serif",
      color: "#ffd84a", stroke: "#3a1800", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10);

    // ── Progress summary ──────────────────────────────────────────────────────
    const total = ACHIEVEMENTS.length;
    const done  = ACHIEVEMENTS.filter(a => achievementManager.isCompleted(a.id)).length;
    this.add.text(cx, 86, `${done} / ${total} completed`, {
      fontSize: "13px", fontFamily: "Arial, sans-serif",
      color: "rgba(200,220,255,0.6)",
    }).setOrigin(0.5).setDepth(10);

    // ── Scrollable list ───────────────────────────────────────────────────────
    const rowX      = cx - ROW_W / 2;
    const contentH  = ACHIEVEMENTS.length * ROW_SPAN + LIST_PAD_TOP + LIST_PAD_BOT;
    const maxScroll = Math.max(0, contentH - MASK_H); // how far we can scroll down

    // Container holds all rows; shifting its .y scrolls the list
    const listContainer = this.add.container(0, LIST_PAD_TOP).setDepth(5);

    ACHIEVEMENTS.forEach((ach, i) => {
      const y = i * ROW_SPAN;
      const isComplete = achievementManager.isCompleted(ach.id);
      const fraction   = achievementManager.getProgressFraction(ach);

      // Row background (Graphics added directly to container)
      const rowBg = this.add.graphics();
      rowBg.fillStyle(isComplete ? 0x0a2818 : 0x080c18, 0.9);
      rowBg.fillRoundedRect(rowX, y, ROW_W, ROW_H, 10);
      rowBg.lineStyle(1, isComplete ? 0x00a050 : 0x162030, 0.8);
      rowBg.strokeRoundedRect(rowX, y, ROW_W, ROW_H, 10);
      listContainer.add(rowBg);

      // Icon
      const iconTxt = this.add.text(rowX + 28, y + ROW_H / 2, ach.icon, {
        fontSize: "24px",
      }).setOrigin(0.5);
      listContainer.add(iconTxt);

      // Name
      const nameTxt = this.add.text(rowX + 56, y + 16, ach.name, {
        fontSize: "13px", fontFamily: "Arial Black, sans-serif",
        color: isComplete ? "#80ffcc" : "#a0c0e0",
      }).setOrigin(0, 0.5);
      listContainer.add(nameTxt);

      // Description
      const descTxt = this.add.text(rowX + 56, y + 32, ach.description, {
        fontSize: "10px", fontFamily: "Arial, sans-serif",
        color: "rgba(140,170,210,0.6)",
      }).setOrigin(0, 0.5);
      listContainer.add(descTxt);

      // Progress bar background
      const barX = rowX + 56;
      const barY = y + 47;
      const barW = ROW_W - 80;
      const barH = 6;

      const barBg = this.add.graphics();
      barBg.fillStyle(0x102030, 1);
      barBg.fillRoundedRect(barX, barY, barW, barH, 3);
      listContainer.add(barBg);

      // Progress bar fill (animated)
      const fillW = Math.max(4, fraction * barW);
      const barFill = this.add.graphics();
      barFill.fillStyle(isComplete ? 0x00e080 : 0x2060a0, 1);
      barFill.fillRoundedRect(barX, barY, fillW, barH, 3);
      listContainer.add(barFill);

      // Completion badge / percentage
      if (isComplete) {
        const check = this.add.text(rowX + ROW_W - 14, y + ROW_H / 2, "✓", {
          fontSize: "18px", fontFamily: "Arial, sans-serif",
          color: "#00e080",
        }).setOrigin(1, 0.5);
        listContainer.add(check);
      } else {
        const pct = Math.round(fraction * 100);
        const pctTxt = this.add.text(rowX + ROW_W - 14, y + ROW_H / 2, `${pct}%`, {
          fontSize: "10px", fontFamily: "Arial, sans-serif",
          color: "rgba(100,140,180,0.6)",
        }).setOrigin(1, 0.5);
        listContainer.add(pctTxt);
      }

      // Animate bar fill
      if (fraction > 0) {
        barFill.scaleX = 0;
        this.tweens.add({
          targets: barFill,
          scaleX: 1,
          duration: 500,
          delay: i * 60,
          ease: "Power2",
          onUpdate: () => {
            barFill.clear();
            const w2 = Math.max(4, fraction * barW * barFill.scaleX);
            barFill.fillStyle(isComplete ? 0x00e080 : 0x2060a0, 1);
            barFill.fillRoundedRect(barX, barY, w2, barH, 3);
          },
        });
      }
    });

    // Position the container so list starts at MASK_TOP
    listContainer.y = MASK_TOP + LIST_PAD_TOP;

    // ── Clip mask ─────────────────────────────────────────────────────────────
    const maskGfx = this.make.graphics({ x: 0, y: 0 });
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(0, MASK_TOP, GAME_WIDTH, MASK_H);
    listContainer.setMask(maskGfx.createGeometryMask());

    // ── Scroll indicator (thin right rail) ────────────────────────────────────
    const showScrollbar = maxScroll > 0;
    const railX  = GAME_WIDTH - 6;
    const railY  = MASK_TOP + 4;
    const railH  = MASK_H - 8;

    const scrollbarGfx = showScrollbar ? this.add.graphics().setDepth(20) : null;
    const thumbH = showScrollbar
      ? Math.max(30, railH * (MASK_H / contentH))
      : 0;

    const drawScrollbar = (scrollY: number) => {
      if (!scrollbarGfx) return;
      const thumbFrac = maxScroll > 0 ? (-scrollY) / maxScroll : 0;
      const thumbY = railY + thumbFrac * (railH - thumbH);

      scrollbarGfx.clear();
      scrollbarGfx.fillStyle(0x1a3050, 0.6);
      scrollbarGfx.fillRoundedRect(railX - 3, railY, 6, railH, 3);
      scrollbarGfx.fillStyle(0x4090c0, 0.7);
      scrollbarGfx.fillRoundedRect(railX - 3, thumbY, 6, thumbH, 3);
    };

    if (showScrollbar) drawScrollbar(0);

    // ── Pointer-drag scrolling ────────────────────────────────────────────────
    let scrollY   = 0;
    let dragging  = false;
    let lastPtrY  = 0;
    let velocity  = 0;   // px/frame — for momentum
    let prevY     = 0;

    const clamp = (v: number) => Phaser.Math.Clamp(v, -maxScroll, 0);

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      dragging = true;
      lastPtrY = p.y;
      prevY    = p.y;
      velocity = 0;
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!dragging) return;
      const dy = p.y - lastPtrY;
      velocity = p.y - prevY;
      prevY    = lastPtrY;
      lastPtrY = p.y;

      scrollY = clamp(scrollY + dy);
      listContainer.y = MASK_TOP + LIST_PAD_TOP + scrollY;
      drawScrollbar(scrollY);
    });

    this.input.on("pointerup", () => {
      dragging = false;
    });

    // Momentum on pointer up
    const onUpdate = () => {
      if (dragging || Math.abs(velocity) < 0.5) return;
      velocity *= 0.88;
      scrollY = clamp(scrollY + velocity);
      listContainer.y = MASK_TOP + LIST_PAD_TOP + scrollY;
      drawScrollbar(scrollY);
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);

    // Clean up all input and update listeners on scene shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
      this.input.off("pointerdown");
      this.input.off("pointermove");
      this.input.off("pointerup");
    });

    // ── Scroll hint (only when content overflows) ─────────────────────────────
    if (showScrollbar) {
      const hint = this.add.text(cx, MASK_TOP + MASK_H - 18, "▼  scroll for more", {
        fontSize: "10px", fontFamily: "Arial, sans-serif",
        color: "rgba(100,160,210,0.5)",
      }).setOrigin(0.5).setDepth(20);

      this.tweens.add({
        targets: hint, alpha: 0,
        delay: 2500, duration: 600,
        onComplete: () => hint.destroy(),
      });
    }

    // ── Back button (fixed, outside container) ────────────────────────────────
    const backBtn = this.add.text(cx, GAME_HEIGHT - 42, "◄  BACK", {
      fontSize: "16px", fontFamily: "Arial, sans-serif",
      color: "#c0d8ff", backgroundColor: "#102840",
      padding: { x: 20, y: 11 }, stroke: "#061428", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });

    backBtn.on("pointerdown", () => {
      soundManager.playTap();
      this.cameras.main.fade(200, 0, 0, 0, false, (_: unknown, p: number) => {
        if (p >= 1) this.scene.start(this.fromScene);
      });
    });
    backBtn.on("pointerover", () => backBtn.setStyle({ color: "#80c8ff" }));
    backBtn.on("pointerout",  () => backBtn.setStyle({ color: "#c0d8ff" }));

    emitSceneChange({ scene: "Achievement" });
  }
}
